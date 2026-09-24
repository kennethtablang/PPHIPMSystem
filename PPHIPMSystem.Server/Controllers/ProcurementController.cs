using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.Interfaces;

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

    // Which department a new request is filed under: department accounts are
    // pinned to their own; administrators pick one on the form (falling back
    // to their own department when they have one).
    private int? ResolveRequestDepartment(int? requested)
    {
        int? own = int.TryParse(User.FindFirstValue("departmentId"), out var d) ? d : null;
        if (IsAdmin && requested.HasValue) return requested;
        return own;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? departmentId)
    {
        if (IsDepartmentScoped)
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (int.TryParse(deptClaim, out var userDeptId))
                departmentId = userDeptId;
            else
                return Forbid();
        }
        return Ok(await _procurement.GetAllAsync(status, departmentId));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _procurement.GetByIdAsync(id);
        if (result is null) return NotFound();
        
        if (IsDepartmentScoped)
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var userDeptId) || result.DepartmentId != userDeptId)
                return Forbid();
        }
        
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff")]
    public async Task<IActionResult> Create([FromBody] CreateProcurementRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (ResolveRequestDepartment(dto.DepartmentId) is not { } deptId)
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
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProcurementRequestDto dto)
    {
        if (!await CanAccessRequestAsync(id)) return Forbid();
        var existing = await _procurement.GetByIdAsync(id);
        if (existing is null) return NotFound();
        if (User.IsInRole("DepartmentStaff") && string.IsNullOrWhiteSpace(dto.RequestedByName))
            return BadRequest(new { message = "Enter the name of the person making the request." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        // Department accounts can't move a request to another department.
        var deptId = IsAdmin ? dto.DepartmentId ?? existing.DepartmentId : existing.DepartmentId;
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
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelProcurementRequestDto? dto)
    {
        if (!await CanAccessRequestAsync(id)) return Forbid();
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
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead,DepartmentStaff")]
    public async Task<IActionResult> Submit(int id)
    {
        // Department heads may only push their own department's requests forward.
        if (!await CanAccessRequestAsync(id)) return Forbid();

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
