using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentTransfersAndBudgets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ToDepartmentId",
                table: "StockMovements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DepartmentBudgets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DepartmentId = table.Column<int>(type: "int", nullable: false),
                    FiscalYear = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepartmentBudgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepartmentBudgets_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_ToDepartmentId",
                table: "StockMovements",
                column: "ToDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_DepartmentBudgets_DepartmentId_FiscalYear",
                table: "DepartmentBudgets",
                columns: new[] { "DepartmentId", "FiscalYear" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_Departments_ToDepartmentId",
                table: "StockMovements",
                column: "ToDepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_Departments_ToDepartmentId",
                table: "StockMovements");

            migrationBuilder.DropTable(
                name: "DepartmentBudgets");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_ToDepartmentId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "ToDepartmentId",
                table: "StockMovements");
        }
    }
}
