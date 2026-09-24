using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReplenishmentPurchaseRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "ProcurementRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "ProcurementRequests");
        }
    }
}
