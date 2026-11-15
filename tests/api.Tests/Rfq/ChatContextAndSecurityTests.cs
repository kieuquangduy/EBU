using System.Security.Claims;
using api.controllers.chat;
using api.DTOs.chat;
using api.services.implementations.chat;
using api.services.implementations.quote;
using api.services.interfaces.chat;
using api.validators.chat;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace api.Tests.Rfq
{
    public class ChatContextAndSecurityTests
    {
        [Theory]
        [InlineData("<script>alert(1)</script>Xin chào", "Xin chào")]
        [InlineData("Mẫu áo <img src=x onerror=alert(1)> đẹp", "Mẫu áo  đẹp")]
        [InlineData("<svg onload=alert(1)>test</svg>", "")]
        [InlineData("javascript:alert(1) báo giá", "alert(1) báo giá")]
        public void SanitizeMessage_StripsXssPayloads(string input, string expected)
        {
            var result = ChatContentSanitizer.SanitizeMessage(input);

            Assert.DoesNotContain("<script", result, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror=", result, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("javascript:", result, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(expected.Trim(), result);
        }

        [Fact]
        public void SanitizeMessage_PreservesPlainVietnameseTextAndComparisons()
        {
            const string text = "Áo lớp 30 cái giá < 200k, size S/M/L";
            var result = ChatContentSanitizer.SanitizeMessage(text);

            Assert.Equal(text, result);
        }

        [Fact]
        public void SanitizeAttachments_FiltersUnsafeUrls_StripsPathTraversal_AndCapsAtFive()
        {
            var inputs = new List<ChatAttachmentDto>
            {
                new() { Url = "javascript:alert(1)", Name = "bad.png" },
                new() { Url = "http://insecure.example.com/a.png", Name = "http.png" },
                new() { Url = "/api/quote-requests/../secret", Name = "traversal.png" },
                new() { Url = "https://cdn.example.com/1.png", Name = "../../logo1.png", SizeBytes = 1024 },
                new() { Url = "/api/quote-requests/q1/logos/2.png", Name = "logo2.png", SizeBytes = 2048 },
                new() { Url = "https://cdn.example.com/3.png", Name = "logo3.png" },
                new() { Url = "https://cdn.example.com/4.png", Name = "logo4.png" },
                new() { Url = "https://cdn.example.com/5.png", Name = "logo5.png" },
                new() { Url = "https://cdn.example.com/6.png", Name = "logo6.png" }
            };

            var result = ChatContentSanitizer.SanitizeAttachments(inputs);

            Assert.NotNull(result);
            Assert.Equal(5, result!.Count);
            Assert.Equal("logo1.png", result[0].Name);
            Assert.All(result, a => Assert.True(
                a.Url.StartsWith("https://", StringComparison.Ordinal) ||
                a.Url.StartsWith("/api/", StringComparison.Ordinal)));
        }

        [Fact]
        public void SendChatMessageValidator_RejectsUnsafeAttachmentUrl()
        {
            var validator = new SendChatMessageDtoValidator();
            var dto = new SendChatMessageDto
            {
                ChatRoomId = "room-1",
                Message = "Gửi file logo",
                Attachments = new List<ChatAttachmentDto>
                {
                    new() { Url = "javascript:alert(1)", Name = "evil.svg" }
                }
            };

            var validation = validator.Validate(dto);
            Assert.False(validation.IsValid);
        }

        [Fact]
        public void SendChatMessageValidator_AcceptsAttachmentWithoutText()
        {
            var validator = new SendChatMessageDtoValidator();
            var validation = validator.Validate(new SendChatMessageDto
            {
                ChatRoomId = "room-1",
                Message = "",
                Attachments = new List<ChatAttachmentDto>
                {
                    new()
                    {
                        Url = "/api/chat/rooms/room-1/attachments/file.png",
                        Name = "file.png",
                        ContentType = "image/png",
                        SizeBytes = 1024
                    }
                }
            });

            Assert.True(validation.IsValid);
        }

        [Fact]
        public async Task StartSupportChat_ForwardsProductAndQuoteContext()
        {
            var fakeService = new FakeChatService();
            var controller = new ChatController(fakeService, new StartSupportChatDtoValidator(), CreateFileService());
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, "user-1") },
                        "Test"))
                }
            };

            var action = await controller.StartSupportChat(new StartSupportChatDto
            {
                ProductId = "prod-1",
                QuoteRequestId = "quote-1",
                InitialMessage = "Tư vấn mẫu này 30 áo"
            }, CancellationToken.None);

            var ok = Assert.IsType<OkObjectResult>(action.Result);
            var room = Assert.IsType<ChatRoomDto>(ok.Value);
            Assert.Equal("prod-1", room.ProductId);
            Assert.Equal("quote-1", room.QuoteRequestId);
        }

        [Fact]
        public async Task GetSupportAvailability_ReturnsOnlineAndUnreadStatus()
        {
            var fakeService = new FakeChatService();
            var controller = new ChatController(fakeService, new StartSupportChatDtoValidator(), CreateFileService());
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.NameIdentifier, "user-1") },
                        "Test"))
                }
            };

            var action = await controller.GetSupportAvailability(CancellationToken.None);

            var ok = Assert.IsType<OkObjectResult>(action.Result);
            var availability = Assert.IsType<SupportAvailabilityDto>(ok.Value);
            Assert.True(availability.IsAdminOnline);
            Assert.Equal(2, availability.OnlineAdminCount);
            Assert.Equal(3, availability.UnreadCount);
        }

        private sealed class FakeChatService : IChatService
        {
            public Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, string? subject, CancellationToken ct = default)
                => GetOrCreateSupportRoomAsync(customerId, new StartSupportChatDto { Subject = subject }, ct);

            public Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, StartSupportChatDto dto, CancellationToken ct = default)
                => Task.FromResult(new ChatRoomDto
                {
                    Id = "room-1",
                    CustomerId = customerId,
                    ProductId = dto.ProductId,
                    QuoteRequestId = dto.QuoteRequestId
                });

            public Task<SupportAvailabilityDto> GetSupportAvailabilityAsync(string userId, CancellationToken ct = default)
                => Task.FromResult(new SupportAvailabilityDto
                {
                    IsAdminOnline = true,
                    OnlineAdminCount = 2,
                    UnreadCount = 3,
                    WorkingHours = "08:00 - 21:00"
                });

            public Task<ChatRoomDto> GetOrCreateAiRoomAsync(string customerId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<IReadOnlyList<ChatRoomDto>> GetRoomsAsync(string userId, bool isAdmin, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(string roomId, string userId, bool isAdmin, int take = 50, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ChatMessageDto> SendMessageAsync(string roomId, string senderId, bool isAdmin, string message, string messageType = "Text", CancellationToken ct = default, IReadOnlyList<ChatAttachmentDto>? attachments = null) => throw new NotImplementedException();
            public Task<ChatMessageDto> SendAiCustomerMessageAsync(string roomId, string senderId, string message, string messageType = "Text", CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ChatMessageDto> SendAssistantMessageAsync(string roomId, string message, CancellationToken ct = default) => throw new NotImplementedException();
            public Task EscalateToHumanAsync(string roomId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task MarkAsReadAsync(string roomId, string readerId, bool isAdmin, CancellationToken ct = default) => throw new NotImplementedException();
            public Task EnsureCanAccessRoomAsync(string roomId, string userId, bool isAdmin, CancellationToken ct = default) => throw new NotImplementedException();
        }

        private static LocalLogoUploadService CreateFileService() =>
            new(Path.Combine(Path.GetTempPath(), "haushop-chat-controller-tests"));
    }
}

