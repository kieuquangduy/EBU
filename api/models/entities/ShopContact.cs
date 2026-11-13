using System.ComponentModel.DataAnnotations.Schema;

namespace api.models.entities
{
    public class ShopContact
    {
        public string Id { get; set; } = "default";
        public string ZaloPhone { get; set; } = "0963538795";
        public string? ZaloOAId { get; set; }
        public string Hotline { get; set; } = "0963 538 795";
        public string Email { get; set; } = "contact@haushop.vn";
        public string? MessengerLink { get; set; } = "https://m.me/61596220172115";

        [NotMapped]
        public string FacebookLink { get; set; } = "https://www.facebook.com/profile.php?id=61596220172115";

        public string? WorkingHours { get; set; } = "08:00 - 21:00 (Thứ 2 - Chủ nhật)";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}

