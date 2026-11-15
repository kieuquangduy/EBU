using api.DTOs.quote;

namespace api.services.interfaces.quote
{
    public interface IQuoteRequestService
    {
        Task<CreateQuoteRequestResultDto> CreateAsync(
            CreateQuoteRequestDto dto,
            string? currentUserId,
            CancellationToken ct = default);

        Task<PagedQuoteRequestDto> GetMyQuotesAsync(
            string currentUserId,
            QuoteRequestQueryDto query,
            CancellationToken ct = default);

        Task<QuoteRequestDto> GetByIdAsync(
            string id,
            string currentUserId,
            bool isAdmin,
            CancellationToken ct = default);

        Task<QuoteRequestDto> CancelByUserAsync(
            string id,
            string currentUserId,
            CancellationToken ct = default);

        Task<QuoteRequestDto> AcceptByUserAsync(
            string id,
            string currentUserId,
            CancellationToken ct = default);

        Task<PagedQuoteRequestDto> GetAdminQuotesAsync(
            QuoteRequestQueryDto query,
            CancellationToken ct = default);

        Task<QuoteRequestDto> UpdateStatusAsync(
            string id,
            UpdateQuoteStatusDto dto,
            CancellationToken ct = default);

        Task<QuoteRequestDto> UpdateQuotePriceAsync(
            string id,
            UpdateQuotePriceDto dto,
            string adminUserId,
            CancellationToken ct = default);

        Task<QuoteRequestDto> AssignAdminAsync(
            string id,
            AssignQuoteAdminDto dto,
            CancellationToken ct = default);

        Task<(string FilePath, string DownloadFileName, string ContentType)> ResolveLogoDownloadAsync(
            string quoteId,
            string storedFileName,
            string currentUserId,
            bool isAdmin,
            CancellationToken ct = default);
    }
}

