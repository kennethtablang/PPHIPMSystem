using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "StockMovements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DepartmentStocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    InventoryItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentStocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentStocks_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DepartmentStocks_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "InventoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_DepartmentId",
                table: "StockMovements",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentStocks_DepartmentId_InventoryItemId",
                table: "DepartmentStocks",
                columns: new[] { "DepartmentId", "InventoryItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentStocks_InventoryItemId",
                table: "DepartmentStocks",
                column: "InventoryItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_Departments_DepartmentId",
                table: "StockMovements",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Departments_DepartmentId",
                table: "StockMovements");

            migrationBuilder.DropTable(
                name: "DepartmentStocks");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_DepartmentId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "StockMovements");
        }
    }
}
