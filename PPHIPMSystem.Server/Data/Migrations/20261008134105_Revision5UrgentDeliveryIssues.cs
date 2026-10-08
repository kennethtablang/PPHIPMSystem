using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class Revision5UrgentDeliveryIssues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IssueRemarks",
                table: "PurchaseOrderDeliveries",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Issues",
                table: "PurchaseOrderDeliveries",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityRejected",
                table: "PurchaseOrderDeliveries",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsUrgent",
                table: "ProcurementRequests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "ProcurementRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UrgentReason",
                table: "ProcurementRequests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            // NotificationType 11 was BudgetAlert and is now DeliveryProblem;
            // drop the old budget notifications so none are misread.
            migrationBuilder.Sql("DELETE FROM Notifications WHERE [Type] = 11;");

            // Requests already past draft: the best known submission time is
            // when they were filed.
            migrationBuilder.Sql(
                "UPDATE ProcurementRequests SET SubmittedAt = RequestedAt WHERE Status NOT IN (0, 8, 9);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IssueRemarks",
                table: "PurchaseOrderDeliveries");

            migrationBuilder.DropColumn(
                name: "Issues",
                table: "PurchaseOrderDeliveries");

            migrationBuilder.DropColumn(
                name: "QuantityRejected",
                table: "PurchaseOrderDeliveries");

            migrationBuilder.DropColumn(
                name: "IsUrgent",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "UrgentReason",
                table: "ProcurementRequests");
        }
    }
}
