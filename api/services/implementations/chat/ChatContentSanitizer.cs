using System.Text.RegularExpressions;
using api.DTOs.chat;

namespace api.services.implementations.chat
{
    public static class ChatContentSanitizer
    {
        private static readonly Regex ScriptBlockRegex = new(
            @"<\s*(script|style|iframe|object|embed|svg)\b[^>]*>[\s\S]*?<\s*/\s*\1\s*>",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex HtmlTagRegex = new(
            @"<\/?[a-zA-Z!][^>]*>",
            RegexOptions.Compiled);

        private static readonly Regex DangerousUriSchemeRegex = new(
            @"(?:javascript|vbscript|data\s*:\s*text/html)\s*:",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex InlineEventHandlerRegex = new(
            @"\bon[a-z]+\s*=",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static string SanitizeMessage(string? input, int maxLength = 5000)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }

            var cleaned = ScriptBlockRegex.Replace(input, string.Empty);
            cleaned = HtmlTagRegex.Replace(cleaned, string.Empty);
            cleaned = DangerousUriSchemeRegex.Replace(cleaned, string.Empty);
            cleaned = InlineEventHandlerRegex.Replace(cleaned, string.Empty);
            cleaned = cleaned.Replace("\0", string.Empty).Trim();

            return cleaned.Length > maxLength ? cleaned[..maxLength] : cleaned;
        }

        public static string SanitizeSubject(string? input, string fallback = "Support chat")
        {
            var sanitized = SanitizeMessage(input, 500);
            return string.IsNullOrWhiteSpace(sanitized) ? fallback : sanitized;
        }

        public static bool IsSafeAttachmentUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return false;
            }

            var trimmed = url.Trim();
            if (trimmed.Length > 500)
            {
                return false;
            }

            if (trimmed.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                return !trimmed.Contains("..", StringComparison.Ordinal);
            }

            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            {
                return uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
            }

            return false;
        }

        public static List<ChatAttachmentDto>? SanitizeAttachments(IEnumerable<ChatAttachmentDto>? attachments)
        {
            if (attachments is null)
            {
                return null;
            }

            var result = new List<ChatAttachmentDto>();
            foreach (var item in attachments)
            {
                if (item is null || !IsSafeAttachmentUrl(item.Url))
                {
                    continue;
                }

                var safeName = Path.GetFileName(SanitizeMessage(item.Name, 200));
                if (string.IsNullOrWhiteSpace(safeName))
                {
                    safeName = "attachment";
                }

                result.Add(new ChatAttachmentDto
                {
                    Url = item.Url.Trim(),
                    Name = safeName,
                    ContentType = string.IsNullOrWhiteSpace(item.ContentType)
                        ? null
                        : SanitizeMessage(item.ContentType, 100),
                    SizeBytes = item.SizeBytes is > 0 ? item.SizeBytes : null
                });

                if (result.Count >= 5)
                {
                    break;
                }
            }

            return result.Count > 0 ? result : null;
        }
    }
}

