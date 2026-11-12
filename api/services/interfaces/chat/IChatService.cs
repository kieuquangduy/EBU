using api.DTOs.chat;

namespace api.services.interfaces.chat
{
    public interface IChatService
    {
        Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, string? subject, CancellationToken ct = default);
        Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, StartSupportChatDto dto, CancellationToken ct = default);
        Task<ChatRoomDto> GetOrCreateAiRoomAsync(string customerId, CancellationToken ct = default);
        Task<IReadOnlyList<ChatRoomDto>> GetRoomsAsync(string userId, bool isAdmin, CancellationToken ct = default);
        Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(string roomId, string userId, bool isAdmin, int take = 50, CancellationToken ct = default);
        Task<ChatMessageDto> SendMessageAsync(
            string roomId,
            string senderId,
            bool isAdmin,
            string message,
            string messageType = "Text",
            CancellationToken ct = default,
            IReadOnlyList<ChatAttachmentDto>? attachments = null);
        Task<ChatMessageDto> SendAiCustomerMessageAsync(string roomId, string senderId, string message, string messageType = "Text", CancellationToken ct = default);
        Task<ChatMessageDto> SendAssistantMessageAsync(string roomId, string message, CancellationToken ct = default);
        Task EscalateToHumanAsync(string roomId, CancellationToken ct = default);
        Task MarkAsReadAsync(string roomId, string readerId, bool isAdmin, CancellationToken ct = default);
        Task EnsureCanAccessRoomAsync(string roomId, string userId, bool isAdmin, CancellationToken ct = default);
        Task<SupportAvailabilityDto> GetSupportAvailabilityAsync(string userId, CancellationToken ct = default);
    }
}
