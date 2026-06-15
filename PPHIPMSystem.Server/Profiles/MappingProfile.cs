using AutoMapper;
using PPHIPMSystem.Server.DTOs.AuditLog;
using PPHIPMSystem.Server.DTOs.Batch;
using PPHIPMSystem.Server.DTOs.Category;
using PPHIPMSystem.Server.DTOs.Department;
using PPHIPMSystem.Server.DTOs.Forecast;
using PPHIPMSystem.Server.DTOs.Inventory;
using PPHIPMSystem.Server.DTOs.Notification;
using PPHIPMSystem.Server.DTOs.Procurement;
using PPHIPMSystem.Server.DTOs.StockAdjustment;
using PPHIPMSystem.Server.DTOs.StockMovement;
using PPHIPMSystem.Server.DTOs.Supplier;
using PPHIPMSystem.Server.DTOs.User;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Profiles;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Department
        CreateMap<Department, DepartmentDto>()
            .ForMember(d => d.UserCount, o => o.MapFrom(s => s.Users.Count));
        CreateMap<CreateDepartmentDto, Department>();

        // Category
        CreateMap<Category, CategoryDto>()
            .ForMember(d => d.ItemCount, o => o.MapFrom(s => s.InventoryItems.Count));
        CreateMap<CreateCategoryDto, Category>();

        // ApplicationUser
        CreateMap<ApplicationUser, UserDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department != null ? s.Department.Name : null));
        CreateMap<CreateUserDto, ApplicationUser>()
            .ForMember(d => d.PasswordHash, o => o.Ignore());

        // InventoryItem
        CreateMap<InventoryItem, InventoryItemDto>()
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category.Name))
            .ForMember(d => d.ExpiringBatchCount, o => o.MapFrom(s =>
                s.Batches.Count(b => b.ExpirationDate.HasValue &&
                                     b.ExpirationDate.Value > DateTime.UtcNow &&
                                     (b.ExpirationDate.Value - DateTime.UtcNow).TotalDays <= s.ExpirationWarningDays)));
        CreateMap<CreateInventoryItemDto, InventoryItem>();
        CreateMap<UpdateInventoryItemDto, InventoryItem>();

        // ItemBatch
        CreateMap<ItemBatch, ItemBatchDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.IsExpired, o => o.MapFrom(s => s.IsExpired))
            .ForMember(d => d.DaysUntilExpiry, o => o.MapFrom(s =>
                s.ExpirationDate.HasValue
                    ? (int?)(s.ExpirationDate.Value.Date - DateTime.UtcNow.Date).Days
                    : null))
            .ForMember(d => d.PONumber, o => o.MapFrom(s => s.PurchaseOrder != null ? s.PurchaseOrder.PONumber : null));
        CreateMap<CreateItemBatchDto, ItemBatch>()
            .ForMember(d => d.RemainingQuantity, o => o.MapFrom(s => s.Quantity));

        // StockMovement
        CreateMap<StockMovement, StockMovementDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.ItemCode, o => o.MapFrom(s => s.InventoryItem.ItemCode))
            .ForMember(d => d.PerformedByFullName, o => o.MapFrom(s => $"{s.PerformedByUser.FirstName} {s.PerformedByUser.LastName}"))
            .ForMember(d => d.PONumber, o => o.MapFrom(s => s.PurchaseOrder != null ? s.PurchaseOrder.PONumber : null));
        CreateMap<CreateStockMovementDto, StockMovement>();

        // StockAdjustment
        CreateMap<StockAdjustment, StockAdjustmentDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.ItemCode, o => o.MapFrom(s => s.InventoryItem.ItemCode))
            .ForMember(d => d.Variance, o => o.MapFrom(s => s.PhysicalCount - s.RecordedQuantity))
            .ForMember(d => d.RequestedByFullName, o => o.MapFrom(s => $"{s.RequestedByUser.FirstName} {s.RequestedByUser.LastName}"))
            .ForMember(d => d.ApprovedByFullName, o => o.MapFrom(s =>
                s.ApprovedByUser != null ? $"{s.ApprovedByUser.FirstName} {s.ApprovedByUser.LastName}" : null));

        // Supplier
        CreateMap<Supplier, SupplierDto>()
            .ForMember(d => d.TotalOrders, o => o.MapFrom(s => s.PurchaseOrders.Count));
        CreateMap<CreateSupplierDto, Supplier>();

        // ProcurementRequest
        CreateMap<ProcurementRequest, ProcurementRequestDto>()
            .ForMember(d => d.DepartmentName, o => o.MapFrom(s => s.Department.Name))
            .ForMember(d => d.RequestedByFullName, o => o.MapFrom(s => $"{s.RequestedByUser.FirstName} {s.RequestedByUser.LastName}"))
            .ForMember(d => d.PurchaseOrderId, o => o.MapFrom(s => s.PurchaseOrder != null ? s.PurchaseOrder.Id : (int?)null))
            .ForMember(d => d.PONumber, o => o.MapFrom(s => s.PurchaseOrder != null ? s.PurchaseOrder.PONumber : null));

        CreateMap<ProcurementRequestItem, ProcurementRequestItemDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.Unit, o => o.MapFrom(s => s.InventoryItem.Unit));

        CreateMap<ProcurementApproval, ProcurementApprovalDto>()
            .ForMember(d => d.ApproverFullName, o => o.MapFrom(s => $"{s.ApproverUser.FirstName} {s.ApproverUser.LastName}"))
            .ForMember(d => d.ApproverRole, o => o.MapFrom(s => s.ApproverRole.ToString()))
            .ForMember(d => d.ActionName, o => o.MapFrom(s => s.Action.ToString()));

        // PurchaseOrder
        CreateMap<PurchaseOrder, PurchaseOrderDto>()
            .ForMember(d => d.RequestNumber, o => o.MapFrom(s => s.ProcurementRequest.RequestNumber))
            .ForMember(d => d.SupplierName, o => o.MapFrom(s => s.Supplier.Name))
            .ForMember(d => d.GeneratedByFullName, o => o.MapFrom(s => $"{s.GeneratedByUser.FirstName} {s.GeneratedByUser.LastName}"));

        CreateMap<PurchaseOrderItem, PurchaseOrderItemDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.Unit, o => o.MapFrom(s => s.InventoryItem.Unit))
            .ForMember(d => d.TotalCost, o => o.MapFrom(s => s.QuantityOrdered * s.UnitCost));

        // DemandForecast
        CreateMap<DemandForecast, DemandForecastDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name))
            .ForMember(d => d.Unit, o => o.MapFrom(s => s.InventoryItem.Unit));

        CreateMap<ConsumptionRecord, ConsumptionRecordDto>()
            .ForMember(d => d.ItemName, o => o.MapFrom(s => s.InventoryItem.Name));

        // Notification
        CreateMap<Notification, NotificationDto>();

        // AuditLog
        CreateMap<AuditLog, AuditLogDto>()
            .ForMember(d => d.UserFullName, o => o.MapFrom(s =>
                s.User != null ? $"{s.User.FirstName} {s.User.LastName}" : null));
    }
}
