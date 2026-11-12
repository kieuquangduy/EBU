using System.Text.Json;
using api.DTOs.product;
using api.models.entities;

namespace api.mappings
{
    /// <summary>
    /// Shared normalization and JSON serialization helpers for Product RFQ pricing/option fields.
    /// </summary>
    public static class ProductRfqMetadataHelper
    {
        public const string DefaultPriceNote =
            "Giá sản phẩm có thể thay đổi theo chất liệu, số lượng và kỹ thuật in.";

        public const int DefaultMinOrderQuantity = 10;

        public static readonly string[] DefaultMaterials =
        [
            "Cotton 100% 2 chiều",
            "Cotton 100% 4 chiều",
            "Cá sấu Poly",
            "Vải dù gió"
        ];

        public static readonly string[] DefaultPrintTechniques =
        [
            "In lụa",
            "In chuyển nhiệt",
            "In DTF",
            "In decal",
            "Thêu vi tính"
        ];

        public static List<string> DeserializeOptions(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<string>();
            }

            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(json);
                return parsed?
                    .Where(item => !string.IsNullOrWhiteSpace(item))
                    .Select(item => item.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList() ?? new List<string>();
            }
            catch (JsonException)
            {
                return new List<string>();
            }
        }

        public static string? SerializeOptions(IEnumerable<string>? options)
        {
            if (options is null)
            {
                return null;
            }

            var cleaned = options
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return JsonSerializer.Serialize(cleaned);
        }

        public static decimal ResolveBasePrice(Product product) =>
            product.BasePrice > 0 ? product.BasePrice : product.Price;

        public static int? ResolveDiscountPercent(decimal basePrice, decimal? originalPrice, int? explicitDiscount)
        {
            if (explicitDiscount.HasValue)
            {
                return explicitDiscount.Value is >= 0 and <= 99 ? explicitDiscount.Value : null;
            }

            if (originalPrice.HasValue && originalPrice.Value > basePrice && originalPrice.Value > 0)
            {
                var computed = (int)Math.Round((originalPrice.Value - basePrice) / originalPrice.Value * 100m,
                    MidpointRounding.AwayFromZero);
                return Math.Clamp(computed, 1, 99);
            }

            return null;
        }

        public static void ApplyCreateFields(Product product, CreateProductDto dto)
        {
            var effectiveBasePrice = dto.BasePrice ?? dto.Price;
            product.BasePrice = effectiveBasePrice;
            product.Price = effectiveBasePrice;
            product.OriginalPrice = dto.OriginalPrice;
            product.DiscountPercent = ResolveDiscountPercent(effectiveBasePrice, dto.OriginalPrice, dto.DiscountPercent);
            product.PriceNote = string.IsNullOrWhiteSpace(dto.PriceNote)
                ? DefaultPriceNote
                : dto.PriceNote.Trim();
            product.AvailableMaterials = SerializeOptions(
                dto.AvailableMaterials is { Count: > 0 } ? dto.AvailableMaterials : DefaultMaterials);
            product.AvailablePrintTechniques = SerializeOptions(
                dto.AvailablePrintTechniques is { Count: > 0 } ? dto.AvailablePrintTechniques : DefaultPrintTechniques);
            product.MinOrderQuantity = dto.MinOrderQuantity ?? DefaultMinOrderQuantity;
        }

        public static void ApplyUpdateFields(Product product, UpdateProductDto dto)
        {
            if (dto.BasePrice.HasValue)
            {
                product.BasePrice = dto.BasePrice.Value;
                product.Price = dto.BasePrice.Value;
            }
            else if (dto.Price.HasValue)
            {
                product.Price = dto.Price.Value;
                product.BasePrice = dto.Price.Value;
            }

            if (dto.OriginalPrice.HasValue)
            {
                product.OriginalPrice = dto.OriginalPrice.Value > 0 ? dto.OriginalPrice.Value : null;
            }

            if (dto.DiscountPercent.HasValue || dto.BasePrice.HasValue || dto.Price.HasValue || dto.OriginalPrice.HasValue)
            {
                var basePrice = ResolveBasePrice(product);
                product.DiscountPercent = ResolveDiscountPercent(
                    basePrice,
                    product.OriginalPrice,
                    dto.DiscountPercent);
            }

            if (dto.PriceNote != null)
            {
                product.PriceNote = string.IsNullOrWhiteSpace(dto.PriceNote)
                    ? DefaultPriceNote
                    : dto.PriceNote.Trim();
            }

            if (dto.AvailableMaterials != null)
            {
                product.AvailableMaterials = SerializeOptions(dto.AvailableMaterials);
            }

            if (dto.AvailablePrintTechniques != null)
            {
                product.AvailablePrintTechniques = SerializeOptions(dto.AvailablePrintTechniques);
            }

            if (dto.MinOrderQuantity.HasValue)
            {
                product.MinOrderQuantity = dto.MinOrderQuantity.Value;
            }
        }
    }
}

