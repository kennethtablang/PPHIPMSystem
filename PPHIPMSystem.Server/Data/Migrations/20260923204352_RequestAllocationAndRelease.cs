using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class RequestAllocationAndRelease : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReleasedAt",
                table: "ProcurementRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestedByName",
                table: "ProcurementRequests",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityApproved",
                table: "ProcurementRequestItems",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityReleased",
                table: "ProcurementRequestItems",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReleasedAt",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "RequestedByName",
                table: "ProcurementRequests");

            migrationBuilder.DropColumn(
                name: "QuantityApproved",
                table: "ProcurementRequestItems");

            migrationBuilder.DropColumn(
                name: "QuantityReleased",
                table: "ProcurementRequestItems");
        }
    }
}
