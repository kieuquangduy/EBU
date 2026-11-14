
using api.DTOs.user;

namespace api.services.interfaces.auth
{
    public interface IGoogleAuthService
    {
        string BuildAuthorizationUrl(string state, string? overrideRedirectUri = null);

        Task<AuthResponseDto> HandleCallbackAsync(string code, string state, string expectedState, string? overrideRedirectUri = null);
    }
}