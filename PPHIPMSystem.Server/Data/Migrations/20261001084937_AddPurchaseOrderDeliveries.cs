using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseOrderDeliveries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseOrderItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DeliveredOn = table.Column<DateTime>(type: "date", nullable: false),
                    ReferenceNo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReceivedByUserId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ItemBatchId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDeliveries_AspNetUsers_ReceivedByUserId",
                        column: x => x.ReceivedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDeliveries_ItemBatches_ItemBatchId",
                        column: x => x.ItemBatchId,
                        principalTable: "ItemBatches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PurchaseOrderDeliveries_PurchaseOrderItems_PurchaseOrderItemId",
                        column: x => x.PurchaseOrderItemId,
                        principalTable: "PurchaseOrderItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDeliveries_ItemBatchId",
                table: "PurchaseOrderDeliveries",
                column: "ItemBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDeliveries_PurchaseOrderItemId",
                table: "PurchaseOrderDeliveries",
                column: "PurchaseOrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderDeliveries_ReceivedByUserId",
                table: "PurchaseOrderDeliveries",
                column: "ReceivedByUserId");

            // Backfill history for deliveries recorded before this table
            // existed. Every PO receipt already created a batch tagged with the
            // PO, so each batch becomes one delivery on the matching line.
            // ReceivedDate is UTC; +8h gives the Philippine calendar date (no DST).
            migrationBuilder.Sql(@"
INSERT INTO PurchaseOrderDeliveries (PurchaseOrderItemId, Quantity, DeliveredOn, ReferenceNo, ReceivedByUserId, RecordedAt, ItemBatchId)
SELECT line.Id, b.Quantity, CAST(DATEADD(HOUR, 8, b.ReceivedDate) AS date), NULL,
       (SELECT TOP 1 sm.PerformedByUserId FROM StockMovements sm WHERE sm.ItemBatchId = b.Id),
       b.ReceivedDate, b.Id
FROM ItemBatches b
CROSS APPLY (SELECT TOP 1 poi.Id FROM PurchaseOrderItems poi
             WHERE poi.PurchaseOrderId = b.PurchaseOrderId AND poi.InventoryItemId = b.InventoryItemId
             ORDER BY poi.Id) line
WHERE b.PurchaseOrderId IS NOT NULL;");

            // Deliveries older than PO batches left no batch behind: record the
            // unexplained remainder as one catch-up entry so each line's history
            // still adds up to its QuantityDelivered.
            migrationBuilder.Sql(@"
INSERT INTO PurchaseOrderDeliveries (PurchaseOrderItemId, Quantity, DeliveredOn, ReferenceNo, ReceivedByUserId, RecordedAt, ItemBatchId)
SELECT poi.Id, poi.QuantityDelivered - ISNULL(logged.Total, 0),
       CAST(DATEADD(HOUR, 8, ISNULL(po.DeliveredAt, po.GeneratedAt)) AS date),
       '(recorded before delivery log)', NULL, ISNULL(po.DeliveredAt, po.GeneratedAt), NULL
FROM PurchaseOrderItems poi
JOIN PurchaseOrders po ON po.Id = poi.PurchaseOrderId
OUTER APPLY (SELECT SUM(d.Quantity) AS Total FROM PurchaseOrderDeliveries d WHERE d.PurchaseOrderItemId = poi.Id) logged
WHERE poi.QuantityDelivered > ISNULL(logged.Total, 0);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseOrderDeliveries");
        }
    }
}
