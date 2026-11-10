using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class FinalsRevision1ReceiptAndIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications");

            migrationBuilder.AddColumn<string>(
                name: "ReceiptRemarks",
                table: "ProcurementRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedAt",
                table: "ProcurementRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceivedByUserId",
                table: "ProcurementRequests",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "ProcurementRequests",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_MovementDate",
                table: "StockMovements",
                column: "MovementDate");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_RequestedAt",
                table: "StockAdjustments",
                column: "RequestedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementRequests_ReceivedByUserId",
                table: "ProcurementRequests",
                column: "ReceivedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProcurementRequests_Type_Status",
                table: "ProcurementRequests",
                columns: new[] { "Type", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_ProcurementRequests_AspNetUsers_ReceivedByUserId",
                table: "ProcurementRequests",
                column: "ReceivedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProcurementRequests_AspNetUsers_ReceivedByUserId",
                table: "ProcurementRequests");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_MovementDate",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockAdjustments_RequestedAt",
                table: "StockAdjustments");

            migrationBuilder.DropIndex(
                name: "IX_ProcurementRequests_ReceivedByUserId",
                table: "ProcurementRequests");

            migrationBuilder.DropIndex(
                name: "IX_ProcurementRequests_Type_Status",
                table: "ProcurementRequests");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_IsRead_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "ReceiptRemarks",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "ReceivedAt",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "ReceivedByUserId",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "ProcurementRequests");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");
        }
    }
}
