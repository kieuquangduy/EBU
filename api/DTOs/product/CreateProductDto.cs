using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace api.DTOs.product
{
    public class CreateProductDto
    {
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }           // nếu null → tự sinh từ Name
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal? BasePrice { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int? DiscountPercent { get; set; }
        public string? PriceNote { get; set; }
        public List<string>? AvailableMaterials { get; set; }
        public List<string>? AvailablePrintTechniques { get; set; }
        public int? MinOrderQuantity { get; set; }
        public bool Taxable { get; set; } = false;
        public bool IsActive { get; set; } = true;
        public string? BrandId { get; set; }
        public List<string> CategoryIds { get; set; } = new();

        public string? ImageUrl { get; set; }
        public string? ImageKey { get; set; }

        // Tồn kho và Rating (optional)
        public int Stock { get; set; } = 0;
        public decimal AverageRating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;
    }
}