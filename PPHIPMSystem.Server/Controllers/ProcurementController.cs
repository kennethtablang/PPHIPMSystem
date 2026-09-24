using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models.Enums;

namespace PPHIPMSystem.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProcurementController : ControllerBase
{
    private readonly IProcurementService _procurement;
    private readonly IRequestAttachmentService _attachments;

    public ProcurementController(IProcurementService procurement, IRequestAttachmentService attachments)
    {
        _procurement = procurement;
        _attachments = attachments;
    }

    // Department heads and shared department PCs only ever see and act on
    // their own department's requests.
    private bool IsDepartmentScoped => User.IsInRole("DepartmentHead") || User.IsInRole("DepartmentStaff");
    private bool IsAdmin => User.IsInRole("SuperAdmin") || User.IsInRole("HospitalAdministrator");
    private bool IsProcurement => User.IsInRole("ProcurementStaff");
    private int? OwnDepartmentId => int.TryParse(User.FindFirstValue("departmentId"), out var d) ? d : null;

    // Which department a new request is filed under: department accounts are
    // pinned to their own; administrators (and Procurement, for replenishment
    // PRs) pick one on the form, falling back to their own department.
    private int? ResolveRequestDepartment(int? requested, bool replenishment)
    {
        var mayChoose = IsAdmin || (replenishment && IsProcurement);
        if (mayChoose && requested.HasValue) return requested;
        return OwnDepartmentId;
    }

    // Who may edit / submit / cancel a request. A replenishment Purchase
    // Request belongs to Procurement (and administrators); a department
    // request to its own department (and administrators) — Procurement no
    // longer handles department requests at all.
    private bool CanManage(ProcurementRequestDto request)
    {
        if (IsAdmin) return true;
        if (request.Type == RequestType.Replenishment) return IsProcurement;
        return IsDepartmentScoped && request.DepartmentId == OwnDepartmentId;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? departmentId, [FromQuery] string? type)
    {
        RequestType? requestType = Enum.TryParse<RequestType>(type, ignoreCase: true, out var t) ? t : null;
        if (IsDepartmentScoped)
        {
            if (OwnDepartmentId is not { } userDeptId) return Forbid();
            departmentId = userDeptId;
            // Wards see their own supply requests, not the storeroom's PRs.
            requestType = RequestType.DepartmentSupply;
        }
        return Ok(await _procurement.GetAllAsync(status, departmentId, requestType));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _procurement.GetByIdAsync(id);
        if (result is null) return NotFound();

        if (IsDepartmentScoped &&
            (result.DepartmentId != OwnDepartmentId || result.Type != RequestType.DepartmentSupply))
            return Forbid();

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff,ProcurementStaff")]
    public async Task<IActionResult> Create([FromBody] CreateProcurementRequestDto dto)
    {
        // Procurement files replenishment PRs only; departments file supply
        // requests only; administrators can do either.
        if (dto.IsReplenishment && !(IsAdmin || IsProcurement))
            return BadRequest(new { message = "Only Procurement or an administrator can raise a replenishment Purchase Request." });
        if (!dto.IsReplenishment && IsProcurement && !IsAdmin)
            return BadRequest(new { message = "Procurement raises replenishment Purchase Requests; department supply requests come from the departments." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (ResolveRequestDepartment(dto.DepartmentId, dto.IsReplenishment) is not { } deptId)
            return BadRequest(new { message = "Choose the requesting department." });
        // A shared department PC is logged in as the ward, not a person.
        if (User.IsInRole("DepartmentStaff") && string.IsNullOrWhiteSpace(dto.RequestedByName))
            return BadRequest(new { message = "Enter the name of the person making the request." });

        try
        {
            var result = await _procurement.CreateAsync(dto, userId, deptId);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Edit quantities / add or remove lines while nobody has approved it yet.
    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff,ProcurementStaff")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProcurementRequestDto dto)
    {
        var existing = await _procurement.GetByIdAsync(id);
        if (existing is null) return NotFound();
        if (!CanManage(existing)) return Forbid();
        if (User.IsInRole("DepartmentStaff") && string.IsNullOrWhiteSpace(dto.RequestedByName))
            return BadRequest(new { message = "Enter the name of the person making the request." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        // Department accounts can't move a request to another department.
        var mayMove = IsAdmin || (existing.Type == RequestType.Replenishment && IsProcurement);
        var deptId = mayMove ? dto.DepartmentId ?? existing.DepartmentId : existing.DepartmentId;
        try
        {
            var result = await _procurement.UpdateAsync(id, dto, userId, deptId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/cancel")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff,ProcurementStaff")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelProcurementRequestDto? dto)
    {
        var existing = await _procurement.GetByIdAsync(id);
        if (existing is null) return NotFound();
        if (!CanManage(existing)) return Forbid();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.CancelAsync(id, dto?.Reason, userId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/submit")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff,ProcurementStaff")]
    public async Task<IActionResult> Submit(int id)
    {
        var existing = await _procurement.GetByIdAsync(id);
        if (existing is null) return NotFound();
        if (!CanManage(existing)) return Forbid();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.SubmitAsync(id, userId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveProcurementDto dto)
    {
        var approverId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.ProcessApprovalAsync(id, dto, approverId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Retry the automatic release of a fully approved request once the
    // missing stock has been received.
    [HttpPatch("{id}/release")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> Release(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.ReleaseAsync(id, userId);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Items that pending department requests compete for, with the stock
    // actually free to hand out and a proportional fair-share suggestion.
    [HttpGet("allocation")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> GetAllocation()
        => Ok(await _procurement.GetAllocationOverviewAsync());

    [HttpPut("allocation")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
    public async Task<IActionResult> SaveAllocation([FromBody] SaveAllocationsDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            await _procurement.SaveAllocationsAsync(dto, userId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/purchase-order")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff")]
    public async Task<IActionResult> GeneratePO(int id, [FromBody] GeneratePurchaseOrderDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _procurement.GeneratePurchaseOrderAsync(id, dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ── Attachments (quotes, canvass sheets, supporting documents) ──────────

    // Department heads may only touch their own department's requests, mirroring
    // the GetAll scoping; every other role sees the full procurement pipeline.
    private async Task<bool> CanAccessRequestAsync(int requestId)
    {
        if (!IsDepartmentScoped) return true;
        var deptClaim = User.FindFirstValue("departmentId");
        return int.TryParse(deptClaim, out var deptId)
            && await _attachments.RequestBelongsToDepartmentAsync(requestId, deptId);
    }

    [HttpGet("{id}/attachments")]
    public async Task<IActionResult> GetAttachments(int id)
    {
        if (!await CanAccessRequestAsync(id)) return Forbid();
        return Ok(await _attachments.GetForRequestAsync(id));
    }

    [HttpPost("{id}/attachments")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> UploadAttachment(int id, IFormFile file)
    {
        if (!await CanAccessRequestAsync(id)) return Forbid();
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var result = await _attachments.UploadAsync(id, file, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("attachments/{attachmentId}/download")]
    public async Task<IActionResult> DownloadAttachment(int attachmentId)
    {
        var requestId = await _attachments.GetRequestIdForAttachmentAsync(attachmentId);
        if (requestId is null) return NotFound(new { message = "Attachment not found." });
        if (!await CanAccessRequestAsync(requestId.Value)) return Forbid();

        var file = await _attachments.DownloadAsync(attachmentId);
        if (file is null) return NotFound(new { message = "Attachment not found." });

        Response.Headers.XContentTypeOptions = "nosniff";
        return File(file.Value.Content, file.Value.ContentType, file.Value.FileName);
    }

    [HttpDelete("attachments/{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int attachmentId)
    {
        var requestId = await _attachments.GetRequestIdForAttachmentAsync(attachmentId);
        if (requestId is null) return NotFound();
        if (!await CanAccessRequestAsync(requestId.Value)) return Forbid();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isAdmin = User.IsInRole("SuperAdmin") || User.IsInRole("HospitalAdministrator");
        try
        {
            var ok = await _attachments.DeleteAsync(attachmentId, userId, isAdmin);
            return ok ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("purchase-orders")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> GetAllPOs()
        => Ok(await _procurement.GetAllPurchaseOrdersAsync());

    [HttpGet("purchase-orders/{id}")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
    public async Task<IActionResult> GetPO(int id)
    {
        var result = await _procurement.GetPurchaseOrderAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    // Receiving is Procurement's job: they count what actually arrived and
    // record its lot/batch number and expiry against the PO.
    [HttpPatch("purchase-orders/{id}/confirm-delivery")]
    [Authorize(Roles = "SuperAdmin,ProcurementStaff")]
    public async Task<IActionResult> ConfirmDelivery(int id, [FromBody] ConfirmDeliveryDto? dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        try
        {
            var ok = await _procurement.ConfirmDeliveryAsync(id, dto, userId);
            return ok ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
