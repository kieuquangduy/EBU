using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using api.common;
using api.DTOs.quote;
using api.services.interfaces.quote;

namespace api.controllers.quote
{
    [ApiController]
    [Route("api/admin/quote-requests")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminQuoteRequestController : ControllerBase
    {
        private readonly IQuoteRequestService _quoteService;
        private readonly IValidator<UpdateQuoteStatusDto> _statusValidator;
        private readonly IValidator<UpdateQuotePriceDto> _priceValidator;

        public AdminQuoteRequestController(
            IQuoteRequestService quoteService,
            IValidator<UpdateQuoteStatusDto> statusValidator,
            IValidator<UpdateQuotePriceDto> priceValidator)
        {
            _quoteService = quoteService;
            _statusValidator = statusValidator;
            _priceValidator = priceValidator;
        }

        [HttpGet]
        [ProducesResponseType(typeof(PagedQuoteRequestDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] QuoteRequestQueryDto query, CancellationToken ct)
        {
            var result = await _quoteService.GetAdminQuotesAsync(query, ct);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string id, CancellationToken ct)
        {
            var adminId = User.GetUserId() ?? string.Empty;
            var result = await _quoteService.GetByIdAsync(id, adminId, isAdmin: true, ct);
            return Ok(result);
        }

        [HttpPatch("{id}/status")]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateStatus(
            string id,
            [FromBody] UpdateQuoteStatusDto dto,
            CancellationToken ct)
        {
            var validation = await _statusValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            var result = await _quoteService.UpdateStatusAsync(id, dto, ct);
            return Ok(result);
        }

        [HttpPut("{id}/quote")]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateQuotePrice(
            string id,
            [FromBody] UpdateQuotePriceDto dto,
            CancellationToken ct)
        {
            var validation = await _priceValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            var adminId = User.GetUserId() ?? string.Empty;
            var result = await _quoteService.UpdateQuotePriceAsync(id, dto, adminId, ct);
            return Ok(result);
        }

        [HttpPatch("{id}/assign")]
        [ProducesResponseType(typeof(QuoteRequestDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AssignAdmin(
            string id,
            [FromBody] AssignQuoteAdminDto dto,
            CancellationToken ct)
        {
            var result = await _quoteService.AssignAdminAsync(id, dto, ct);
            return Ok(result);
        }
    }
}

