using System.Text.Json;
using api.common;
using api.data;
using api.DTOs.admin;
using api.DTOs.quote;
using api.services.implementations.quote;
using api.services.interfaces.admin;
using api.services.interfaces.quote;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.controllers.order;

[ApiController]
[Route("api/order-management")]
[Authorize(Roles = "Admin,Merchant")]
public class OrderManagementController : ControllerBase
{
    private readonly IAdminManagementService _managementService;

    public OrderManagementController(IAdminManagementService managementService) =>
        _managementService = managementService;

    [HttpGet]
    public async Task<AdminPagedResultDto<AdminOrderListItemDto>> GetOrders(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default) =>
        await _managementService.GetOrdersAsync(search, status, page, pageSize, ct);

    [HttpGet("{orderId}")]
    public async Task<AdminOrderDetailDto> GetOrder(string orderId, CancellationToken ct) =>
        await _managementService.GetOrderByIdAsync(orderId, ct);

    [HttpPost]
    public async Task<IActionResult> CreateManualOrder(
        [FromBody] AdminCreateManualOrderDto dto,
        [FromServices] IValidator<AdminCreateManualOrderDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));

        var result = await _managementService.CreateManualOrderAsync(dto, User.GetUserId(), ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{orderId}/details")]
    public async Task<IActionResult> UpdateDetails(
        string orderId,
        [FromBody] AdminUpdateOrderDetailsDto dto,
        [FromServices] IValidator<AdminUpdateOrderDetailsDto> validator,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return ValidationProblem(new ValidationProblemDetails(validation.ToClientSafeDictionary()));

        return Ok(await _managementService.UpdateOrderDetailsAsync(orderId, dto, User.GetUserId(), ct));
    }

    [HttpPatch("{orderId}/status")]
    public async Task<AdminOrderDetailDto> UpdateStatus(
        string orderId,
        [FromBody] AdminUpdateOrderStatusDto dto,
        CancellationToken ct) =>
        await _managementService.UpdateOrderStatusAsync(orderId, dto, ct);

    [HttpPatch("{orderId}/payment-status")]
    public async Task<AdminOrderDetailDto> UpdatePaymentStatus(
        string orderId,
        [FromBody] AdminUpdateOrderPaymentDto dto,
        CancellationToken ct) =>
        await _managementService.UpdateOrderPaymentStatusAsync(orderId, dto, User.GetUserId(), ct);

    [HttpPost("{orderId}/files")]
    [RequestSizeLimit(110 * 1024 * 1024)]
    public async Task<List<LogoFileRefDto>> UploadFiles(
        string orderId,
        [FromForm] List<IFormFile> files,
        [FromServices] ApplicationDbContext context,
        [FromServices] ILogoUploadService uploadService,
        CancellationToken ct)
    {
        var order = await context.Orders.FirstOrDefaultAsync(item => item.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found");
        var existing = QuoteStatusTransitionHelper.DeserializeLogoFiles(order.CustomFilesJson);
        existing.AddRange(await uploadService.SaveChatAttachmentsAsync($"order-{orderId}", files, ct));
        order.CustomFilesJson = JsonSerializer.Serialize(existing);
        order.Updated = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);
        return existing;
    }

    [HttpGet("{orderId}/files/{fileName}")]
    public async Task<IActionResult> DownloadFile(
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

    [HttpDelete("{orderId}/files/{fileName}")]
    public async Task<List<LogoFileRefDto>> DeleteFile(
        string orderId,
        string fileName,
        [FromServices] ApplicationDbContext context,
        [FromServices] ILogoUploadService uploadService,
        CancellationToken ct)
    {
        var order = await context.Orders.FirstOrDefaultAsync(item => item.Id == orderId, ct)
            ?? throw new KeyNotFoundException("Order not found");
        var files = QuoteStatusTransitionHelper.DeserializeLogoFiles(order.CustomFilesJson);
        var file = files.FirstOrDefault(item =>
            string.Equals(item.FileName, fileName, StringComparison.OrdinalIgnoreCase))
            ?? throw new KeyNotFoundException("File not found");

        files.Remove(file);
        order.CustomFilesJson = JsonSerializer.Serialize(files);
        order.Updated = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);
        uploadService.DeleteChatAttachment($"order-{orderId}", file.FileName);
        return files;
    }
}
