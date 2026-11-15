using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using api.common;
using api.services.interfaces.auth;

namespace api.controllers
{
    public partial class AuthController
    {
        private string ResolveFrontendUrl(string? returnUrl)
        {
            if (!string.IsNullOrWhiteSpace(returnUrl) && Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
            {
                if (uri.Host == "localhost" || uri.Host == "127.0.0.1")
                {
                    return $"{uri.Scheme}://{uri.Authority}".TrimEnd('/');
                }

                if (uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                {
                    return $"{uri.Scheme}://{uri.Authority}".TrimEnd('/');
                }

                var corsOrigins = _config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
                if (corsOrigins.Any(o => Uri.TryCreate(o, UriKind.Absolute, out var allowedUri) &&
                                         allowedUri.Authority.Equals(uri.Authority, StringComparison.OrdinalIgnoreCase)))
                {
                    return $"{uri.Scheme}://{uri.Authority}".TrimEnd('/');
                }
            }

            var referer = Request.Headers["Referer"].ToString();
            if (!string.IsNullOrWhiteSpace(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var refUri))
            {
                if (refUri.Host == "localhost" || refUri.Host == "127.0.0.1" || refUri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
                {
                    return $"{refUri.Scheme}://{refUri.Authority}".TrimEnd('/');
                }
            }

            var configured = _config["Google:FrontendUrl"] ?? _config["Google__FrontendUrl"] ?? _config["AppUrl"];
            if (!string.IsNullOrWhiteSpace(configured) && !configured.Contains("localhost:3000"))
            {
                return configured.TrimEnd('/');
            }

            return "http://localhost:5173";
        }

        [HttpGet("google")]
        [AllowAnonymous]
        public IActionResult GoogleLogin([FromQuery] string? returnUrl)
        {
            var effectiveFrontendUrl = ResolveFrontendUrl(returnUrl);
            var rawState = Guid.NewGuid().ToString("N");
            var encodedFrontend = Convert.ToBase64String(Encoding.UTF8.GetBytes(effectiveFrontendUrl))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            var state = $"{rawState}.{encodedFrontend}";

            bool isHttps = Request.IsHttps || Request.Headers["X-Forwarded-Proto"] == "https";

            Response.Cookies.Append("oauth_state", state, new CookieOptions
            {
                HttpOnly = true,
                Secure = isHttps,
                SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddMinutes(10),
                Path = "/"
            });

            Response.Cookies.Append("oauth_frontend_url", effectiveFrontendUrl, new CookieOptions
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
            // Resolve frontend URL
            string? frontendUrl = Request.Cookies["oauth_frontend_url"];
            if (string.IsNullOrWhiteSpace(frontendUrl) && !string.IsNullOrWhiteSpace(state) && state.Contains('.'))
            {
                try
                {
                    var parts = state.Split('.');
                    if (parts.Length == 2)
                    {
                        var base64 = parts[1].Replace('-', '+').Replace('_', '/');
                        switch (base64.Length % 4)
                        {
                            case 2: base64 += "=="; break;
                            case 3: base64 += "="; break;
                        }
                        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(base64));
                        if (Uri.TryCreate(decoded, UriKind.Absolute, out var uri) &&
                            (uri.Host == "localhost" || uri.Host == "127.0.0.1" || uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)))
                        {
                            frontendUrl = decoded.TrimEnd('/');
                        }
                    }
                }
                catch
                {
                    // Ignore decode errors and use fallback
                }
            }

            if (string.IsNullOrWhiteSpace(frontendUrl))
            {
                frontendUrl = ResolveFrontendUrl(null);
            }

            if (!string.IsNullOrEmpty(error))
                return Redirect($"{frontendUrl}/signin?error=google_denied");

            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
                return Redirect($"{frontendUrl}/signin?error=invalid_request");

            // 1. Lấy state từ cookie hoặc fallback từ chính state nếu có format hợp lệ
            var expectedState = Request.Cookies["oauth_state"];

            if (string.IsNullOrEmpty(expectedState))
            {
                // Fallback: nếu mobile browser drop cookie oauth_state nhưng state Google trả về có cấu trúc hợp lệ (guid.encodedUrl)
                if (state.Contains('.') && state.Length > 32)
                {
                    expectedState = state;
                }
                else
                {
                    _logger.LogWarning("Google Auth failed: oauth_state cookie is missing.");
                    return Redirect($"{frontendUrl}/signin?error=session_expired");
                }
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
            Response.Cookies.Delete("oauth_frontend_url", new CookieOptions
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
