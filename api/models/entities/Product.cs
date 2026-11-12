using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace api.models.entities
{
    public class Product
    {
        public string Id { get; set; }
        public string Sku { get; set; }
        public string Name { get; set; }
        public string Slug { get; set; }
        public string ImageUrl { get; set; }
        public string ImageKey { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int? DiscountPercent { get; set; }
        public string PriceNote { get; set; } = "Giá sản phẩm có thể thay đổi theo chất liệu, số lượng và kỹ thuật in.";
        public string? AvailableMaterials { get; set; }
        public string? AvailablePrintTechniques { get; set; }
        public int MinOrderQuantity { get; set; } = 10;
        public bool Taxable { get; set; }
        public bool IsActive { get; set; }
        public string? BrandId { get; set; }
        public Brand? Brand { get; set; }

        // Tổng tồn kho (tính từ variants hoặc nhập thủ công)
        public int Stock { get; set; } = 0;
        public decimal AverageRating { get; set; } = 0;
        public int ReviewCount { get; set; } = 0;

        public DateTime Created { get; set; }
        public DateTime? Updated { get; set; }
        public ICollection<ProductCategory> ProductCategories { get; set; }
        public ICollection<OrderItem> OrderItems { get; set; }
        public ICollection<Review> Reviews { get; set; }
        public ICollection<Wishlist> Wishlists { get; set; }
        public ICollection<ProductVariant> ProductVariants { get; set; }
        public ICollection<QuoteRequest> QuoteRequests { get; set; } = new List<QuoteRequest>();
    }
}
