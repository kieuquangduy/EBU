using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using api.common;
using api.DTOs.quote;
using api.middlewares;
using api.services.interfaces.quote;

namespace api.controllers.quote
{
    [ApiController]
    [Route("api/quote-requests")]
    public class QuoteRequestController : ControllerBase
    {
        private readonly IQuoteRequestService _quoteService;
        private readonly ILogoUploadService _logoUploadService;
        private readonly IValidator<CreateQuoteRequestDto> _createValidator;

        public QuoteRequestController(
            IQuoteRequestService quoteService,
            ILogoUploadService logoUploadService,
            IValidator<CreateQuoteRequestDto> createValidator)
        {
            _quoteService = quoteService;
            _logoUploadService = logoUploadService;
            _createValidator = createValidator;
        }

        [HttpPost]
        [AllowAnonymous]
        [RfqRateLimit(PermitLimit = 8, WindowSeconds = 600)]
        [ProducesResponseType(typeof(CreateQuoteRequestResultDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> Create(
            [FromBody] CreateQuoteRequestDto dto,
            CancellationToken ct)
        {
            var validation = await _createValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            var currentUserId = User?.Identity?.IsAuthenticated == true ? User.GetUserId() : null;
            var result = await _quoteService.CreateAsync(dto, currentUserId, ct);
            return StatusCode(StatusCodes.Status201Created, result);
        }

        [HttpPost("logos")]
        [AllowAnonymous]
        [RfqRateLimit(PermitLimit = 10, WindowSeconds = 600)]
        [RequestSizeLimit(55 * 1024 * 1024)] // 5 files x 10MB + multipart overhead
        [ProducesResponseType(typeof(List<LogoFileRefDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UploadLogos(
            [FromForm] List<IFormFile> files,
            CancellationToken ct)
        {
            var uploaded = await _logoUploadService.SaveLogosAsync(files, ct);
            return Ok(uploaded);
        }

        [HttpGet("me")]
        [Authorize]
        [ProducesResponseType(typeof(PagedQuoteRequestDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMine(
            [FromQuery] QuoteRequestQueryDto query,
            CancellationToken ct)
        {
            var userId = User.GetUserId();
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ApiAuthenticationException("Missing user identifier.");
            }

            var result = await _quoteService.GetMyQuotesAsync(userId, query, ct);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id, CancellationToken ct)
        {
            var userId = User.GetUserId();
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ApiAuthenticationException("Missing user identifier.");
            }

            var result = await _quoteService.GetByIdAsync(id, userId, User.IsAdmin(), ct);
            return Ok(result);
        }

        [HttpPatch("{id}/cancel")]
        [Authorize]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Cancel(string id, CancellationToken ct)
        {
            var userId = User.GetUserId();
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ApiAuthenticationException("Missing user identifier.");
            }

            var result = await _quoteService.CancelByUserAsync(id, userId, ct);
            return Ok(result);
        }

        [HttpGet("{id}/logos/{fileName}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DownloadLogo(string id, string fileName, CancellationToken ct)
        {
            var userId = User.GetUserId();
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ApiAuthenticationException("Missing user identifier.");
            }

            var (physicalPath, downloadFileName, contentType) =
                await _quoteService.ResolveLogoDownloadAsync(id, fileName, userId, User.IsAdmin(), ct);

            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return PhysicalFile(physicalPath, contentType, downloadFileName);
        }
    }
}

