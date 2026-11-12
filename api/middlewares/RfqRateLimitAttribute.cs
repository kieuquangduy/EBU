using api.services.interfaces.caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace api.middlewares
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
    public sealed class RfqRateLimitAttribute : Attribute, IAsyncActionFilter
    {
        public int PermitLimit { get; init; } = 8;
        public int WindowSeconds { get; init; } = 600;

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var cache = context.HttpContext.RequestServices.GetService<ICacheService>();
            var logger = context.HttpContext.RequestServices.GetService<ILogger<RfqRateLimitAttribute>>();

            if (cache is not null)
            {
                try
                {
                    var ip = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    var path = context.HttpContext.Request.Path.Value ?? "rfq";
                    var key = CacheKeys.RfqRateLimit($"{ip}:{path}");

                    var count = await cache.IncrementAsync(
                        key,
                        TimeSpan.FromSeconds(WindowSeconds),
                        context.HttpContext.RequestAborted);

                    context.HttpContext.Response.Headers["X-RateLimit-Limit"] = PermitLimit.ToString();
                    context.HttpContext.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, PermitLimit - count).ToString();

                    if (count > PermitLimit)
                    {
                        context.HttpContext.Response.Headers["Retry-After"] = WindowSeconds.ToString();
                        context.Result = new ObjectResult(new ProblemDetails
                        {
                            Status = StatusCodes.Status429TooManyRequests,
                            Title = "Quá nhiều yêu cầu",
                            Detail = "Bạn gửi quá nhanh, vui lòng thử lại sau ít phút.",
                            Instance = context.HttpContext.Request.Path,
                            Extensions =
                            {
                                ["traceId"] = context.HttpContext.TraceIdentifier
                            }
                        })
                        {
                            StatusCode = StatusCodes.Status429TooManyRequests
                        };
                        return;
                    }
                }
                catch (Exception ex)
                {
                    // Fail open locally if Redis is unavailable so local development is never blocked.
                    logger?.LogWarning(ex, "RFQ rate limit skipped (Redis unavailable).");
                }
            }

            await next();
        }
    }
}

