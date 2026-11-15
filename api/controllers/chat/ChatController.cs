using System.Security.Claims;
using api.DTOs.chat;
using api.common;
using api.services.interfaces.chat;
using api.services.interfaces.quote;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.controllers.chat
{
    [ApiController]
    [Route("api/chat")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IValidator<StartSupportChatDto> _startSupportChatValidator;
        private readonly ILogoUploadService _fileUploadService;

        public ChatController(
            IChatService chatService,
            IValidator<StartSupportChatDto> startSupportChatValidator,
            ILogoUploadService fileUploadService)
        {
            _chatService = chatService;
            _startSupportChatValidator = startSupportChatValidator;
            _fileUploadService = fileUploadService;
        }

        [HttpPost("support/start")]
        public async Task<ActionResult<ChatRoomDto>> StartSupportChat([FromBody] StartSupportChatDto dto, CancellationToken ct)
        {
            var validation = await _startSupportChatValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            var room = await _chatService.GetOrCreateSupportRoomAsync(GetUserId(), dto, ct);
            return Ok(room);
        }

        [HttpGet("support/availability")]
        public async Task<ActionResult<SupportAvailabilityDto>> GetSupportAvailability(CancellationToken ct)
        {
            var availability = await _chatService.GetSupportAvailabilityAsync(GetUserId(), ct);
            return Ok(availability);
        }

        [HttpPost("ai/start")]
        public async Task<ActionResult<ChatRoomDto>> StartAiChat(CancellationToken ct)
        {
            var room = await _chatService.GetOrCreateAiRoomAsync(GetUserId(), ct);
            return Ok(room);
        }

        [HttpGet("rooms")]
        public async Task<ActionResult<IReadOnlyList<ChatRoomDto>>> GetRooms(CancellationToken ct)
        {
            var rooms = await _chatService.GetRoomsAsync(GetUserId(), User.IsInRole("Admin"), ct);
            return Ok(rooms);
        }

        [HttpGet("rooms/{roomId}/messages")]
        public async Task<ActionResult<IReadOnlyList<ChatMessageDto>>> GetMessages(
            string roomId,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            var messages = await _chatService.GetMessagesAsync(roomId, GetUserId(), User.IsInRole("Admin"), take, ct);
            return Ok(messages);
        }

        [HttpPost("rooms/{roomId}/read")]
        public async Task<IActionResult> MarkAsRead(string roomId, CancellationToken ct)
        {
            await _chatService.MarkAsReadAsync(roomId, GetUserId(), User.IsInRole("Admin"), ct);
            return NoContent();
        }

        [HttpPost("rooms/{roomId}/attachments")]
        [RequestSizeLimit(55 * 1024 * 1024)]
        public async Task<ActionResult<List<ChatAttachmentDto>>> UploadAttachments(
            string roomId,
            [FromForm] List<IFormFile> files,
            CancellationToken ct)
        {
            await _chatService.EnsureCanAccessRoomAsync(roomId, GetUserId(), User.IsInRole("Admin"), ct);
            var uploaded = await _fileUploadService.SaveChatAttachmentsAsync(roomId, files, ct);
            var attachments = uploaded.Select(file => new ChatAttachmentDto
            {
                Url = $"/api/chat/rooms/{Uri.EscapeDataString(roomId)}/attachments/{Uri.EscapeDataString(file.FileName)}",
                Name = file.OriginalName,
                ContentType = file.ContentType,
                SizeBytes = file.SizeBytes
            }).ToList();

            return Ok(attachments);
        }

        [HttpGet("rooms/{roomId}/attachments/{fileName}")]
        public async Task<IActionResult> DownloadAttachment(
            string roomId,
            string fileName,
            CancellationToken ct)
        {
            await _chatService.EnsureCanAccessRoomAsync(roomId, GetUserId(), User.IsInRole("Admin"), ct);
            var physicalPath = _fileUploadService.ResolveChatAttachmentPath(roomId, fileName);
            if (physicalPath is null)
            {
                return NotFound();
            }

            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return PhysicalFile(physicalPath, _fileUploadService.GetDownloadContentType(fileName));
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? throw new ApiAuthenticationException("User is not authenticated.");
        }
    }
}
