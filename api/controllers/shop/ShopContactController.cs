using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using api.common;
using api.DTOs.shop;
using api.services.interfaces.shop;

namespace api.controllers.shop
{
    [ApiController]
    public class ShopContactController : ControllerBase
    {
        private readonly IShopContactService _service;
        private readonly IValidator<UpdateShopContactDto> _updateValidator;

        public ShopContactController(
            IShopContactService service,
            IValidator<UpdateShopContactDto> updateValidator)
        {
            _service = service;
            _updateValidator = updateValidator;
        }

        [HttpGet("api/shop-contact")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ShopContactDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublic(CancellationToken ct)
        {
            var result = await _service.GetAsync(ct);
            return Ok(result);
        }

        [HttpPut("api/admin/shop-contact")]
        [Authorize(Policy = "AdminOnly")]
        [ProducesResponseType(typeof(ShopContactDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateAdmin(
            [FromBody] UpdateShopContactDto dto,
            CancellationToken ct)
        {
            var validation = await _updateValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            var result = await _service.UpdateAsync(dto, ct);
            return Ok(result);
        }
    }
}

