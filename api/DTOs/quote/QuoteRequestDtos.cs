using System.Text.Json.Serialization;
using api.models.enums;
using api.DTOs.order;

namespace api.DTOs.quote
{
    public class LogoFileRefDto
    {
        public string FileName { get; set; } = string.Empty;
        public string OriginalName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
    }

    public class CreateQuoteRequestDto
    {
        public string? ProductId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? OrganizationName { get; set; }
        public int Quantity { get; set; }
        public string? Material { get; set; }

        [JsonConverter(typeof(NullablePrintTechniqueJsonConverter))]
        public PrintTechnique? PrintTechnique { get; set; }
        public Dictionary<string, int>? SizeBreakdown { get; set; }
        public string? ColorSelection { get; set; }
        public List<LogoFileRefDto>? LogoFiles { get; set; }
        public string? Note { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }

        /// <summary>
        /// Hidden honeypot field for basic anti-spam; human users leave this blank.
        /// </summary>
        public string? Website { get; set; }
    }

    public class QuoteRequestQueryDto
    {
        public QuoteStatus? Status { get; set; }
        public string? StatusGroup { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Search { get; set; }
        public string? AssignedAdminId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class UpdateQuoteStatusDto
    {
        public QuoteStatus Status { get; set; }
        public string? InternalNote { get; set; }
    }

    public class UpdateQuotePriceDto
    {
        public decimal QuotedPrice { get; set; }
        public string? QuotedNote { get; set; }
        public string? InternalNote { get; set; }

        [JsonConverter(typeof(NullablePrintTechniqueJsonConverter))]
        public PrintTechnique? PrintTechnique { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
    }

    public class AssignQuoteAdminDto
    {
        public string? AssignedAdminId { get; set; }
    }

    public class QuoteRequestSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string QuoteCode { get; set; } = string.Empty;
        public string? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductSlug { get; set; }
        public string? ProductImageUrl { get; set; }
        public decimal? ProductUnitPrice { get; set; }
        public string? UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? OrganizationName { get; set; }
        public int Quantity { get; set; }
        public string? Material { get; set; }
        public PrintTechnique PrintTechnique { get; set; }
        public QuoteStatus Status { get; set; }
        public decimal? QuotedPrice { get; set; }
        public string? OrderId { get; set; }
        public string? OrderCode { get; set; }
        public string? AssignedAdminId { get; set; }
        public string? AssignedAdminName { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class QuoteRequestDto : QuoteRequestSummaryDto
    {
        public Dictionary<string, int> SizeBreakdown { get; set; } = new();
        public string? ColorSelection { get; set; }
        public List<LogoFileRefDto> LogoFiles { get; set; } = new();
        public string? Note { get; set; }
        public string? QuotedNote { get; set; }
        public string? InternalNote { get; set; }
        public DateTime? QuotedAt { get; set; }
        public QuoteOrderProgressDto? Order { get; set; }
    }

    public class QuoteOrderProgressDto
    {
        public string Id { get; set; } = string.Empty;
        public string? OrderCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public ShippingDetailDto? Shipping { get; set; }
    }

    public class CreateQuoteRequestResultDto
    {
        public string Id { get; set; } = string.Empty;
        public string QuoteCode { get; set; } = string.Empty;
        public QuoteStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class PagedQuoteRequestDto
    {
        public List<QuoteRequestSummaryDto> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}

