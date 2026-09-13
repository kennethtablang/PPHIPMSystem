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

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? departmentId)
    {
        if (User.IsInRole("DepartmentHead"))
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
        
        if (User.IsInRole("DepartmentHead"))
        {
            var deptClaim = User.FindFirstValue("departmentId");
            if (!int.TryParse(deptClaim, out var userDeptId) || result.DepartmentId != userDeptId)
                return Forbid();
        }
        
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead")]
    public async Task<IActionResult> Create([FromBody] CreateProcurementRequestDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var deptClaim = User.FindFirstValue("departmentId");
        if (!int.TryParse(deptClaim, out var deptId))
            return BadRequest(new { message = "User has no department assigned." });

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

    [HttpPatch("{id}/submit")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,DepartmentHead")]
    public async Task<IActionResult> Submit(int id)
    {
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
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,ProcurementStaff,InventoryOfficer")]
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
        if (!User.IsInRole("DepartmentHead")) return true;
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

    [HttpPatch("purchase-orders/{id}/confirm-delivery")]
    [Authorize(Roles = "SuperAdmin,HospitalAdministrator,InventoryOfficer")]
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
