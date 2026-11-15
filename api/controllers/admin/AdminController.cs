using api.DTOs.admin;
using api.DTOs.product;
using api.common;
using api.services.interfaces.admin;
using api.services.interfaces.quote;
using api.data;
using api.DTOs.quote;
using api.services.implementations.quote;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace api.controllers.admin
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminDashboardService _dashboardService;
        private readonly IAdminManagementService _managementService;
        private readonly IValidator<CreateProductDto> _createProductValidator;
        private readonly IValidator<UpdateProductDto> _updateProductValidator;
        private readonly IValidator<AdminCreateOrderFromQuoteDto> _createOrderFromQuoteValidator;
        private readonly IValidator<AdminCreateManualOrderDto> _createManualOrderValidator;

        public AdminController(
            IAdminDashboardService dashboardService,
            IAdminManagementService managementService,
            IValidator<CreateProductDto> createProductValidator,
            IValidator<UpdateProductDto> updateProductValidator,
            IValidator<AdminCreateOrderFromQuoteDto> createOrderFromQuoteValidator,
            IValidator<AdminCreateManualOrderDto> createManualOrderValidator)
        {
            _dashboardService = dashboardService;
            _managementService = managementService;
            _createProductValidator = createProductValidator;
            _updateProductValidator = updateProductValidator;
            _createOrderFromQuoteValidator = createOrderFromQuoteValidator;
            _createManualOrderValidator = createManualOrderValidator;
        }

        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(AdminDashboardDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetDashboard(
            [FromQuery] int lowStockThreshold = 5,
            [FromQuery] int recentOrdersLimit = 5,
            CancellationToken ct = default)
        {
            var result = await _dashboardService.GetDashboardAsync(
                lowStockThreshold,
                recentOrdersLimit,
                ct);

            return Ok(result);
        }

        [HttpGet("users")]
        [ProducesResponseType(typeof(AdminPagedResultDto<AdminUserListItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? search = null,
            [FromQuery] string? role = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            var result = await _managementService.GetUsersAsync(search, role, page, pageSize, ct);
            return Ok(result);
        }

        [HttpGet("users/{userId}")]
        [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetUserById(string userId, CancellationToken ct)
        {
            try
            {
                var result = await _managementService.GetUserByIdAsync(userId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpPut("users/{userId}")]
        [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUser(
            string userId,
            [FromBody] AdminUpdateUserDto dto,
            CancellationToken ct)
        {
            try
            {
                var result = await _managementService.UpdateUserAsync(userId, dto, ct);
                return Ok(result);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpPatch("users/{userId}/role")]
        [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateUserRole(
            string userId,
            [FromBody] AdminUpdateUserRoleDto dto,
            CancellationToken ct)
        {
            try
            {
                var result = await _managementService.UpdateUserRoleAsync(userId, dto, ct);
                return Ok(result);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpDelete("users/{userId}")]
        public async Task<IActionResult> DeleteUser(string userId, CancellationToken ct)
        {
            try
            {
                await _managementService.DeleteUserAsync(userId, ct);
                return Ok(new { message = "Đã xóa tài khoản thành công" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpGet("orders")]
        [ProducesResponseType(typeof(AdminPagedResultDto<AdminOrderListItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOrders(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            var result = await _managementService.GetOrdersAsync(search, status, page, pageSize, ct);
            return Ok(result);
        }

        [HttpGet("orders/{orderId}")]
        [ProducesResponseType(typeof(AdminOrderDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetOrderById(string orderId, CancellationToken ct)
        {
            try
            {
                var result = await _managementService.GetOrderByIdAsync(orderId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpPut("orders/{orderId}/details")]
        public async Task<IActionResult> UpdateOrderDetails(
            string orderId,
            [FromBody] AdminUpdateOrderDetailsDto dto,
            [FromServices] IValidator<AdminUpdateOrderDetailsDto> validator,
            CancellationToken ct)
        {
            var validation = await validator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            return Ok(await _managementService.UpdateOrderDetailsAsync(orderId, dto, User.GetUserId(), ct));
        }

        [HttpPost("orders/{orderId}/files")]
        [RequestSizeLimit(110 * 1024 * 1024)]
        public async Task<IActionResult> UploadOrderFiles(
            string orderId,
            [FromForm] List<IFormFile> files,
            [FromServices] ApplicationDbContext context,
            [FromServices] ILogoUploadService uploadService,
            CancellationToken ct)
        {
            var order = await context.Orders.FirstOrDefaultAsync(item => item.Id == orderId, ct)
                ?? throw new KeyNotFoundException("Order not found");
            var existing = QuoteStatusTransitionHelper.DeserializeLogoFiles(order.CustomFilesJson);
            var uploaded = await uploadService.SaveChatAttachmentsAsync($"order-{orderId}", files, ct);
            existing.AddRange(uploaded);
            order.CustomFilesJson = JsonSerializer.Serialize(existing);
            order.Updated = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
            return Ok(existing);
        }

        [HttpGet("orders/{orderId}/files/{fileName}")]
        public async Task<IActionResult> DownloadOrderFile(
            string orderId,
            string fileName,
            [FromServices] ApplicationDbContext context,
            [FromServices] ILogoUploadService uploadService,
            CancellationToken ct)
        {
            var json = await context.Orders.AsNoTracking()
                .Where(order => order.Id == orderId)
                .Select(order => order.CustomFilesJson)
                .FirstOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException("Order not found");
            var file = QuoteStatusTransitionHelper.DeserializeLogoFiles(json)
                .FirstOrDefault(item => string.Equals(item.FileName, fileName, StringComparison.OrdinalIgnoreCase))
                ?? throw new KeyNotFoundException("File not found");
            var path = uploadService.ResolveChatAttachmentPath($"order-{orderId}", file.FileName)
                ?? throw new KeyNotFoundException("File not found");
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            return PhysicalFile(path, uploadService.GetDownloadContentType(file.FileName), file.OriginalName);
        }

        [HttpPatch("orders/{orderId}/status")]
        [ProducesResponseType(typeof(AdminOrderDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateOrderStatus(
            string orderId,
            [FromBody] AdminUpdateOrderStatusDto dto,
            CancellationToken ct)
        {
            var result = await _managementService.UpdateOrderStatusAsync(orderId, dto, ct);
            return Ok(result);
        }

        [HttpPost("orders/from-quote/{quoteRequestId}")]
        [ProducesResponseType(typeof(AdminOrderDetailDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateOrderFromQuote(
            string quoteRequestId,
            [FromBody] AdminCreateOrderFromQuoteDto dto,
            CancellationToken ct)
        {
            var validation = await _createOrderFromQuoteValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            try
            {
                var result = await _managementService.CreateOrderFromQuoteAsync(
                    quoteRequestId,
                    dto,
                    User.GetUserId(),
                    ct);
                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
            catch (InvalidOperationException)
            {
                return Conflict(new { message = "Yêu cầu báo giá không hợp lệ để tạo đơn hàng hoặc đã tồn tại đơn hàng." });
            }
        }

        [HttpPost("orders")]
        [ProducesResponseType(typeof(AdminOrderDetailDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateManualOrder(
            [FromBody] AdminCreateManualOrderDto dto,
            CancellationToken ct)
        {
            var validation = await _createManualOrderValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            try
            {
                var result = await _managementService.CreateManualOrderAsync(dto, User.GetUserId(), ct);
                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
        }

        [HttpPatch("orders/{orderId}/payment-status")]
        [ProducesResponseType(typeof(AdminOrderDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateOrderPaymentStatus(
            string orderId,
            [FromBody] AdminUpdateOrderPaymentDto dto,
            CancellationToken ct)
        {
            try
            {
                var result = await _managementService.UpdateOrderPaymentStatusAsync(orderId, dto, User.GetUserId(), ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpGet("products")]
        [ProducesResponseType(typeof(AdminPagedResultDto<ProductSummaryDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProducts(
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            var result = await _managementService.GetProductsAsync(search, isActive, page, pageSize, ct);
            return Ok(result);
        }

        [HttpGet("products/{productId}")]
        [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetProductById(string productId, CancellationToken ct)
        {
            try
            {
                var result = await _managementService.GetProductByIdAsync(productId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpPost("products")]
        [ProducesResponseType(typeof(ProductDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateProduct(
            [FromBody] CreateProductDto dto,
            CancellationToken ct)
        {
            var validation = await _createProductValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            try
            {
                var result = await _managementService.CreateProductAsync(dto, ct);
                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
            catch (InvalidOperationException)
            {
                return BadRequest(new { message = ClientErrorMessages.CannotProcessDetail });
            }
        }

        [HttpPut("products/{productId}")]
        [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateProduct(
            string productId,
            [FromBody] UpdateProductDto dto,
            CancellationToken ct)
        {
            var validation = await _updateProductValidator.ValidateAsync(dto, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));
            }

            try
            {
                var result = await _managementService.UpdateProductAsync(productId, dto, ct);
                return Ok(result);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
            catch (InvalidOperationException)
            {
                return BadRequest(new { message = ClientErrorMessages.CannotProcessDetail });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpDelete("products/{productId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteProduct(string productId, CancellationToken ct)
        {
            try
            {
                await _managementService.DeleteProductAsync(productId, ct);
                return Ok(new { message = "Product deleted successfully" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpPatch("products/{productId}/toggle-active")]
        [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleProductActive(string productId, CancellationToken ct)
        {
            try
            {
                var result = await _managementService.ToggleProductActiveAsync(productId, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = ClientErrorMessages.NotFoundDetail });
            }
        }

        [HttpGet("settings")]
        [ProducesResponseType(typeof(AdminSettingsDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSettings(CancellationToken ct = default)
        {
            var result = await _managementService.GetSettingsAsync(ct);
            return Ok(result);
        }

        [HttpPut("settings")]
        [ProducesResponseType(typeof(AdminSettingsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateSettings(
            [FromBody] UpdateAdminSettingsDto dto,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _managementService.UpdateSettingsAsync(dto, ct);
                return Ok(result);
            }
            catch (ArgumentException)
            {
                return BadRequest(new { message = ClientErrorMessages.InvalidRequestDetail });
            }
        }
    }
}
