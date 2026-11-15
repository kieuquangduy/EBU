using api.models.enums;

namespace api.models.entities
{
    public class QuoteRequest
    {
        public string Id { get; set; } = string.Empty;
        public string QuoteCode { get; set; } = string.Empty;
        public string? ProductId { get; set; }
        public Product? Product { get; set; }
        public string? UserId { get; set; }
        public User? User { get; set; }

        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? OrganizationName { get; set; }

        public int Quantity { get; set; }
        public string? Material { get; set; }
        public PrintTechnique PrintTechnique { get; set; } = PrintTechnique.ScreenPrint;
        public string? SizeBreakdownJson { get; set; }
        public string? ColorSelection { get; set; }
        public string? LogoFileUrlsJson { get; set; }
        public string? Note { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }

        public QuoteStatus Status { get; set; } = QuoteStatus.Pending;
        public decimal? QuotedPrice { get; set; }
        public string? QuotedNote { get; set; }
        public string? InternalNote { get; set; }
        public string? AssignedAdminId { get; set; }
        public User? AssignedAdmin { get; set; }
        public DateTime? QuotedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}

