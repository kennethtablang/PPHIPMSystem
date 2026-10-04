using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryItemBrand : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Brand",
                table: "InventoryItems",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Brand",
                table: "InventoryItems");
        }
    }
}
