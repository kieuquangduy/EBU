using System.Linq.Expressions;
using System.Text.Json;
using api.data;
using api.DTOs.quote;
using api.models.entities;
using api.models.enums;
using api.services.interfaces.auth;
using api.services.interfaces.notification;
using api.services.interfaces.quote;
using api.services.interfaces.shop;
using api.validators.shop;
using Microsoft.EntityFrameworkCore;

namespace api.services.implementations.quote
{
    public class QuoteRequestService : IQuoteRequestService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogoUploadService _logoUploadService;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly IShopContactService _shopContactService;
        private readonly IRfqWebhookService _webhookService;
        private readonly ILogger<QuoteRequestService> _logger;

        public QuoteRequestService(
            ApplicationDbContext context,
            ILogoUploadService logoUploadService,
            INotificationService notificationService,
            IEmailService emailService,
            IShopContactService shopContactService,
            IRfqWebhookService webhookService,
            ILogger<QuoteRequestService> logger)
        {
            _context = context;
            _logoUploadService = logoUploadService;
            _notificationService = notificationService;
            _emailService = emailService;
            _shopContactService = shopContactService;
            _webhookService = webhookService;
            _logger = logger;
        }

        private static readonly Expression<Func<QuoteRequest, QuoteRequestSummaryDto>> SummarySelector = q => new QuoteRequestSummaryDto
        {
            Id = q.Id,
            QuoteCode = q.QuoteCode,
            ProductId = q.ProductId,
            ProductName = q.Product != null ? q.Product.Name : null,
            ProductSlug = q.Product != null ? q.Product.Slug : null,
            ProductImageUrl = q.Product != null ? q.Product.ImageUrl : null,
            UserId = q.UserId,
            CustomerName = q.CustomerName,
            Phone = q.Phone,
            Email = q.Email,
            OrganizationName = q.OrganizationName,
            Quantity = q.Quantity,
            Material = q.Material,
            PrintTechnique = q.PrintTechnique,
            Status = q.Status,
            QuotedPrice = q.QuotedPrice,
            AssignedAdminId = q.AssignedAdminId,
            AssignedAdminName = q.AssignedAdmin != null
                ? (q.AssignedAdmin.FirstName + " " + q.AssignedAdmin.LastName).Trim()
                : null,
            ExpectedDeliveryDate = q.ExpectedDeliveryDate,
            CreatedAt = q.CreatedAt,
            UpdatedAt = q.UpdatedAt
        };

        public async Task<CreateQuoteRequestResultDto> CreateAsync(
            CreateQuoteRequestDto dto,
            string? currentUserId,
            CancellationToken ct = default)
        {
            Product? product = null;
            if (!string.IsNullOrWhiteSpace(dto.ProductId))
            {
                var productId = dto.ProductId.Trim();
                product = await _context.Products
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == productId && p.IsActive, ct)
                    ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm.");

                var minQty = product.MinOrderQuantity > 0 ? product.MinOrderQuantity : 1;
                if (dto.Quantity < minQty)
                {
                    throw new ArgumentException($"Số lượng tối thiểu cho mẫu áo này là {minQty}.");
                }
            }

            if (dto.LogoFiles is { Count: > 0 })
            {
                foreach (var logo in dto.LogoFiles)
                {
                    if (_logoUploadService.ResolveExistingPath(logo.FileName) is null)
                    {
                        throw new ArgumentException("File logo không tồn tại hoặc đã hết hạn.");
                    }
                }
            }

            var entity = new QuoteRequest
            {
                Id = Guid.NewGuid().ToString(),
                QuoteCode = QuoteStatusTransitionHelper.BuildQuoteCode(),
                ProductId = product?.Id,
                UserId = string.IsNullOrWhiteSpace(currentUserId) ? null : currentUserId,
                CustomerName = dto.CustomerName.Trim(),
                Phone = NormalizePhone(dto.Phone),
                Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
                OrganizationName = string.IsNullOrWhiteSpace(dto.OrganizationName) ? null : dto.OrganizationName.Trim(),
                Quantity = dto.Quantity,
                Material = string.IsNullOrWhiteSpace(dto.Material) ? null : dto.Material.Trim(),
                PrintTechnique = dto.PrintTechnique ?? PrintTechnique.Other,
                SizeBreakdownJson = dto.SizeBreakdown is { Count: > 0 }
                    ? JsonSerializer.Serialize(dto.SizeBreakdown)
                    : null,
                ColorSelection = string.IsNullOrWhiteSpace(dto.ColorSelection) ? null : dto.ColorSelection.Trim(),
                LogoFileUrlsJson = dto.LogoFiles is { Count: > 0 }
                    ? JsonSerializer.Serialize(dto.LogoFiles)
                    : null,
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                ExpectedDeliveryDate = null,
                Status = QuoteStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.QuoteRequests.Add(entity);
            await _context.SaveChangesAsync(ct);

            await DispatchCreatedNotificationsAsync(entity, product?.Name, ct);

            return new CreateQuoteRequestResultDto
            {
                Id = entity.Id,
                QuoteCode = entity.QuoteCode,
                Status = entity.Status,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<PagedQuoteRequestDto> GetMyQuotesAsync(
            string currentUserId,
            QuoteRequestQueryDto query,
            CancellationToken ct = default)
        {
            var baseQuery = _context.QuoteRequests
                .AsNoTracking()
                .Where(q => q.UserId == currentUserId);

            return await ToPagedResultAsync(ApplyFilters(baseQuery, query), query, ct);
        }

        public async Task<QuoteRequestDto> GetByIdAsync(
            string id,
            string currentUserId,
            bool isAdmin,
            CancellationToken ct = default)
        {
            var row = await _context.QuoteRequests
                .AsNoTracking()
                .Where(q => q.Id == id)
                .Select(q => new
                {
                    q.Id,
                    q.QuoteCode,
                    q.ProductId,
                    ProductName = q.Product != null ? q.Product.Name : null,
                    ProductSlug = q.Product != null ? q.Product.Slug : null,
                    ProductImageUrl = q.Product != null ? q.Product.ImageUrl : null,
                    q.UserId,
                    q.CustomerName,
                    q.Phone,
                    q.Email,
                    q.OrganizationName,
                    q.Quantity,
                    q.Material,
                    q.PrintTechnique,
                    q.SizeBreakdownJson,
                    q.ColorSelection,
                    q.LogoFileUrlsJson,
                    q.Note,
                    q.ExpectedDeliveryDate,
                    q.Status,
                    q.QuotedPrice,
                    q.QuotedNote,
                    q.InternalNote,
                    q.AssignedAdminId,
                    AssignedAdminName = q.AssignedAdmin != null
                        ? (q.AssignedAdmin.FirstName + " " + q.AssignedAdmin.LastName).Trim()
                        : null,
                    q.QuotedAt,
                    q.CreatedAt,
                    q.UpdatedAt
                })
                .FirstOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            QuoteStatusTransitionHelper.EnsureCanAccess(row.UserId, currentUserId, isAdmin);

            return new QuoteRequestDto
            {
                Id = row.Id,
                QuoteCode = row.QuoteCode,
                ProductId = row.ProductId,
                ProductName = row.ProductName,
                ProductSlug = row.ProductSlug,
                ProductImageUrl = row.ProductImageUrl,
                UserId = row.UserId,
                CustomerName = row.CustomerName,
                Phone = row.Phone,
                Email = row.Email,
                OrganizationName = row.OrganizationName,
                Quantity = row.Quantity,
                Material = row.Material,
                PrintTechnique = row.PrintTechnique,
                SizeBreakdown = QuoteStatusTransitionHelper.DeserializeSizeBreakdown(row.SizeBreakdownJson),
                ColorSelection = row.ColorSelection,
                LogoFiles = QuoteStatusTransitionHelper.DeserializeLogoFiles(row.LogoFileUrlsJson),
                Note = row.Note,
                ExpectedDeliveryDate = row.ExpectedDeliveryDate,
                Status = row.Status,
                QuotedPrice = row.QuotedPrice,
                QuotedNote = row.QuotedNote,
                InternalNote = isAdmin ? row.InternalNote : null,
                AssignedAdminId = row.AssignedAdminId,
                AssignedAdminName = row.AssignedAdminName,
                QuotedAt = row.QuotedAt,
                CreatedAt = row.CreatedAt,
                UpdatedAt = row.UpdatedAt
            };
        }

        public async Task<QuoteRequestDto> CancelByUserAsync(
            string id,
            string currentUserId,
            CancellationToken ct = default)
        {
            var entity = await _context.QuoteRequests.FirstOrDefaultAsync(q => q.Id == id, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            QuoteStatusTransitionHelper.EnsureCanAccess(entity.UserId, currentUserId, isAdmin: false);
            QuoteStatusTransitionHelper.EnsureTransitionAllowed(entity.Status, QuoteStatus.Cancelled, isCustomerAction: true);

            var previous = entity.Status;
            entity.Status = QuoteStatus.Cancelled;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            await TryNotifyStatusChangedAsync(entity, previous, QuoteStatus.Cancelled, ct);

            return await GetByIdAsync(id, currentUserId, isAdmin: false, ct);
        }

        public async Task<PagedQuoteRequestDto> GetAdminQuotesAsync(
            QuoteRequestQueryDto query,
            CancellationToken ct = default)
        {
            var baseQuery = _context.QuoteRequests.AsNoTracking();
            return await ToPagedResultAsync(ApplyFilters(baseQuery, query), query, ct);
        }

        public async Task<QuoteRequestDto> UpdateStatusAsync(
            string id,
            UpdateQuoteStatusDto dto,
            CancellationToken ct = default)
        {
            var entity = await _context.QuoteRequests.FirstOrDefaultAsync(q => q.Id == id, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            QuoteStatusTransitionHelper.EnsureTransitionAllowed(entity.Status, dto.Status);

            var previous = entity.Status;
            entity.Status = dto.Status;
            if (dto.InternalNote != null)
            {
                entity.InternalNote = string.IsNullOrWhiteSpace(dto.InternalNote) ? null : dto.InternalNote.Trim();
            }
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            await TryNotifyStatusChangedAsync(entity, previous, dto.Status, ct);

            return await GetByIdAsync(id, string.Empty, isAdmin: true, ct);
        }

        public async Task<QuoteRequestDto> UpdateQuotePriceAsync(
            string id,
            UpdateQuotePriceDto dto,
            string adminUserId,
            CancellationToken ct = default)
        {
            var entity = await _context.QuoteRequests.FirstOrDefaultAsync(q => q.Id == id, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            QuoteStatusTransitionHelper.EnsureTransitionAllowed(entity.Status, QuoteStatus.Quoted);

            var previous = entity.Status;
            entity.QuotedPrice = dto.QuotedPrice;
            entity.QuotedNote = string.IsNullOrWhiteSpace(dto.QuotedNote) ? null : dto.QuotedNote.Trim();
            if (dto.InternalNote != null)
            {
                entity.InternalNote = string.IsNullOrWhiteSpace(dto.InternalNote) ? null : dto.InternalNote.Trim();
            }
            if (dto.PrintTechnique.HasValue)
            {
                entity.PrintTechnique = dto.PrintTechnique.Value;
            }
            if (dto.ExpectedDeliveryDate.HasValue)
            {
                entity.ExpectedDeliveryDate = dto.ExpectedDeliveryDate.Value;
            }

            if (string.IsNullOrWhiteSpace(entity.AssignedAdminId) && !string.IsNullOrWhiteSpace(adminUserId))
            {
                entity.AssignedAdminId = adminUserId;
            }

            entity.Status = QuoteStatus.Quoted;
            entity.QuotedAt = DateTime.UtcNow;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            await TryNotifyStatusChangedAsync(entity, previous, QuoteStatus.Quoted, ct);
            await TrySendQuotePricedEmailAsync(entity, ct);

            return await GetByIdAsync(id, adminUserId, isAdmin: true, ct);
        }

        public async Task<QuoteRequestDto> AssignAdminAsync(
            string id,
            AssignQuoteAdminDto dto,
            CancellationToken ct = default)
        {
            var entity = await _context.QuoteRequests.FirstOrDefaultAsync(q => q.Id == id, ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            if (!string.IsNullOrWhiteSpace(dto.AssignedAdminId))
            {
                var adminId = dto.AssignedAdminId.Trim();
                var adminExists = await _context.Users
                    .AsNoTracking()
                    .AnyAsync(u => u.Id == adminId && u.Role == Role.Admin, ct);

                if (!adminExists)
                {
                    throw new KeyNotFoundException("Không tìm thấy tài khoản Admin để phân công.");
                }

                entity.AssignedAdminId = adminId;
            }
            else
            {
                entity.AssignedAdminId = null;
            }

            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);

            return await GetByIdAsync(id, string.Empty, isAdmin: true, ct);
        }

        public async Task<(string FilePath, string DownloadFileName, string ContentType)> ResolveLogoDownloadAsync(
            string quoteId,
            string storedFileName,
            string currentUserId,
            bool isAdmin,
            CancellationToken ct = default)
        {
            var row = await _context.QuoteRequests
                .AsNoTracking()
                .Where(q => q.Id == quoteId)
                .Select(q => new { q.UserId, q.LogoFileUrlsJson })
                .FirstOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu báo giá.");

            QuoteStatusTransitionHelper.EnsureCanAccess(row.UserId, currentUserId, isAdmin);

            var logos = QuoteStatusTransitionHelper.DeserializeLogoFiles(row.LogoFileUrlsJson);
            var matched = logos.FirstOrDefault(l =>
                string.Equals(l.FileName, storedFileName, StringComparison.OrdinalIgnoreCase))
                ?? throw new KeyNotFoundException("Không tìm thấy file logo thuộc yêu cầu báo giá này.");

            var physicalPath = _logoUploadService.ResolveExistingPath(matched.FileName)
                ?? throw new KeyNotFoundException("File logo không tồn tại trên hệ thống.");

            var downloadName = string.IsNullOrWhiteSpace(matched.OriginalName)
                ? matched.FileName
                : matched.OriginalName;

            return (
                physicalPath,
                downloadName,
                _logoUploadService.GetDownloadContentType(matched.FileName));
        }

        private static IQueryable<QuoteRequest> ApplyFilters(IQueryable<QuoteRequest> source, QuoteRequestQueryDto query)
        {
            if (!string.IsNullOrWhiteSpace(query.StatusGroup))
            {
                var group = query.StatusGroup.Trim().ToLowerInvariant();
                source = group switch
                {
                    "pending" => source.Where(q => q.Status == QuoteStatus.Pending || q.Status == QuoteStatus.Contacted || q.Status == QuoteStatus.Quoted),
                    "accepted" => source.Where(q => q.Status == QuoteStatus.Accepted || q.Status == QuoteStatus.InProduction),
                    "completed" => source.Where(q => q.Status == QuoteStatus.Completed),
                    "cancelled" => source.Where(q => q.Status == QuoteStatus.Cancelled || q.Status == QuoteStatus.Rejected),
                    _ => source
                };
            }
            else if (query.Status.HasValue)
            {
                source = source.Where(q => q.Status == query.Status.Value);
            }

            if (query.FromDate.HasValue)
            {
                var from = query.FromDate.Value.Date;
                source = source.Where(q => q.CreatedAt >= from);
            }

            if (query.ToDate.HasValue)
            {
                var toExclusive = query.ToDate.Value.Date.AddDays(1);
                source = source.Where(q => q.CreatedAt < toExclusive);
            }

            if (!string.IsNullOrWhiteSpace(query.AssignedAdminId))
            {
                var adminId = query.AssignedAdminId.Trim();
                source = source.Where(q => q.AssignedAdminId == adminId);
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var keyword = query.Search.Trim();
                source = source.Where(q =>
                    q.QuoteCode.Contains(keyword) ||
                    q.CustomerName.Contains(keyword) ||
                    q.Phone.Contains(keyword) ||
                    (q.OrganizationName != null && q.OrganizationName.Contains(keyword)));
            }

            return source;
        }

        private static async Task<PagedQuoteRequestDto> ToPagedResultAsync(
            IQueryable<QuoteRequest> query,
            QuoteRequestQueryDto paging,
            CancellationToken ct)
        {
            var page = Math.Max(paging.Page, 1);
            var pageSize = Math.Clamp(paging.PageSize, 1, 100);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(q => q.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(SummarySelector)
                .ToListAsync(ct);

            return new PagedQuoteRequestDto
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        private static string NormalizePhone(string raw)
        {
            var digits = UpdateShopContactDtoValidator.NormalizePhoneDigits(raw);
            return digits.StartsWith("+84", StringComparison.Ordinal) ? "0" + digits[3..] : digits;
        }

        private async Task DispatchCreatedNotificationsAsync(
            QuoteRequest quote,
            string? productName,
            CancellationToken ct)
        {
            try
            {
                await _notificationService.NotifyQuoteCreatedAsync(quote.Id, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR/DB notification failed for new RFQ {QuoteCode}", quote.QuoteCode);
            }

            try
            {
                var contact = await _shopContactService.GetAsync(ct);
                if (!string.IsNullOrWhiteSpace(contact.Email))
                {
                    await _emailService.SendQuoteCreatedAdminNotificationAsync(
                        contact.Email,
                        quote.QuoteCode,
                        quote.CustomerName,
                        quote.Phone,
                        quote.Quantity,
                        productName);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email notification skipped/failed locally for new RFQ {QuoteCode}", quote.QuoteCode);
            }

            await _webhookService.NotifyQuoteCreatedAsync(quote, ct);
        }

        private async Task TryNotifyStatusChangedAsync(
            QuoteRequest quote,
            QuoteStatus previous,
            QuoteStatus next,
            CancellationToken ct)
        {
            if (previous == next && next != QuoteStatus.Quoted)
            {
                return;
            }

            try
            {
                await _notificationService.NotifyQuoteStatusChangedAsync(quote.Id, previous, next, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notification failed when updating RFQ {QuoteCode}", quote.QuoteCode);
            }
        }

        private async Task TrySendQuotePricedEmailAsync(QuoteRequest quote, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(quote.Email) || !quote.QuotedPrice.HasValue)
            {
                return;
            }

            try
            {
                await _emailService.SendQuotePricedCustomerAsync(
                    quote.Email,
                    quote.CustomerName,
                    quote.QuoteCode,
                    quote.QuotedPrice.Value,
                    quote.QuotedNote);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Customer quote email skipped/failed locally for {QuoteCode}", quote.QuoteCode);
            }
        }
    }
}

