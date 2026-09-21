using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddItemBatchToStockMovement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ItemBatchId",
                table: "StockMovements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_ItemBatchId",
                table: "StockMovements",
                column: "ItemBatchId");

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_ItemBatches_ItemBatchId",
                table: "StockMovements",
                column: "ItemBatchId",
                principalTable: "ItemBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_ItemBatches_ItemBatchId",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_ItemBatchId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "ItemBatchId",
                table: "StockMovements");
        }
    }
}
