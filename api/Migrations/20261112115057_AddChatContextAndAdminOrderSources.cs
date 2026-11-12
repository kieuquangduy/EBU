using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddChatContextAndAdminOrderSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders");

            migrationBuilder.AddColumn<string>(
                name: "ProductId",
                table: "SupportTickets",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "QuoteRequestId",
                table: "SupportTickets",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Orders",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Orders",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "OrderCode",
                table: "Orders",
                type: "varchar(32)",
                maxLength: 32,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "QuoteRequestId",
                table: "Orders",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "OrderItems",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ProductId",
                table: "ChatRooms",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "QuoteRequestId",
                table: "ChatRooms",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentsJson",
                table: "ChatMessages",
                type: "json",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MetadataJson",
                table: "ChatMessages",
                type: "json",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_ProductId",
                table: "SupportTickets",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SupportTickets_QuoteRequestId",
                table: "SupportTickets",
                column: "QuoteRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderCode",
                table: "Orders",
                column: "OrderCode");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_QuoteRequestId",
                table: "Orders",
                column: "QuoteRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_Source",
                table: "Orders",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_ChatRooms_ProductId",
                table: "ChatRooms",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatRooms_QuoteRequestId",
                table: "ChatRooms",
                column: "QuoteRequestId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatRooms_Products_ProductId",
                table: "ChatRooms",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ChatRooms_QuoteRequests_QuoteRequestId",
                table: "ChatRooms",
                column: "QuoteRequestId",
                principalTable: "QuoteRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_QuoteRequests_QuoteRequestId",
                table: "Orders",
                column: "QuoteRequestId",
                principalTable: "QuoteRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SupportTickets_Products_ProductId",
                table: "SupportTickets",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SupportTickets_QuoteRequests_QuoteRequestId",
                table: "SupportTickets",
                column: "QuoteRequestId",
                principalTable: "QuoteRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatRooms_Products_ProductId",
                table: "ChatRooms");

            migrationBuilder.DropForeignKey(
                name: "FK_ChatRooms_QuoteRequests_QuoteRequestId",
                table: "ChatRooms");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_QuoteRequests_QuoteRequestId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_SupportTickets_Products_ProductId",
                table: "SupportTickets");

            migrationBuilder.DropForeignKey(
                name: "FK_SupportTickets_QuoteRequests_QuoteRequestId",
                table: "SupportTickets");

            migrationBuilder.DropIndex(
                name: "IX_SupportTickets_ProductId",
                table: "SupportTickets");

            migrationBuilder.DropIndex(
                name: "IX_SupportTickets_QuoteRequestId",
                table: "SupportTickets");

            migrationBuilder.DropIndex(
                name: "IX_Orders_OrderCode",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_QuoteRequestId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_Source",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_ChatRooms_ProductId",
                table: "ChatRooms");

            migrationBuilder.DropIndex(
                name: "IX_ChatRooms_QuoteRequestId",
                table: "ChatRooms");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "QuoteRequestId",
                table: "SupportTickets");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OrderCode",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "QuoteRequestId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "ChatRooms");

            migrationBuilder.DropColumn(
                name: "QuoteRequestId",
                table: "ChatRooms");

            migrationBuilder.DropColumn(
                name: "AttachmentsJson",
                table: "ChatMessages");

            migrationBuilder.DropColumn(
                name: "MetadataJson",
                table: "ChatMessages");

            migrationBuilder.UpdateData(
                table: "Orders",
                keyColumn: "UserId",
                keyValue: null,
                column: "UserId",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Orders",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "OrderItems",
                keyColumn: "ProductId",
                keyValue: null,
                column: "ProductId",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "ProductId",
                table: "OrderItems",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)",
                oldMaxLength: 50,
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users_UserId",
                table: "Orders",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
