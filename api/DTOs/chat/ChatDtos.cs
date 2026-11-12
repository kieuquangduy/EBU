namespace api.DTOs.chat
{
    public class ChatAttachmentDto
    {
        public string Url { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }
    }

    public class ChatProductCardDto
    {
        public string ProductId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int? DiscountPercent { get; set; }
        public int MinOrderQuantity { get; set; }
    }

    public class SupportAvailabilityDto
    {
        public bool IsAdminOnline { get; set; }
        public int OnlineAdminCount { get; set; }
        public int UnreadCount { get; set; }
        public string? WorkingHours { get; set; }
    }

    public class ChatRoomDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string? CustomerAvatar { get; set; }
        public string? CustomerPhone { get; set; }
        public bool CustomerIsOnline { get; set; }
        public DateTime? CustomerLastSeen { get; set; }
        public string? AssignedToId { get; set; }
        public string? ProductId { get; set; }
        public string? ProductName { get; set; }
        public string? ProductSlug { get; set; }
        public string? QuoteRequestId { get; set; }
        public string? QuoteCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public int UnreadCount { get; set; }
        public ChatMessageDto? LastMessage { get; set; }
        public DateTime Created { get; set; }
        public DateTime? ClosedAt { get; set; }
    }

    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string ChatRoomId { get; set; } = string.Empty;
        public string SenderId { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string? SenderAvatar { get; set; }
        public string SenderRole { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string MessageType { get; set; } = string.Empty;
        public List<ChatAttachmentDto>? Attachments { get; set; }
        public ChatProductCardDto? ProductCard { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime Created { get; set; }
    }

    public class SendChatMessageDto
    {
        public string ChatRoomId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string MessageType { get; set; } = "Text";
        public List<ChatAttachmentDto>? Attachments { get; set; }
    }

    public class StartSupportChatDto
    {
        public string? Subject { get; set; }
        public string? ProductId { get; set; }
        public string? QuoteRequestId { get; set; }
        public string? InitialMessage { get; set; }
    }

    public class AiChatResultDto
    {
        public ChatMessageDto AssistantMessage { get; set; } = new();
        public bool RequiresHuman { get; set; }
        public string Intent { get; set; } = "General";
    }
}
