namespace api.models.entities
{
    public class ShopContact
    {
        public string Id { get; set; } = "default";
        public string ZaloPhone { get; set; } = "0900000000";
        public string? ZaloOAId { get; set; }
        public string Hotline { get; set; } = "0900 000 000";
        public string Email { get; set; } = "contact@haushop.vn";
        public string? MessengerLink { get; set; }
        public string? WorkingHours { get; set; } = "08:00 - 21:00 (Thứ 2 - Chủ nhật)";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}

