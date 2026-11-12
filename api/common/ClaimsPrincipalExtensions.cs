using System.Security.Claims;

namespace api.common
{
    public static class ClaimsPrincipalExtensions
    {
        public static string? GetUserId(this ClaimsPrincipal principal) =>
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ??
            principal.FindFirstValue("id") ??
            principal.FindFirstValue("sub");

        public static bool IsAdmin(this ClaimsPrincipal principal) =>
            principal.IsInRole("Admin");
    }
}

