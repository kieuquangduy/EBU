using api.DTOs.quote;

namespace api.services.interfaces.quote
{
    public interface ILogoUploadService
    {
        Task<List<LogoFileRefDto>> SaveLogosAsync(IReadOnlyList<IFormFile> files, CancellationToken ct = default);
        string? ResolveExistingPath(string storedFileName);
        string GetDownloadContentType(string storedFileName);
    }
}

