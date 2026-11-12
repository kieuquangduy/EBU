using System.Text.Json;
using api.data;
using api.DTOs.chat;
using api.common;
using api.models.entities;
using api.models.enums;
using api.services.interfaces.chat;
using Microsoft.EntityFrameworkCore;

namespace api.services.implementations.chat
{
    public class ChatService : IChatService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
        private readonly ApplicationDbContext _context;

        public ChatService(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, string? subject, CancellationToken ct = default)
        {
            return GetOrCreateSupportRoomAsync(customerId, new StartSupportChatDto { Subject = subject }, ct);
        }

        public async Task<ChatRoomDto> GetOrCreateSupportRoomAsync(string customerId, StartSupportChatDto dto, CancellationToken ct = default)
        {
            dto ??= new StartSupportChatDto();
            var subject = ChatContentSanitizer.SanitizeSubject(dto.Subject, "Tư vấn áo custom");
            return await GetOrCreateRoomAsync(
                customerId,
                subject,
                ChatRoomType.Support,
                "Support",
                dto.ProductId,
                dto.QuoteRequestId,
                dto.InitialMessage,
                ct);
        }

        public Task<ChatRoomDto> GetOrCreateAiRoomAsync(string customerId, CancellationToken ct = default)
        {
            return GetOrCreateRoomAsync(customerId, "AI assistant", ChatRoomType.AiSupport, "AI", null, null, null, ct);
        }

        private async Task<ChatRoomDto> GetOrCreateRoomAsync(
            string customerId,
            string subject,
            ChatRoomType roomType,
            string roomPrefix,
            string? productId,
            string? quoteRequestId,
            string? initialMessage,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(customerId))
            {
                throw new ApiAuthenticationException("User is not authenticated.");
            }

            var customer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == customerId, ct)
                ?? throw new KeyNotFoundException("Customer not found");

            Product? contextProduct = null;
            if (!string.IsNullOrWhiteSpace(productId))
            {
                contextProduct = await _context.Products
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == productId.Trim(), ct)
                    ?? throw new KeyNotFoundException("Product not found");
            }

            QuoteRequest? contextQuote = null;
            if (!string.IsNullOrWhiteSpace(quoteRequestId))
            {
                contextQuote = await _context.QuoteRequests
                    .AsNoTracking()
                    .FirstOrDefaultAsync(q => q.Id == quoteRequestId.Trim(), ct)
                    ?? throw new KeyNotFoundException("Quote request not found");

                if (contextQuote.UserId != customerId)
                {
                    throw new ForbiddenAccessException("You cannot link another user's quote request.");
                }
            }

            var existingTicket = await _context.SupportTickets
                .Include(t => t.ChatRoom)
                .Where(t => t.CustomerId == customerId
                    && t.Status != SupportTicketStatus.Closed
                    && t.ChatRoom.Type == roomType)
                .OrderByDescending(t => t.Created)
                .FirstOrDefaultAsync(ct);

            string roomId;
            bool shouldInsertProductCard = false;

            if (existingTicket is not null)
            {
                roomId = existingTicket.ChatRoomId;

                if (contextProduct is not null && existingTicket.ProductId != contextProduct.Id)
                {
                    existingTicket.ProductId = contextProduct.Id;
                    existingTicket.ChatRoom.ProductId = contextProduct.Id;
                    shouldInsertProductCard = true;
                }

                if (contextQuote is not null && existingTicket.QuoteRequestId != contextQuote.Id)
                {
                    existingTicket.QuoteRequestId = contextQuote.Id;
                    existingTicket.ChatRoom.QuoteRequestId = contextQuote.Id;
                }
            }
            else
            {
                var room = new ChatRoom
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = $"{roomPrefix} - {BuildFullName(customer)}",
                    IsPrivate = true,
                    Type = roomType,
                    ProductId = contextProduct?.Id,
                    QuoteRequestId = contextQuote?.Id,
                    Created = DateTime.UtcNow
                };

                var ticket = new SupportTicket
                {
                    Id = Guid.NewGuid().ToString(),
                    CustomerId = customerId,
                    ChatRoomId = room.Id,
                    ProductId = contextProduct?.Id,
                    QuoteRequestId = contextQuote?.Id,
                    Subject = contextProduct is not null && subject == "Tư vấn áo custom"
                        ? $"Tư vấn: {contextProduct.Name}"
                        : subject,
                    Status = SupportTicketStatus.Open,
                    Priority = roomType == ChatRoomType.AiSupport ? SupportTicketPriority.Low : SupportTicketPriority.Medium,
                    Created = DateTime.UtcNow
                };

                _context.ChatRooms.Add(room);
                _context.SupportTickets.Add(ticket);
                roomId = room.Id;
                shouldInsertProductCard = contextProduct is not null;
            }

            if (shouldInsertProductCard && contextProduct is not null)
            {
                var cardPayload = new ChatProductCardDto
                {
                    ProductId = contextProduct.Id,
                    Name = contextProduct.Name,
                    Slug = contextProduct.Slug,
                    ImageUrl = contextProduct.ImageUrl,
                    BasePrice = contextProduct.BasePrice > 0 ? contextProduct.BasePrice : contextProduct.Price,
                    OriginalPrice = contextProduct.OriginalPrice,
                    DiscountPercent = contextProduct.DiscountPercent,
                    MinOrderQuantity = contextProduct.MinOrderQuantity
                };

                _context.ChatMessages.Add(new ChatMessage
                {
                    Id = Guid.NewGuid().ToString(),
                    ChatRoomId = roomId,
                    SenderId = customerId,
                    Message = $"Quan tâm sản phẩm: {contextProduct.Name}",
                    MessageType = ChatMessageType.System,
                    MetadataJson = JsonSerializer.Serialize(cardPayload, JsonOptions),
                    IsRead = false,
                    Created = DateTime.UtcNow
                });
            }

            var sanitizedInitial = ChatContentSanitizer.SanitizeMessage(initialMessage);
            if (!string.IsNullOrWhiteSpace(sanitizedInitial))
            {
                _context.ChatMessages.Add(new ChatMessage
                {
                    Id = Guid.NewGuid().ToString(),
                    ChatRoomId = roomId,
                    SenderId = customerId,
                    Message = sanitizedInitial,
                    MessageType = ChatMessageType.Text,
                    IsRead = false,
                    Created = DateTime.UtcNow.AddMilliseconds(5)
                });
            }

            await _context.SaveChangesAsync(ct);

            return await MapRoomAsync(roomId, customerId, ct);
        }

        public async Task<IReadOnlyList<ChatRoomDto>> GetRoomsAsync(string userId, bool isAdmin, CancellationToken ct = default)
        {
            var query = _context.SupportTickets
                .AsNoTracking()
                .Where(t => t.ChatRoom.Type == ChatRoomType.Support && !t.Subject.StartsWith("AI"));

            if (!isAdmin)
            {
                query = query.Where(t => t.CustomerId == userId);
            }

            var rows = await query
                .OrderByDescending(t => t.ChatRoom.Messages.Max(m => (DateTime?)m.Created) ?? t.Created)
                .Take(100)
                .Select(t => new
                {
                    t.ChatRoomId,
                    RoomName = t.ChatRoom.Name,
                    RoomType = t.ChatRoom.Type,
                    t.CustomerId,
                    CustomerFirstName = t.Customer.FirstName,
                    CustomerLastName = t.Customer.LastName,
                    CustomerEmail = t.Customer.Email,
                    CustomerAvatar = t.Customer.Avatar,
                    CustomerPhone = t.Customer.PhoneNumber,
                    CustomerIsOnline = t.Customer.IsOnline,
                    CustomerLastSeen = t.Customer.LastSeen,
                    t.AssignedToId,
                    ProductId = t.ProductId ?? t.ChatRoom.ProductId,
                    ProductName = t.Product != null ? t.Product.Name : (t.ChatRoom.Product != null ? t.ChatRoom.Product.Name : null),
                    ProductSlug = t.Product != null ? t.Product.Slug : (t.ChatRoom.Product != null ? t.ChatRoom.Product.Slug : null),
                    QuoteRequestId = t.QuoteRequestId ?? t.ChatRoom.QuoteRequestId,
                    QuoteCode = t.QuoteRequest != null ? t.QuoteRequest.QuoteCode : (t.ChatRoom.QuoteRequest != null ? t.ChatRoom.QuoteRequest.QuoteCode : null),
                    t.Status,
                    t.Priority,
                    t.Created,
                    t.ClosedAt,
                    UnreadCount = t.ChatRoom.Messages.Count(m => !m.IsRead && m.SenderId != userId),
                    LastMessage = t.ChatRoom.Messages
                        .OrderByDescending(m => m.Created)
                        .Select(m => new
                        {
                            m.Id,
                            m.ChatRoomId,
                            m.SenderId,
                            SenderFirstName = m.Sender.FirstName,
                            SenderLastName = m.Sender.LastName,
                            SenderEmail = m.Sender.Email,
                            SenderAvatar = m.Sender.Avatar,
                            SenderRole = m.Sender.Role,
                            m.Message,
                            m.MessageType,
                            m.AttachmentsJson,
                            m.MetadataJson,
                            m.IsRead,
                            m.ReadAt,
                            m.Created
                        })
                        .FirstOrDefault()
                })
                .ToListAsync(ct);

            return rows.Select(row => new ChatRoomDto
            {
                Id = row.ChatRoomId,
                Name = row.RoomName,
                Type = row.RoomType.ToString(),
                CustomerId = row.CustomerId,
                CustomerName = BuildFullName(row.CustomerFirstName, row.CustomerLastName, row.CustomerEmail),
                CustomerEmail = row.CustomerEmail,
                CustomerAvatar = row.CustomerAvatar,
                CustomerPhone = row.CustomerPhone,
                CustomerIsOnline = row.CustomerIsOnline,
                CustomerLastSeen = row.CustomerLastSeen,
                AssignedToId = row.AssignedToId,
                ProductId = row.ProductId,
                ProductName = row.ProductName,
                ProductSlug = row.ProductSlug,
                QuoteRequestId = row.QuoteRequestId,
                QuoteCode = row.QuoteCode,
                Status = row.Status.ToString(),
                Priority = row.Priority.ToString(),
                UnreadCount = row.UnreadCount,
                LastMessage = row.LastMessage is null ? null : new ChatMessageDto
                {
                    Id = row.LastMessage.Id,
                    ChatRoomId = row.LastMessage.ChatRoomId,
                    SenderId = row.LastMessage.SenderId,
                    SenderName = BuildFullName(
                        row.LastMessage.SenderFirstName,
                        row.LastMessage.SenderLastName,
                        row.LastMessage.SenderEmail),
                    SenderAvatar = row.LastMessage.SenderAvatar,
                    SenderRole = row.LastMessage.SenderRole.ToString(),
                    Message = row.LastMessage.Message,
                    MessageType = row.LastMessage.MessageType.ToString(),
                    Attachments = DeserializeAttachments(row.LastMessage.AttachmentsJson),
                    ProductCard = DeserializeProductCard(row.LastMessage.MetadataJson),
                    IsRead = row.LastMessage.IsRead,
                    ReadAt = row.LastMessage.ReadAt,
                    Created = row.LastMessage.Created
                },
                Created = row.Created,
                ClosedAt = row.ClosedAt
            }).ToList();
        }

        public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(string roomId, string userId, bool isAdmin, int take = 50, CancellationToken ct = default)
        {
            await EnsureCanAccessRoomAsync(roomId, userId, isAdmin, ct);

            take = Math.Clamp(take, 1, 100);
            var messages = await _context.ChatMessages
                .AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.ChatRoomId == roomId)
                .OrderByDescending(m => m.Created)
                .Take(take)
                .OrderBy(m => m.Created)
                .ToListAsync(ct);

            return messages.Select(MapMessage).ToList();
        }

        public async Task<ChatMessageDto> SendMessageAsync(
            string roomId,
            string senderId,
            bool isAdmin,
            string message,
            string messageType = "Text",
            CancellationToken ct = default,
            IReadOnlyList<ChatAttachmentDto>? attachments = null)
        {
            await EnsureCanAccessRoomAsync(roomId, senderId, isAdmin, ct);

            var sanitizedAttachments = ChatContentSanitizer.SanitizeAttachments(attachments);
            var normalizedMessage = ChatContentSanitizer.SanitizeMessage(message);

            if (string.IsNullOrWhiteSpace(normalizedMessage))
            {
                if (sanitizedAttachments is null || sanitizedAttachments.Count == 0)
                {
                    throw new ArgumentException("Nội dung tin nhắn không hợp lệ.");
                }

                normalizedMessage = "[Tệp đính kèm]";
            }

            if (!Enum.TryParse<ChatMessageType>(messageType, true, out var parsedType))
            {
                throw new InvalidOperationException("Message type is invalid.");
            }

            var room = await _context.ChatRooms.FirstOrDefaultAsync(r => r.Id == roomId, ct)
                ?? throw new KeyNotFoundException("Chat room not found");

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderId, ct)
                ?? throw new KeyNotFoundException("Sender not found");

            if (room.Type != ChatRoomType.Support)
            {
                throw new InvalidOperationException("Only support chat rooms are supported.");
            }

            var chatMessage = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                ChatRoomId = roomId,
                SenderId = senderId,
                Message = normalizedMessage,
                MessageType = parsedType,
                AttachmentsJson = sanitizedAttachments is null ? null : JsonSerializer.Serialize(sanitizedAttachments, JsonOptions),
                IsRead = false,
                Created = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);

            if (isAdmin)
            {
                var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.ChatRoomId == roomId, ct);
                if (ticket is not null && string.IsNullOrWhiteSpace(ticket.AssignedToId))
                {
                    ticket.AssignedToId = senderId;
                }
            }

            await _context.SaveChangesAsync(ct);

            chatMessage.Sender = sender;
            return MapMessage(chatMessage);
        }

        public async Task<ChatMessageDto> SendAiCustomerMessageAsync(string roomId, string senderId, string message, string messageType = "Text", CancellationToken ct = default)
        {
            await EnsureCanAccessRoomAsync(roomId, senderId, false, ct);

            var normalizedMessage = ChatContentSanitizer.SanitizeMessage(message);
            if (string.IsNullOrWhiteSpace(normalizedMessage))
            {
                throw new ArgumentException("Nội dung tin nhắn không hợp lệ.");
            }

            if (!Enum.TryParse<ChatMessageType>(messageType, true, out var parsedType))
            {
                throw new InvalidOperationException("Message type is invalid.");
            }

            var room = await _context.ChatRooms.FirstOrDefaultAsync(r => r.Id == roomId, ct)
                ?? throw new KeyNotFoundException("Chat room not found");

            if (room.Type != ChatRoomType.AiSupport)
            {
                throw new InvalidOperationException("Only AI chat rooms are supported.");
            }

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderId, ct)
                ?? throw new KeyNotFoundException("Sender not found");

            var chatMessage = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                ChatRoomId = roomId,
                SenderId = senderId,
                Message = normalizedMessage,
                MessageType = parsedType,
                IsRead = false,
                Created = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync(ct);

            chatMessage.Sender = sender;
            return MapMessage(chatMessage);
        }

        public async Task<ChatMessageDto> SendAssistantMessageAsync(string roomId, string message, CancellationToken ct = default)
        {
            var ticket = await _context.SupportTickets
                .Include(t => t.ChatRoom)
                .FirstOrDefaultAsync(t => t.ChatRoomId == roomId && t.Status != SupportTicketStatus.Closed, ct)
                ?? throw new KeyNotFoundException("Support ticket not found");

            if (ticket.ChatRoom.Type != ChatRoomType.AiSupport)
            {
                throw new InvalidOperationException("Assistant messages can only be sent to AI chat rooms.");
            }

            var assistant = await GetOrCreateAssistantUserAsync(ct);

            var normalizedMessage = ChatContentSanitizer.SanitizeMessage(message);
            if (string.IsNullOrWhiteSpace(normalizedMessage))
            {
                throw new InvalidOperationException("Assistant message could not be created.");
            }

            var chatMessage = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                ChatRoomId = roomId,
                SenderId = assistant.Id,
                Message = normalizedMessage,
                MessageType = ChatMessageType.Text,
                IsRead = false,
                Created = DateTime.UtcNow
            };

            if (ticket.Status == SupportTicketStatus.Open)
            {
                ticket.Status = SupportTicketStatus.InProgress;
            }

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync(ct);

            chatMessage.Sender = assistant;
            return MapMessage(chatMessage);
        }

        public async Task EscalateToHumanAsync(string roomId, CancellationToken ct = default)
        {
            var ticket = await _context.SupportTickets.FirstOrDefaultAsync(t => t.ChatRoomId == roomId, ct)
                ?? throw new KeyNotFoundException("Support ticket not found");

            ticket.Status = SupportTicketStatus.Waiting;
            ticket.Priority = SupportTicketPriority.High;
            await _context.SaveChangesAsync(ct);
        }

        public async Task MarkAsReadAsync(string roomId, string readerId, bool isAdmin, CancellationToken ct = default)
        {
            await EnsureCanAccessRoomAsync(roomId, readerId, isAdmin, ct);

            var unread = await _context.ChatMessages
                .Where(m => m.ChatRoomId == roomId && m.SenderId != readerId && !m.IsRead)
                .ToListAsync(ct);

            if (unread.Count == 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            foreach (var message in unread)
            {
                message.IsRead = true;
                message.ReadAt = now;
            }

            await _context.SaveChangesAsync(ct);
        }

        public async Task EnsureCanAccessRoomAsync(string roomId, string userId, bool isAdmin, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(roomId))
            {
                throw new ArgumentException("Chat room id is required.");
            }

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ApiAuthenticationException("User is not authenticated.");
            }

            var ticket = await _context.SupportTickets
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.ChatRoomId == roomId, ct)
                ?? throw new KeyNotFoundException("Support ticket not found");

            if (!isAdmin && ticket.CustomerId != userId)
            {
                throw new ForbiddenAccessException("You cannot access this chat room.");
            }

            if (ticket.Status == SupportTicketStatus.Closed)
            {
                throw new InvalidOperationException("This support chat is closed.");
            }
        }

        public async Task<SupportAvailabilityDto> GetSupportAvailabilityAsync(string userId, CancellationToken ct = default)
        {
            var onlineAdminCount = await _context.Users
                .AsNoTracking()
                .CountAsync(u => u.Role == Role.Admin && u.IsOnline && u.Id != "hau-ai-assistant", ct);

            var unreadCount = await _context.ChatMessages
                .AsNoTracking()
                .Where(m =>
                    !m.IsRead &&
                    m.SenderId != userId &&
                    m.ChatRoom.Type == ChatRoomType.Support &&
                    m.ChatRoom.SupportTicket != null &&
                    m.ChatRoom.SupportTicket.CustomerId == userId &&
                    m.ChatRoom.SupportTicket.Status != SupportTicketStatus.Closed)
                .CountAsync(ct);

            var workingHours = await _context.ShopContacts
                .AsNoTracking()
                .Select(c => c.WorkingHours)
                .FirstOrDefaultAsync(ct);

            return new SupportAvailabilityDto
            {
                IsAdminOnline = onlineAdminCount > 0,
                OnlineAdminCount = onlineAdminCount,
                UnreadCount = unreadCount,
                WorkingHours = workingHours
            };
        }

        private async Task<ChatRoomDto> MapRoomAsync(string roomId, string userId, CancellationToken ct)
        {
            var row = await _context.SupportTickets
                .AsNoTracking()
                .Where(t => t.ChatRoomId == roomId)
                .Select(t => new
                {
                    t.ChatRoomId,
                    RoomName = t.ChatRoom.Name,
                    RoomType = t.ChatRoom.Type,
                    t.CustomerId,
                    CustomerFirstName = t.Customer.FirstName,
                    CustomerLastName = t.Customer.LastName,
                    CustomerEmail = t.Customer.Email,
                    CustomerAvatar = t.Customer.Avatar,
                    CustomerPhone = t.Customer.PhoneNumber,
                    CustomerIsOnline = t.Customer.IsOnline,
                    CustomerLastSeen = t.Customer.LastSeen,
                    t.AssignedToId,
                    ProductId = t.ProductId ?? t.ChatRoom.ProductId,
                    ProductName = t.Product != null ? t.Product.Name : (t.ChatRoom.Product != null ? t.ChatRoom.Product.Name : null),
                    ProductSlug = t.Product != null ? t.Product.Slug : (t.ChatRoom.Product != null ? t.ChatRoom.Product.Slug : null),
                    QuoteRequestId = t.QuoteRequestId ?? t.ChatRoom.QuoteRequestId,
                    QuoteCode = t.QuoteRequest != null ? t.QuoteRequest.QuoteCode : (t.ChatRoom.QuoteRequest != null ? t.ChatRoom.QuoteRequest.QuoteCode : null),
                    t.Status,
                    t.Priority,
                    t.Created,
                    t.ClosedAt,
                    UnreadCount = t.ChatRoom.Messages.Count(m => !m.IsRead && m.SenderId != userId),
                    LastMessage = t.ChatRoom.Messages
                        .OrderByDescending(m => m.Created)
                        .Select(m => new
                        {
                            m.Id,
                            m.ChatRoomId,
                            m.SenderId,
                            SenderFirstName = m.Sender.FirstName,
                            SenderLastName = m.Sender.LastName,
                            SenderEmail = m.Sender.Email,
                            SenderAvatar = m.Sender.Avatar,
                            SenderRole = m.Sender.Role,
                            m.Message,
                            m.MessageType,
                            m.AttachmentsJson,
                            m.MetadataJson,
                            m.IsRead,
                            m.ReadAt,
                            m.Created
                        })
                        .FirstOrDefault()
                })
                .FirstOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException("Support ticket not found");

            return new ChatRoomDto
            {
                Id = row.ChatRoomId,
                Name = row.RoomName,
                Type = row.RoomType.ToString(),
                CustomerId = row.CustomerId,
                CustomerName = BuildFullName(row.CustomerFirstName, row.CustomerLastName, row.CustomerEmail),
                CustomerEmail = row.CustomerEmail,
                CustomerAvatar = row.CustomerAvatar,
                CustomerPhone = row.CustomerPhone,
                CustomerIsOnline = row.CustomerIsOnline,
                CustomerLastSeen = row.CustomerLastSeen,
                AssignedToId = row.AssignedToId,
                ProductId = row.ProductId,
                ProductName = row.ProductName,
                ProductSlug = row.ProductSlug,
                QuoteRequestId = row.QuoteRequestId,
                QuoteCode = row.QuoteCode,
                Status = row.Status.ToString(),
                Priority = row.Priority.ToString(),
                UnreadCount = row.UnreadCount,
                LastMessage = row.LastMessage is null ? null : new ChatMessageDto
                {
                    Id = row.LastMessage.Id,
                    ChatRoomId = row.LastMessage.ChatRoomId,
                    SenderId = row.LastMessage.SenderId,
                    SenderName = BuildFullName(
                        row.LastMessage.SenderFirstName,
                        row.LastMessage.SenderLastName,
                        row.LastMessage.SenderEmail),
                    SenderAvatar = row.LastMessage.SenderAvatar,
                    SenderRole = row.LastMessage.SenderRole.ToString(),
                    Message = row.LastMessage.Message,
                    MessageType = row.LastMessage.MessageType.ToString(),
                    Attachments = DeserializeAttachments(row.LastMessage.AttachmentsJson),
                    ProductCard = DeserializeProductCard(row.LastMessage.MetadataJson),
                    IsRead = row.LastMessage.IsRead,
                    ReadAt = row.LastMessage.ReadAt,
                    Created = row.LastMessage.Created
                },
                Created = row.Created,
                ClosedAt = row.ClosedAt
            };
        }

        private static ChatMessageDto MapMessage(ChatMessage message)
        {
            return new ChatMessageDto
            {
                Id = message.Id,
                ChatRoomId = message.ChatRoomId,
                SenderId = message.SenderId,
                SenderName = BuildFullName(message.Sender),
                SenderAvatar = message.Sender.Avatar,
                SenderRole = message.Sender.Role.ToString(),
                Message = message.Message,
                MessageType = message.MessageType.ToString(),
                Attachments = DeserializeAttachments(message.AttachmentsJson),
                ProductCard = DeserializeProductCard(message.MetadataJson),
                IsRead = message.IsRead,
                ReadAt = message.ReadAt,
                Created = message.Created
            };
        }

        private static List<ChatAttachmentDto>? DeserializeAttachments(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            try
            {
                return JsonSerializer.Deserialize<List<ChatAttachmentDto>>(json, JsonOptions);
            }
            catch
            {
                return null;
            }
        }

        private static ChatProductCardDto? DeserializeProductCard(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return null;
            }

            try
            {
                return JsonSerializer.Deserialize<ChatProductCardDto>(json, JsonOptions);
            }
            catch
            {
                return null;
            }
        }

        private static string BuildFullName(string? firstName, string? lastName, string email)
        {
            var fullName = $"{firstName} {lastName}".Trim();
            return string.IsNullOrWhiteSpace(fullName) ? email : fullName;
        }

        private static string BuildFullName(User user) =>
            BuildFullName(user.FirstName, user.LastName, user.Email);

        private async Task<User> GetOrCreateAssistantUserAsync(CancellationToken ct)
        {
            const string assistantId = "hau-ai-assistant";
            var assistant = await _context.Users.FirstOrDefaultAsync(u => u.Id == assistantId, ct);
            if (assistant is not null)
            {
                return assistant;
            }

            assistant = new User
            {
                Id = assistantId,
                Email = "ai-assistant@haushop.local",
                PhoneNumber = string.Empty,
                FirstName = "HauShop AI",
                LastName = string.Empty,
                PasswordHash = string.Empty,
                Provider = Provider.Local,
                Role = Role.Admin,
                IsOnline = true,
                Created = DateTime.UtcNow
            };

            _context.Users.Add(assistant);
            await _context.SaveChangesAsync(ct);
            return assistant;
        }
    }
}
