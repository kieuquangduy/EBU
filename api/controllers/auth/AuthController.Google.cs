using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using api.common;
using api.services.interfaces.auth;

namespace api.controllers
{
    public partial class AuthController
    {

        [HttpGet("google")]
        [AllowAnonymous]
        public IActionResult GoogleLogin()
        {
            var state = Guid.NewGuid().ToString("N");
            bool isHttps = Request.IsHttps || Request.Headers["X-Forwarded-Proto"] == "https";

            Response.Cookies.Append("oauth_state", state, new CookieOptions
            {
                HttpOnly = true,
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddMinutes(10),
                Path = "/"
            });

            var configuredRedirectUri = _config["Google:RedirectUri"] ?? _config["Google__RedirectUri"];
            string? effectiveRedirectUri = configuredRedirectUri;

            // If not explicitly set or points to localhost, auto-resolve when running on Render/cloud
            if (string.IsNullOrWhiteSpace(configuredRedirectUri) || configuredRedirectUri.Contains("localhost"))
            {
                var host = Request.Host.Value;
                if (!string.IsNullOrWhiteSpace(host) && !host.Contains("localhost") && !host.Contains("127.0.0.1"))
                {
                    effectiveRedirectUri = $"{Request.Scheme}://{host}/api/auth/google/callback";
                }
            }

            if (!string.IsNullOrWhiteSpace(effectiveRedirectUri))
            {
                Response.Cookies.Append("oauth_redirect_uri", effectiveRedirectUri, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = isHttps,
                    SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddMinutes(10),
                    Path = "/"
                });
            }

            var redirectUrl = _googleAuthService.BuildAuthorizationUrl(state, effectiveRedirectUri);
            return Redirect(redirectUrl);
        }

        [HttpGet("google/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback(
     [FromQuery] string? code,
     [FromQuery] string? state,
     [FromQuery] string? error)
        {
            var frontendUrl = _config["Google:FrontendUrl"] ?? _config["Google__FrontendUrl"] ?? "http://localhost:3000";

            if (!string.IsNullOrEmpty(error))
                return Redirect($"{frontendUrl}/signin?error=google_denied");

            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                return Redirect($"{frontendUrl}/signin?error=invalid_request");

            // 1. Lấy state từ cookie
            var expectedState = Request.Cookies["oauth_state"];

            // 2. Kiểm tra NGHIÊM NGẶT: Nếu không có state trong cookie thì chặn luôn
            if (string.IsNullOrEmpty(expectedState))
            {
                _logger.LogWarning("Google Auth failed: oauth_state cookie is missing.");
                return Redirect($"{frontendUrl}/signin?error=session_expired");
            }

            var effectiveRedirectUri = Request.Cookies["oauth_redirect_uri"];
            bool isHttps = Request.IsHttps || Request.Headers["X-Forwarded-Proto"] == "https";

            Response.Cookies.Delete("oauth_state", new CookieOptions
            {
                Path = "/",
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax
            });
            Response.Cookies.Delete("oauth_redirect_uri", new CookieOptions
            {
                Path = "/",
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax
            });

            try
            {
                // 3. Truyền expectedState vào service
                var result = await _googleAuthService.HandleCallbackAsync(code, state, expectedState, effectiveRedirectUri);

                SetAccessTokenCookie(result.AccessToken);
                SetRefreshTokenCookie(result.RefreshToken);

                var encToken = Uri.EscapeDataString(result.AccessToken);
                var encRefresh = Uri.EscapeDataString(result.RefreshToken);

                return Redirect($"{frontendUrl}/signin?google=success&token={encToken}&refresh={encRefresh}");
            }
            catch (ApiAuthenticationException ex)
            {
                _logger.LogWarning(ex, "Google callback authentication failed");
                return Redirect($"{frontendUrl}/signin?error=auth_failed");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi trong quá trình Google Callback");
                return Redirect($"{frontendUrl}/signin?error=auth_failed");
            }
        }
    }
}
