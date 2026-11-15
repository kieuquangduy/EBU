using api.DTOs.product;
using api.DTOs.order;
using api.models.enums;

namespace api.DTOs.admin
{
    public class AdminPagedResultDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class AdminUserListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = string.Empty;
        public string? MerchantId { get; set; }
        public bool IsOnline { get; set; }
        public DateTime Created { get; set; }
        public DateTime? LastSeen { get; set; }
    }

    public class AdminUserDetailDto : AdminUserListItemDto
    {
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public DateTime? LastOrderAt { get; set; }
        public List<RecentOrderDto> RecentOrders { get; set; } = new();
        public int TotalQuoteRequests { get; set; }
        public DateTime? LastQuoteAt { get; set; }
        public List<AdminRecentQuoteDto> RecentQuoteRequests { get; set; } = new();
    }

    public class AdminRecentQuoteDto
    {
        public string Id { get; set; } = string.Empty;
        public string QuoteCode { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? OrganizationName { get; set; }
        public string? ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal? QuotedPrice { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class AdminUpdateUserRoleDto
    {
        public Role Role { get; set; }
        public string? MerchantId { get; set; }
    }

    public class AdminUpdateUserDto
    {
        public string? Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? MerchantId { get; set; }
    }

    public class AdminOrderListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string? OrderCode { get; set; }
        public string? UserId { get; set; }
        public string Source { get; set; } = OrderSource.Storefront.ToString();
        public string? QuoteRequestId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public string? Note { get; set; }
        public DateTime Created { get; set; }
        public DateTime? Updated { get; set; }
    }

    public class AdminOrderDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string? OrderCode { get; set; }
        public string? UserId { get; set; }
        public string Source { get; set; } = OrderSource.Storefront.ToString();
        public string? QuoteRequestId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string ReceiverName { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public string AddressLine { get; set; } = string.Empty;
        public string? Note { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime Created { get; set; }
        public DateTime? Updated { get; set; }
        public List<AdminOrderItemDto> Items { get; set; } = new();
        public ShippingDetailDto? Shipping { get; set; }
        public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();
        public AdminRfqOrderDetailsDto? RfqDetails { get; set; }
        public List<api.DTOs.quote.LogoFileRefDto> CustomFiles { get; set; } = new();
    }

    public class AdminRfqOrderDetailsDto
    {
        public string QuoteCode { get; set; } = string.Empty;
        public Dictionary<string, int> SizeBreakdown { get; set; } = new();
        public string? Material { get; set; }
        public string? ColorSelection { get; set; }
        public string PrintTechnique { get; set; } = string.Empty;
        public List<api.DTOs.quote.LogoFileRefDto> LogoFiles { get; set; } = new();
    }

    public class AdminOrderItemDto
    {
        public string? ProductId { get; set; }
        public string? ProductVariantId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? VariantSku { get; set; }
        public string? VariantSize { get; set; }
        public string? VariantColor { get; set; }
        public string? Material { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal Total { get; set; }
    }

    public class AdminCreateOrderFromQuoteDto
    {
        public string? ReceiverName { get; set; }
        public string? ReceiverPhone { get; set; }
        public string AddressLine { get; set; } = string.Empty;
        public decimal? Subtotal { get; set; }
        public decimal ShippingFee { get; set; }
        public string? Note { get; set; }
        public bool IsPaid { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class AdminCreateManualOrderDto
    {
        public string ReceiverName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string ReceiverPhone { get; set; } = string.Empty;
        public string AddressLine { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public OrderSource Source { get; set; } = OrderSource.ManualZalo;
        public string? Note { get; set; }
        public decimal ShippingFee { get; set; }
        public bool IsPaid { get; set; }
        public DateTime? PaidAt { get; set; }
        public List<AdminCreateOrderItemDto> Items { get; set; } = new();
    }

    public class AdminUpdateOrderDetailsDto
    {
        public string ReceiverName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string ReceiverPhone { get; set; } = string.Empty;
        public string AddressLine { get; set; } = string.Empty;
        public string? Note { get; set; }
        public decimal ShippingFee { get; set; }
        public List<AdminCreateOrderItemDto> Items { get; set; } = new();
    }

    public class AdminCreateOrderItemDto
    {
        public string? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? VariantSize { get; set; }
        public string? VariantColor { get; set; }
        public string? Material { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class AdminUpdateOrderPaymentDto
    {
        public bool IsPaid { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? Note { get; set; }
    }

    public class AdminUpdateOrderStatusDto : UpdateOrderStatusDto
    {
    }

    public class AdminSettingsDto
    {
        public string StoreName { get; set; } = string.Empty;
        public string SupportEmail { get; set; } = string.Empty;
        public string? SupportPhone { get; set; }
        public int LowStockThreshold { get; set; }
        public int RecentOrdersLimit { get; set; }
        public bool EnableOrderNotifications { get; set; }
        public bool EnableInventoryAlerts { get; set; }
        public bool EnableWeeklySummary { get; set; }
        public DateTime? Updated { get; set; }
    }

    public class UpdateAdminSettingsDto
    {
        public string StoreName { get; set; } = string.Empty;
        public string SupportEmail { get; set; } = string.Empty;
        public string? SupportPhone { get; set; }
        public int LowStockThreshold { get; set; }
        public int RecentOrdersLimit { get; set; }
        public bool EnableOrderNotifications { get; set; }
        public bool EnableInventoryAlerts { get; set; }
        public bool EnableWeeklySummary { get; set; }
    }
}
