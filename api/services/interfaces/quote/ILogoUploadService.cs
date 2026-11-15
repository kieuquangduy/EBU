using api.DTOs.quote;

namespace api.services.interfaces.quote
{
    public interface ILogoUploadService
    {
        Task<List<LogoFileRefDto>> SaveLogosAsync(IReadOnlyList<IFormFile> files, CancellationToken ct = default);
        Task<List<LogoFileRefDto>> SaveChatAttachmentsAsync(string roomId, IReadOnlyList<IFormFile> files, CancellationToken ct = default);
        string? ResolveExistingPath(string storedFileName);
        string? ResolveChatAttachmentPath(string roomId, string storedFileName);
        bool DeleteChatAttachment(string roomId, string storedFileName);
        string GetDownloadContentType(string storedFileName);
    }
}

