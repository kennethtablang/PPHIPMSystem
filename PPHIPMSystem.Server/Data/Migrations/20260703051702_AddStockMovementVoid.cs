using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPHIPMSystem.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStockMovementVoid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVoided",
                table: "StockMovements",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ReversalOfMovementId",
                table: "StockMovements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoidReason",
                table: "StockMovements",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VoidedAt",
                table: "StockMovements",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VoidedByUserId",
                table: "StockMovements",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_ReversalOfMovementId",
                table: "StockMovements",
                column: "ReversalOfMovementId");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_VoidedByUserId",
                table: "StockMovements",
                column: "VoidedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_AspNetUsers_VoidedByUserId",
                table: "StockMovements",
                column: "VoidedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_StockMovements_StockMovements_ReversalOfMovementId",
                table: "StockMovements",
                column: "ReversalOfMovementId",
                principalTable: "StockMovements",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_AspNetUsers_VoidedByUserId",
                table: "StockMovements");

            migrationBuilder.DropForeignKey(
                name: "FK_StockMovements_StockMovements_ReversalOfMovementId",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_ReversalOfMovementId",
                table: "StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_StockMovements_VoidedByUserId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "IsVoided",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "ReversalOfMovementId",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "VoidReason",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "VoidedAt",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "VoidedByUserId",
                table: "StockMovements");
        }
    }
}
