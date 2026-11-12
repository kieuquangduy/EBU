using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductRfqFieldsAndShopContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvailableMaterials",
                table: "Products",
                type: "json",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AvailablePrintTechniques",
                table: "Products",
                type: "json",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "BasePrice",
                table: "Products",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "DiscountPercent",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinOrderQuantity",
                table: "Products",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalPrice",
                table: "Products",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PriceNote",
                table: "Products",
                type: "varchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "Giá sản phẩm có thể thay đổi theo chất liệu, số lượng và kỹ thuật in.")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ShopContacts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ZaloPhone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ZaloOAId = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Hotline = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MessengerLink = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    WorkingHours = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopContacts", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_BasePrice",
                table: "Products",
                sql: "`BasePrice` >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_MinOrderQuantity",
                table: "Products",
                sql: "`MinOrderQuantity` >= 1");

            migrationBuilder.Sql("""
                UPDATE `Products`
                SET `BasePrice` = `Price`
                WHERE `BasePrice` = 0;

                INSERT IGNORE INTO `ShopContacts` (`Id`, `ZaloPhone`, `Hotline`, `Email`, `WorkingHours`, `CreatedAt`)
                SELECT
                    'default',
                    COALESCE(NULLIF(LEFT(REPLACE(REPLACE(REPLACE(`SupportPhone`, ' ', ''), '.', ''), '-', ''), 20), ''), '0900000000'),
                    COALESCE(NULLIF(LEFT(`SupportPhone`, 30), ''), '0900 000 000'),
                    COALESCE(NULLIF(LEFT(`SupportEmail`, 200), ''), 'contact@haushop.vn'),
                    '08:00 - 21:00 (Thứ 2 - Chủ nhật)',
                    UTC_TIMESTAMP()
                FROM `AdminSettings`
                WHERE `Id` = 'default'
                LIMIT 1;

                INSERT IGNORE INTO `ShopContacts` (`Id`, `ZaloPhone`, `Hotline`, `Email`, `WorkingHours`, `CreatedAt`)
                VALUES ('default', '0900000000', '0900 000 000', 'contact@haushop.vn', '08:00 - 21:00 (Thứ 2 - Chủ nhật)', UTC_TIMESTAMP());
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShopContacts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_BasePrice",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_MinOrderQuantity",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "AvailableMaterials",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "AvailablePrintTechniques",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "BasePrice",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "DiscountPercent",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "MinOrderQuantity",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "OriginalPrice",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "PriceNote",
                table: "Products");
        }
    }
}
