using System.Text.Json;
using api.common;
using api.DTOs.quote;
using api.models.enums;

namespace api.services.implementations.quote
{
    public static class QuoteStatusTransitionHelper
    {
        public static bool CanTransition(QuoteStatus current, QuoteStatus next, bool isCustomerAction = false)
        {
            if (current == next)
            {
                return true;
            }

            if (isCustomerAction)
            {
                return (next == QuoteStatus.Accepted && current == QuoteStatus.Quoted) ||
                       (next == QuoteStatus.Cancelled &&
                        current is QuoteStatus.Pending or QuoteStatus.Contacted or QuoteStatus.Quoted);
            }

            return current switch
            {
                QuoteStatus.Pending => next is QuoteStatus.Quoted or QuoteStatus.Rejected or QuoteStatus.Cancelled,
                QuoteStatus.Contacted => next is QuoteStatus.Quoted or QuoteStatus.Rejected or QuoteStatus.Cancelled,
                QuoteStatus.Quoted => next is QuoteStatus.Rejected or QuoteStatus.Cancelled,
                QuoteStatus.Accepted => false,
                QuoteStatus.InProduction => false,
                QuoteStatus.Completed => false,
                QuoteStatus.Rejected => false,
                QuoteStatus.Cancelled => false,
                _ => false
            };
        }

        public static void EnsureTransitionAllowed(QuoteStatus current, QuoteStatus next, bool isCustomerAction = false)
        {
            if (!CanTransition(current, next, isCustomerAction))
            {
                throw new InvalidOperationException(
                    $"Không thể chuyển trạng thái báo giá từ {current} sang {next}.");
            }
        }

        public static void EnsureCanAccess(string? ownerUserId, string currentUserId, bool isAdmin)
        {
            if (isAdmin)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(ownerUserId) ||
                !string.Equals(ownerUserId, currentUserId, StringComparison.Ordinal))
            {
                throw new ForbiddenAccessException("Bạn không có quyền truy cập yêu cầu báo giá này.");
            }
        }

        public static string BuildQuoteCode()
        {
            var suffix = Guid.NewGuid().ToString("N")[..4].ToUpperInvariant();
            return $"RFQ-{DateTime.UtcNow:yyyyMMdd}-{suffix}";
        }

        public static Dictionary<string, int> DeserializeSizeBreakdown(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new Dictionary<string, int>();
            }

            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, int>>(json)
                       ?? new Dictionary<string, int>();
            }
            catch (JsonException)
            {
                return new Dictionary<string, int>();
            }
        }

        public static List<LogoFileRefDto> DeserializeLogoFiles(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<LogoFileRefDto>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<LogoFileRefDto>>(json)
                       ?? new List<LogoFileRefDto>();
            }
            catch (JsonException)
            {
                return new List<LogoFileRefDto>();
            }
        }
    }
}

