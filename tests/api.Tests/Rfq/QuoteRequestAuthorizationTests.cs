using System.Security.Claims;
using api.common;
using api.controllers.quote;
using api.DTOs.quote;
using api.middleware;
using api.models.enums;
using api.services.implementations.quote;
using api.services.interfaces.quote;
using api.validators.quote;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace api.Tests.Rfq
{
    public class QuoteRequestAuthorizationTests
    {
        [Fact]
        public void EnsureCanAccess_PreventsIdorBetweenUsersAndGuestQuotes()
        {
            QuoteStatusTransitionHelper.EnsureCanAccess("user-a", "user-a", isAdmin: false);
            QuoteStatusTransitionHelper.EnsureCanAccess("user-a", "admin-1", isAdmin: true);
            QuoteStatusTransitionHelper.EnsureCanAccess(null, "admin-1", isAdmin: true);

            Assert.Throws<ForbiddenAccessException>(() =>
                QuoteStatusTransitionHelper.EnsureCanAccess("user-a", "user-b", isAdmin: false));
            Assert.Throws<ForbiddenAccessException>(() =>
                QuoteStatusTransitionHelper.EnsureCanAccess(null, "user-b", isAdmin: false));
        }

        [Fact]
        public async Task GetById_WhenUserRequestsAnotherUsersQuote_Returns403ThroughGlobalExceptionHandler()
        {
            var fakeService = new FakeQuoteRequestService(ownerUserId: "user-a");
            var controller = new QuoteRequestController(
                fakeService,
                new StubLogoUploadService(),
                new CreateQuoteRequestDtoValidator());

            var httpContext = new DefaultHttpContext
            {
                User = BuildPrincipal("user-b", "Member")
            };
            httpContext.Request.Path = "/api/quote-requests/quote-1";
            httpContext.Response.Body = new MemoryStream();
            controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
            {
                HttpContext = httpContext
            };

            var exception = await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
                controller.GetById("quote-1", CancellationToken.None));

            var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
            await handler.TryHandleAsync(httpContext, exception, CancellationToken.None);

            Assert.Equal(StatusCodes.Status403Forbidden, httpContext.Response.StatusCode);
        }

        [Fact]
        public void AdminQuoteRequestController_RequiresAdminOnlyPolicy()
        {
            var attr = typeof(AdminQuoteRequestController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .FirstOrDefault();

            Assert.NotNull(attr);
            Assert.Equal("AdminOnly", attr!.Policy);
        }

        private static ClaimsPrincipal BuildPrincipal(string userId, string role) =>
            new(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, role)
            }, "TestAuth"));

        private sealed class FakeQuoteRequestService : IQuoteRequestService
        {
            private readonly string? _ownerUserId;

            public FakeQuoteRequestService(string? ownerUserId) => _ownerUserId = ownerUserId;

            public Task<QuoteRequestDto> GetByIdAsync(string id, string currentUserId, bool isAdmin, CancellationToken ct = default)
            {
                QuoteStatusTransitionHelper.EnsureCanAccess(_ownerUserId, currentUserId, isAdmin);
                return Task.FromResult(new QuoteRequestDto { Id = id, UserId = _ownerUserId, Status = QuoteStatus.Pending });
            }

            public Task<CreateQuoteRequestResultDto> CreateAsync(CreateQuoteRequestDto dto, string? currentUserId, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<PagedQuoteRequestDto> GetMyQuotesAsync(string currentUserId, QuoteRequestQueryDto query, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<QuoteRequestDto> CancelByUserAsync(string id, string currentUserId, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<QuoteRequestDto> AcceptByUserAsync(string id, string currentUserId, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<PagedQuoteRequestDto> GetAdminQuotesAsync(QuoteRequestQueryDto query, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<QuoteRequestDto> UpdateStatusAsync(string id, UpdateQuoteStatusDto dto, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<QuoteRequestDto> UpdateQuotePriceAsync(string id, UpdateQuotePriceDto dto, string adminUserId, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<QuoteRequestDto> AssignAdminAsync(string id, AssignQuoteAdminDto dto, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<(string FilePath, string DownloadFileName, string ContentType)> ResolveLogoDownloadAsync(string quoteId, string storedFileName, string currentUserId, bool isAdmin, CancellationToken ct = default) =>
                throw new NotImplementedException();
        }

        private sealed class StubLogoUploadService : ILogoUploadService
        {
            public Task<List<LogoFileRefDto>> SaveLogosAsync(IReadOnlyList<IFormFile> files, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public Task<List<LogoFileRefDto>> SaveChatAttachmentsAsync(string roomId, IReadOnlyList<IFormFile> files, CancellationToken ct = default) =>
                throw new NotImplementedException();
            public string? ResolveExistingPath(string storedFileName) => null;
            public string? ResolveChatAttachmentPath(string roomId, string storedFileName) => null;
            public bool DeleteChatAttachment(string roomId, string storedFileName) => false;
            public string GetDownloadContentType(string storedFileName) => "application/octet-stream";
        }
    }
}

