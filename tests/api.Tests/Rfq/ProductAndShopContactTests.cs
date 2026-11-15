using api.controllers;
using api.DTOs.product;
using api.DTOs.shop;
using api.mappings;
using api.models.entities;
using api.services.implementations.shop;
using api.validators.product;
using api.validators.shop;
using Microsoft.AspNetCore.Authorization;

namespace api.Tests.Rfq
{
    public class ProductAndShopContactTests
    {
        [Fact]
        public void ApplyCreateFields_BackfillsBasePrice_AndComputesDiscount()
        {
            var product = new Product { Id = "p1", Sku = "AO-01", Name = "Áo khoác CLB", Price = 289_000m };
            var dto = new CreateProductDto
            {
                Sku = "AO-01",
                Name = "Áo khoác CLB",
                Description = "Áo khoác gió",
                Price = 289_000m,
                OriginalPrice = 340_000m
            };

            ProductRfqMetadataHelper.ApplyCreateFields(product, dto);

            Assert.Equal(289_000m, product.BasePrice);
            Assert.Equal(15, product.DiscountPercent);
            Assert.Equal(ProductRfqMetadataHelper.DefaultPriceNote, product.PriceNote);
            Assert.Equal(10, product.MinOrderQuantity);

            var mapped = ProductMapping.MapToDto(product);
            Assert.Equal(289_000m, mapped.BasePrice);
            Assert.Equal(340_000m, mapped.OriginalPrice);
            Assert.Equal(15, mapped.DiscountPercent);
            Assert.NotEmpty(mapped.AvailableMaterials);
            Assert.NotEmpty(mapped.AvailablePrintTechniques);
        }

        [Theory]
        [InlineData(180_000, 200_000, 180_000)]
        [InlineData(0, 200_000, 200_000)]
        public void ResolveBasePrice_UsesProductTablePrice(
            decimal basePrice,
            decimal price,
            decimal expected)
        {
            var product = new Product { BasePrice = basePrice, Price = price };

            Assert.Equal(expected, ProductRfqMetadataHelper.ResolveBasePrice(product));
        }

        [Fact]
        public void CreateProductValidator_RejectsOriginalPriceLowerThanBasePrice()
        {
            var validator = new CreateProductValidator();
            var dto = new CreateProductDto
            {
                Sku = "AO-02",
                Name = "Áo thun lớp",
                Description = "Cotton 100%",
                Price = 200_000m,
                BasePrice = 200_000m,
                OriginalPrice = 150_000m,
                CategoryIds = []
            };

            var result = validator.Validate(dto);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateProductDto.OriginalPrice));
        }

        [Theory]
        [InlineData("0901234567", "https://zalo.me/0901234567", true)]
        [InlineData("+84 912 345 678", "https://zalo.me/0912345678", true)]
        [InlineData("0123456789", "", false)]
        [InlineData("not-a-phone", "", false)]
        public void UpdateShopContactValidator_ValidatesVnMobileAndBuildsZaloLink(
            string phone,
            string expectedZaloLink,
            bool expectedValid)
        {
            var validator = new UpdateShopContactDtoValidator();
            var dto = new UpdateShopContactDto
            {
                ZaloPhone = phone,
                Hotline = "0901 234 567",
                Email = "support@haushop.vn",
                MessengerLink = "https://m.me/haushop"
            };

            var result = validator.Validate(dto);
            Assert.Equal(expectedValid, result.IsValid);

            if (expectedValid)
            {
                var mapped = ShopContactService.MapToDto(new ShopContact
                {
                    ZaloPhone = ShopContactService.NormalizeZaloPhone(phone),
                    Hotline = dto.Hotline,
                    Email = dto.Email,
                    MessengerLink = dto.MessengerLink
                });
                Assert.Equal(expectedZaloLink, mapped.ZaloLink);
            }
        }

        [Fact]
        public void ImageController_UploadAndDelete_RequireAuthorization()
        {
            var uploadMethod = typeof(ImageController).GetMethod(nameof(ImageController.Upload))!;
            var deleteMethod = typeof(ImageController).GetMethod(nameof(ImageController.Delete))!;

            var uploadAuth = uploadMethod.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .FirstOrDefault();
            var deleteAuth = deleteMethod.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .FirstOrDefault();

            Assert.NotNull(uploadAuth);
            Assert.Contains("Admin", uploadAuth!.Roles ?? string.Empty);
            Assert.NotNull(deleteAuth);
            Assert.Contains("Admin", deleteAuth!.Roles ?? string.Empty);
        }
    }
}

