namespace api.DTOs.shop
{
    public class ShopContactDto
    {
        public string ZaloPhone { get; set; } = string.Empty;
        public string ZaloLink { get; set; } = string.Empty;
        public string? ZaloOAId { get; set; }
        public string Hotline { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? MessengerLink { get; set; }
        public string? FacebookLink { get; set; }
        public string? WorkingHours { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class UpdateShopContactDto
    {
        public string ZaloPhone { get; set; } = string.Empty;
        public string? ZaloOAId { get; set; }
        public string Hotline { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? MessengerLink { get; set; }
        public string? WorkingHours { get; set; }
    }
}

