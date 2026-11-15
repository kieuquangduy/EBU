using System.Text.RegularExpressions;
using api.data;
using api.DTOs.admin;
using api.DTOs.order;
using api.DTOs.product;
using api.mappings;
using api.models.entities;
using api.models.enums;
using api.services.interfaces.admin;
using api.services.interfaces.cloud;
using api.services.interfaces.notification;
using api.services.implementations.quote;
using Microsoft.EntityFrameworkCore;

namespace api.services.implementations.admin
{
    public class AdminManagementService : IAdminManagementService
    {
        private readonly ApplicationDbContext _context;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly INotificationService _notificationService;
        private readonly ILogger<AdminManagementService> _logger;

        private static readonly Dictionary<string, string> VietnameseMap = new()
        {
            {"à","a"},{"á","a"},{"ả","a"},{"ã","a"},{"ạ","a"},
            {"ă","a"},{"ằ","a"},{"ắ","a"},{"ẳ","a"},{"ẵ","a"},{"ặ","a"},
            {"â","a"},{"ầ","a"},{"ấ","a"},{"ẩ","a"},{"ẫ","a"},{"ậ","a"},
            {"đ","d"},
            {"è","e"},{"é","e"},{"ẻ","e"},{"ẽ","e"},{"ẹ","e"},
            {"ê","e"},{"ề","e"},{"ế","e"},{"ể","e"},{"ễ","e"},{"ệ","e"},
            {"ì","i"},{"í","i"},{"ỉ","i"},{"ĩ","i"},{"ị","i"},
            {"ò","o"},{"ó","o"},{"ỏ","o"},{"õ","o"},{"ọ","o"},
            {"ô","o"},{"ồ","o"},{"ố","o"},{"ổ","o"},{"ỗ","o"},{"ộ","o"},
            {"ơ","o"},{"ờ","o"},{"ớ","o"},{"ở","o"},{"ỡ","o"},{"ợ","o"},
            {"ù","u"},{"ú","u"},{"ủ","u"},{"ũ","u"},{"ụ","u"},
            {"ư","u"},{"ừ","u"},{"ứ","u"},{"ử","u"},{"ữ","u"},{"ự","u"},
            {"ỳ","y"},{"ý","y"},{"ỷ","y"},{"ỹ","y"},{"ỵ","y"},
        };

        public AdminManagementService(
            ApplicationDbContext context,
            ICloudinaryService cloudinaryService,
            INotificationService notificationService,
            ILogger<AdminManagementService> logger)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<AdminPagedResultDto<AdminUserListItemDto>> GetUsersAsync(
            string? search = null,
            string? role = null,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Users.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim();
                query = query.Where(u =>
                    u.Email.Contains(normalizedSearch) ||
                    u.FirstName.Contains(normalizedSearch) ||
                    (u.LastName != null && u.LastName.Contains(normalizedSearch)) ||
                    (u.PhoneNumber != null && u.PhoneNumber.Contains(normalizedSearch)));
            }

            if (!string.IsNullOrWhiteSpace(role) &&
                Enum.TryParse<Role>(role, true, out var parsedRole))
            {
                query = query.Where(u => u.Role == parsedRole);
            }

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(u => u.Created)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AdminUserListItemDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    FullName = ((u.FirstName ?? string.Empty) + " " + (u.LastName ?? string.Empty)).Trim(),
                    PhoneNumber = u.PhoneNumber,
                    Role = u.Role.ToString(),
                    MerchantId = u.MerchantId,
                    IsOnline = u.IsOnline,
                    Created = u.Created,
                    LastSeen = u.LastSeen
                })
                .ToListAsync(ct);

            return new AdminPagedResultDto<AdminUserListItemDto>
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task DeleteUserAsync(string userId, CancellationToken ct = default)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new KeyNotFoundException("User not found");
            _context.Users.Remove(user);
            await _context.SaveChangesAsync(ct);
        }

        public async Task<AdminUserDetailDto> GetUserByIdAsync(string userId, CancellationToken ct = default)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new KeyNotFoundException("User not found");

            var orderStats = await _context.Orders
                .AsNoTracking()
                .Where(o => o.UserId == userId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalOrders = g.Count(),
                    TotalSpent = g.Sum(x => x.Total),
                    LastOrderAt = g.Max(x => (DateTime?)x.Created)
                })
                .FirstOrDefaultAsync(ct);

            var quoteStats = await _context.QuoteRequests
                .AsNoTracking()
                .Where(q => q.UserId == userId)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalQuotes = g.Count(),
                    LastQuoteAt = g.Max(x => (DateTime?)x.CreatedAt)
                })
                .FirstOrDefaultAsync(ct);

            var recentQuotes = await _context.QuoteRequests
                .AsNoTracking()
                .Where(q => q.UserId == userId)
                .OrderByDescending(q => q.CreatedAt)
                .Take(5)
                .Select(q => new AdminRecentQuoteDto
                {
                    Id = q.Id,
                    QuoteCode = q.QuoteCode,
                    CustomerName = q.CustomerName,
                    Phone = q.Phone,
                    OrganizationName = q.OrganizationName,
                    ProductName = q.Product != null ? q.Product.Name : null,
                    Quantity = q.Quantity,
                    QuotedPrice = q.QuotedPrice,
                    Status = q.Status.ToString(),
                    CreatedAt = q.CreatedAt
                })
                .ToListAsync(ct);

            return new AdminUserDetailDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = ((user.FirstName ?? string.Empty) + " " + (user.LastName ?? string.Empty)).Trim(),
                PhoneNumber = user.PhoneNumber,
                Role = user.Role.ToString(),
                MerchantId = user.MerchantId,
                IsOnline = user.IsOnline,
                Created = user.Created,
                LastSeen = user.LastSeen,
                TotalOrders = orderStats?.TotalOrders ?? 0,
                TotalSpent = orderStats?.TotalSpent ?? 0m,
                LastOrderAt = orderStats?.LastOrderAt,
                RecentOrders = await _context.Orders.AsNoTracking().Where(o => o.UserId == userId).OrderByDescending(o => o.Created).Take(5).Select(o => new RecentOrderDto { Id = o.Id, CustomerName = ((user.FirstName ?? string.Empty) + " " + (user.LastName ?? string.Empty)).Trim(), TotalAmount = o.Total, Status = o.Status.ToString(), Created = o.Created }).ToListAsync(ct),
                TotalQuoteRequests = quoteStats?.TotalQuotes ?? 0,
                LastQuoteAt = quoteStats?.LastQuoteAt,
                RecentQuoteRequests = recentQuotes
            };
        }

        public async Task<AdminUserDetailDto> UpdateUserAsync(
            string userId,
            AdminUpdateUserDto dto,
            CancellationToken ct = default)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new KeyNotFoundException("User not found");

            if (dto.Email != null)
            {
                var email = dto.Email.Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(email))
                {
                    throw new ArgumentException("Email is required.");
                }

                var emailExists = await _context.Users
                    .AsNoTracking()
                    .AnyAsync(u => u.Id != userId && u.Email == email, ct);

                if (emailExists)
                {
                    throw new ArgumentException("Email already exists.");
                }

                user.Email = email;
            }

            if (dto.FirstName != null)
            {
                var firstName = dto.FirstName.Trim();
                if (string.IsNullOrWhiteSpace(firstName))
                {
                    throw new ArgumentException("First name is required.");
                }

                user.FirstName = firstName;
            }

            if (dto.LastName != null)
            {
                user.LastName = dto.LastName.Trim();
            }

            if (dto.PhoneNumber != null)
            {
                user.PhoneNumber = dto.PhoneNumber.Trim();
            }

            if (dto.MerchantId != null)
            {
                var merchantId = dto.MerchantId.Trim();
                if (string.IsNullOrWhiteSpace(merchantId))
                {
                    if (user.Role == Role.Merchant)
                    {
                        throw new ArgumentException("MerchantId is required for Merchant role.");
                    }

                    user.MerchantId = null;
                }
                else
                {
                    var merchantExists = await _context.Merchants
                        .AsNoTracking()
                        .AnyAsync(m => m.Id == merchantId, ct);

                    if (!merchantExists)
                    {
                        throw new KeyNotFoundException("Merchant not found");
                    }

                    user.MerchantId = merchantId;
                }
            }

            user.Updated = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            return await GetUserByIdAsync(userId, ct);
        }

        public async Task<AdminUserDetailDto> UpdateUserRoleAsync(
            string userId,
            AdminUpdateUserRoleDto dto,
            CancellationToken ct = default)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new KeyNotFoundException("User not found");

            if (dto.Role == Role.Merchant)
            {
                if (string.IsNullOrWhiteSpace(dto.MerchantId))
                {
                    throw new ArgumentException("MerchantId is required when assigning Merchant role.");
                }

                var merchantExists = await _context.Merchants
                    .AsNoTracking()
                    .AnyAsync(m => m.Id == dto.MerchantId, ct);

                if (!merchantExists)
                {
                    throw new KeyNotFoundException("Merchant not found");
                }
            }

            user.Role = dto.Role;
            user.MerchantId = dto.Role == Role.Merchant ? dto.MerchantId?.Trim() : null;
            user.Updated = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            return await GetUserByIdAsync(userId, ct);
        }

        public async Task<AdminPagedResultDto<AdminOrderListItemDto>> GetOrdersAsync(
            string? search = null,
            string? status = null,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Orders
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim();
                query = query.Where(o =>
                    o.Id.Contains(normalizedSearch) ||
                    (o.OrderCode != null && o.OrderCode.Contains(normalizedSearch)) ||
                    (o.User != null && o.User.Email.Contains(normalizedSearch)) ||
                    o.ReceiverName.Contains(normalizedSearch) ||
                    o.ReceiverPhone.Contains(normalizedSearch));
            }

            var filteredStatuses = ResolveOrderStatuses(status);
            if (filteredStatuses.Length > 0)
            {
                query = query.Where(o => filteredStatuses.Contains(o.Status));
            }

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(o => o.Created)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new AdminOrderListItemDto
                {
                    Id = o.Id,
                    OrderCode = o.OrderCode,
                    UserId = o.UserId,
                    Source = o.Source.ToString(),
                    QuoteRequestId = o.QuoteRequestId,
                    CustomerName = o.User != null
                        ? ((o.User.FirstName ?? string.Empty) + " " + (o.User.LastName ?? string.Empty)).Trim()
                        : o.ReceiverName,
                    ReceiverName = o.ReceiverName,
                    ReceiverPhone = o.ReceiverPhone,
                    Total = o.Total,
                    Status = o.Status.ToString(),
                    PaymentStatus = o.Payments
                        .OrderByDescending(p => p.Created)
                        .Select(p => p.Status.ToString())
                        .FirstOrDefault() ?? "Pending",
                    ItemCount = o.OrderItems.Sum(i => i.Quantity),
                    Note = o.Note,
                    Created = o.Created,
                    Updated = o.Updated
                })
                .ToListAsync(ct);

            return new AdminPagedResultDto<AdminOrderListItemDto>
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        internal static OrderStatus[] ResolveOrderStatuses(string? filter)
        {
            if (string.IsNullOrWhiteSpace(filter)) return [];

            return filter.Trim().ToLowerInvariant() switch
            {
                "pending" => [OrderStatus.Pending, OrderStatus.OrderPlaced, OrderStatus.Processing, OrderStatus.SellerConfirmed],
                "production" => [OrderStatus.InProduction, OrderStatus.Packing],
                "shipping" => [OrderStatus.Shipping, OrderStatus.HandoverToCarrier, OrderStatus.InTransit, OrderStatus.OutForDelivery, OrderStatus.DeliveryFailed],
                "completed" => [OrderStatus.Delivered, OrderStatus.Completed, OrderStatus.PaymentSucceeded],
                "cancelled" => [OrderStatus.Cancelled],
                "returns" => [OrderStatus.ReturnRequested, OrderStatus.ReturnApproved, OrderStatus.ReturnRejected, OrderStatus.Returned, OrderStatus.Refunded],
                _ => Enum.TryParse<OrderStatus>(filter, true, out var status) ? [status] : []
            };
        }

        public async Task<AdminOrderDetailDto> GetOrderByIdAsync(string orderId, CancellationToken ct = default)
        {
            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.User)
                .Include(o => o.QuoteRequest)
                .Include(o => o.OrderItems)
                .Include(o => o.Payments)
                .Include(o => o.ShippingDetail)
                    .ThenInclude(s => s!.TrackingEvents)
                .Include(o => o.StatusHistories)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct)
                ?? throw new KeyNotFoundException("Order not found");

            return new AdminOrderDetailDto
            {
                Id = order.Id,
                OrderCode = order.OrderCode,
                UserId = order.UserId,
                Source = order.Source.ToString(),
                QuoteRequestId = order.QuoteRequestId,
                CustomerName = order.User != null
                    ? ((order.User.FirstName ?? string.Empty) + " " + (order.User.LastName ?? string.Empty)).Trim()
                    : order.ReceiverName,
                CustomerEmail = order.CustomerEmail ?? order.User?.Email,
                ReceiverName = order.ReceiverName,
                ReceiverPhone = order.ReceiverPhone,
                AddressLine = order.AddressLine,
                Note = order.Note,
                Subtotal = order.Subtotal,
                ShippingFee = order.ShippingFee,
                Total = order.Total,
                Status = order.Status.ToString(),
                PaymentStatus = order.Payments
                    .OrderByDescending(p => p.Created)
                    .Select(p => p.Status.ToString())
                    .FirstOrDefault() ?? "Pending",
                Created = order.Created,
                Updated = order.Updated,
                Items = order.OrderItems
                    .OrderBy(i => i.Created)
                    .Select(i => new AdminOrderItemDto
                    {
                        ProductId = i.ProductId,
                        ProductVariantId = i.ProductVariantId,
                        ProductName = i.ProductName,
                        VariantSku = i.VariantSku,
                        VariantSize = i.VariantSize,
                        VariantColor = i.VariantColor,
                        Material = i.Material,
                        Quantity = i.Quantity,
                        Price = i.Price,
                        Total = i.Total
                    })
                    .ToList(),
                Shipping = OrderMapping.MapToDto(order).Shipping,
                StatusHistory = OrderMapping.MapToDto(order).StatusHistory,
                RfqDetails = order.Source == OrderSource.Rfq && order.QuoteRequest != null
                    ? new AdminRfqOrderDetailsDto
                    {
                        QuoteCode = order.QuoteRequest.QuoteCode,
                        SizeBreakdown = QuoteStatusTransitionHelper.DeserializeSizeBreakdown(order.QuoteRequest.SizeBreakdownJson),
                        Material = order.QuoteRequest.Material,
                        ColorSelection = order.QuoteRequest.ColorSelection,
                        PrintTechnique = order.QuoteRequest.PrintTechnique.ToString(),
                        LogoFiles = QuoteStatusTransitionHelper.DeserializeLogoFiles(order.QuoteRequest.LogoFileUrlsJson)
                    }
                    : null,
                CustomFiles = QuoteStatusTransitionHelper.DeserializeLogoFiles(order.CustomFilesJson)
            };
        }

        public async Task<AdminOrderDetailDto> UpdateOrderStatusAsync(
            string orderId,
            AdminUpdateOrderStatusDto dto,
            CancellationToken ct = default)
        {
            if (!Enum.IsDefined(typeof(OrderStatus), dto.Status))
            {
                throw new ArgumentException("Invalid order status.");
            }

            var order = await _context.Orders
                .Include(o => o.ShippingDetail)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct)
                ?? throw new KeyNotFoundException("Order not found");

            if (!IsValidStatusTransition(order.Status, dto.Status))
            {
                throw new InvalidOperationException($"Không thể chuyển trạng thái đơn hàng từ {order.Status} sang {dto.Status}.");
            }

            var now = DateTime.UtcNow;
            order.Status = dto.Status;
            order.Updated = now;

            var hasShippingUpdate = !string.IsNullOrWhiteSpace(dto.TrackingNumber)
                || !string.IsNullOrWhiteSpace(dto.CarrierName)
                || !string.IsNullOrWhiteSpace(dto.CarrierCode)
                || !string.IsNullOrWhiteSpace(dto.CurrentLocation)
                || !string.IsNullOrWhiteSpace(dto.TrackingUrl)
                || dto.EstimatedDelivery.HasValue;

            if (hasShippingUpdate && order.ShippingDetail == null)
            {
                order.ShippingDetail = new ShippingDetail
                {
                    OrderId = order.Id,
                    Method = ShippingMethod.Standard,
                    Fee = order.ShippingFee,
                    Created = now
                };
            }

            if (order.ShippingDetail != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.TrackingNumber))
                    order.ShippingDetail.TrackingNumber = dto.TrackingNumber.Trim();
                if (!string.IsNullOrWhiteSpace(dto.CarrierName))
                    order.ShippingDetail.Carrier = dto.CarrierName.Trim();
                if (!string.IsNullOrWhiteSpace(dto.CarrierCode))
                    order.ShippingDetail.CarrierCode = dto.CarrierCode.Trim();
                if (!string.IsNullOrWhiteSpace(dto.CurrentLocation))
                    order.ShippingDetail.CurrentLocation = dto.CurrentLocation.Trim();
                if (!string.IsNullOrWhiteSpace(dto.TrackingUrl))
                    order.ShippingDetail.TrackingUrl = dto.TrackingUrl.Trim();
                if (dto.EstimatedDelivery.HasValue)
                    order.ShippingDetail.EstimatedDelivery = dto.EstimatedDelivery;
                if (dto.Status is OrderStatus.Delivered or OrderStatus.Completed)
                    order.ShippingDetail.DeliveredAt ??= now;

                order.ShippingDetail.Updated = now;
            }

            _context.OrderStatusHistories.Add(new OrderStatusHistory
            {
                Id = Guid.NewGuid().ToString(),
                OrderId = order.Id,
                Status = dto.Status,
                Title = $"Cập nhật trạng thái: {dto.Status}",
                Description = BuildStatusHistoryDescription(dto.Status, dto.Note),
                Location = dto.CurrentLocation,
                Note = dto.Note,
                ActorRole = Role.Admin.ToString(),
                Created = now
            });

            await _context.SaveChangesAsync(ct);
            return await GetOrderByIdAsync(orderId, ct);
        }

        public async Task<AdminOrderDetailDto> UpdateOrderDetailsAsync(
            string orderId,
            AdminUpdateOrderDetailsDto dto,
            string? actorUserId,
            CancellationToken ct = default)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .Include(o => o.Payments)
                .Include(o => o.StatusHistories)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct)
                ?? throw new KeyNotFoundException("Order not found");

            var productIds = dto.Items
                .Where(item => !string.IsNullOrWhiteSpace(item.ProductId))
                .Select(item => item.ProductId!.Trim())
                .Distinct()
                .ToList();
            var existingProductIds = productIds.Count == 0
                ? new HashSet<string>()
                : (await _context.Products.AsNoTracking()
                    .Where(product => productIds.Contains(product.Id))
                    .Select(product => product.Id)
                    .ToListAsync(ct))
                    .ToHashSet();
            if (productIds.Any(id => !existingProductIds.Contains(id)))
            {
                throw new KeyNotFoundException("Có sản phẩm không còn tồn tại.");
            }

            var now = DateTime.UtcNow;
            _context.OrderItems.RemoveRange(order.OrderItems);
            order.OrderItems = dto.Items.Select(item => new OrderItem
            {
                Id = Guid.NewGuid().ToString(),
                OrderId = order.Id,
                ProductId = string.IsNullOrWhiteSpace(item.ProductId) ? null : item.ProductId.Trim(),
                ProductName = item.ProductName.Trim(),
                VariantSize = string.IsNullOrWhiteSpace(item.VariantSize) ? null : item.VariantSize.Trim(),
                VariantColor = string.IsNullOrWhiteSpace(item.VariantColor) ? null : item.VariantColor.Trim(),
                Material = string.IsNullOrWhiteSpace(item.Material) ? null : item.Material.Trim(),
                Quantity = item.Quantity,
                Price = item.UnitPrice,
                Total = Math.Round(item.Quantity * item.UnitPrice, 2),
                Created = now
            }).ToList();
            order.ReceiverName = dto.ReceiverName.Trim();
            order.CustomerEmail = string.IsNullOrWhiteSpace(dto.CustomerEmail) ? null : dto.CustomerEmail.Trim();
            order.ReceiverPhone = dto.ReceiverPhone.Trim();
            order.AddressLine = dto.AddressLine.Trim();
            order.Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();
            order.Subtotal = order.OrderItems.Sum(item => item.Total);
            order.ShippingFee = dto.ShippingFee;
            order.Total = order.Subtotal + order.ShippingFee;
            order.Updated = now;

            var pendingPayment = order.Payments.OrderByDescending(payment => payment.Created).FirstOrDefault();
            if (pendingPayment?.Status == PaymentStatus.Pending)
            {
                pendingPayment.Amount = Math.Max(order.Total, 1m);
                pendingPayment.Updated = now;
            }

            order.StatusHistories.Add(new OrderStatusHistory
            {
                Id = Guid.NewGuid().ToString(),
                OrderId = order.Id,
                Status = order.Status,
                Title = "Cập nhật chi tiết đơn hàng",
                Description = "Thông tin nhận hàng hoặc danh sách sản phẩm đã được cập nhật.",
                ActorUserId = actorUserId,
                ActorRole = Role.Admin.ToString(),
                Created = now
            });

            await _context.SaveChangesAsync(ct);
            return await GetOrderByIdAsync(order.Id, ct);
        }

        public async Task<AdminOrderDetailDto> CreateOrderFromQuoteAsync(
            string quoteRequestId,
            AdminCreateOrderFromQuoteDto dto,
            string? adminUserId,
            CancellationToken ct = default)
        {
            var quote = await _context.QuoteRequests
                .Include(q => q.Product)
                .FirstOrDefaultAsync(q => q.Id == quoteRequestId, ct)
                ?? throw new KeyNotFoundException("Quote request not found");

            if (!CanCreateOrderFromQuote(quote.Status))
            {
                throw new InvalidOperationException("Chỉ có thể hoàn tất báo giá và tạo đơn từ báo giá đã gửi.");
            }

            var hasActiveOrder = await _context.Orders
                .AsNoTracking()
                .AnyAsync(o => o.QuoteRequestId == quoteRequestId && o.Status != OrderStatus.Cancelled, ct);

            if (hasActiveOrder)
            {
                throw new InvalidOperationException("Yêu cầu báo giá này đã có đơn hàng đang hoạt động.");
            }

            var subtotal = dto.Subtotal ?? quote.QuotedPrice ?? 0m;
            if (subtotal <= 0m)
            {
                throw new ArgumentException("Vui lòng nhập giá báo hoặc giá trị đơn hàng lớn hơn 0.");
            }

            var unitPrice = Math.Round(subtotal / Math.Max(quote.Quantity, 1), 2);
            var productName = quote.Product?.Name
                ?? (string.IsNullOrWhiteSpace(quote.OrganizationName)
                    ? $"Áo custom ({quote.QuoteCode})"
                    : $"Áo custom - {quote.OrganizationName}");

            var now = DateTime.UtcNow;
            quote.Status = QuoteStatus.Accepted;

            quote.QuotedPrice ??= subtotal;
            quote.QuotedAt ??= now;
            quote.UpdatedAt = now;

            var items = new List<OrderItem>
            {
                new()
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductId = quote.ProductId,
                    ProductName = productName,
                    VariantColor = quote.ColorSelection,
                    Material = quote.Material,
                    Quantity = quote.Quantity,
                    Price = unitPrice,
                    Total = subtotal,
                    Created = now
                }
            };

            return await CreateAdminOrderRecordAsync(
                quote.UserId,
                quote.Email,
                OrderSource.Rfq,
                quote.Id,
                string.IsNullOrWhiteSpace(dto.ReceiverName) ? quote.CustomerName : dto.ReceiverName.Trim(),
                string.IsNullOrWhiteSpace(dto.ReceiverPhone) ? quote.Phone : dto.ReceiverPhone.Trim(),
                dto.AddressLine.Trim(),
                string.IsNullOrWhiteSpace(dto.Note) ? quote.Note : dto.Note.Trim(),
                subtotal,
                dto.ShippingFee,
                dto.IsPaid,
                dto.PaidAt,
                items,
                adminUserId,
                $"Tạo đơn hàng từ yêu cầu báo giá {quote.QuoteCode}",
                ct);
        }

        public async Task<AdminOrderDetailDto> CreateManualOrderAsync(
            AdminCreateManualOrderDto dto,
            string? adminUserId,
            CancellationToken ct = default)
        {
            string? userId = null;
            if (!string.IsNullOrWhiteSpace(dto.UserId))
            {
                userId = dto.UserId.Trim();
                var userExists = await _context.Users.AsNoTracking().AnyAsync(u => u.Id == userId, ct);
                if (!userExists)
                {
                    throw new KeyNotFoundException("User not found");
                }
            }
            else if (!string.IsNullOrWhiteSpace(dto.CustomerEmail))
            {
                userId = await _context.Users.AsNoTracking()
                    .Where(u => u.Email == dto.CustomerEmail.Trim())
                    .Select(u => u.Id)
                    .FirstOrDefaultAsync(ct);
            }

            var productIds = dto.Items
                .Select(i => i.ProductId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id!.Trim())
                .Distinct()
                .ToList();

            var validProducts = productIds.Count == 0
                ? new HashSet<string>()
                : (await _context.Products.AsNoTracking().Where(p => productIds.Contains(p.Id)).Select(p => p.Id).ToListAsync(ct)).ToHashSet();

            foreach (var productId in productIds)
            {
                if (!validProducts.Contains(productId))
                {
                    throw new KeyNotFoundException($"Product {productId} not found");
                }
            }

            var now = DateTime.UtcNow;
            var items = dto.Items.Select(item =>
            {
                var lineTotal = Math.Round(item.Quantity * item.UnitPrice, 2);
                return new OrderItem
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductId = string.IsNullOrWhiteSpace(item.ProductId) ? null : item.ProductId.Trim(),
                    ProductName = item.ProductName.Trim(),
                    VariantSize = string.IsNullOrWhiteSpace(item.VariantSize) ? null : item.VariantSize.Trim(),
                    VariantColor = string.IsNullOrWhiteSpace(item.VariantColor) ? null : item.VariantColor.Trim(),
                    Material = string.IsNullOrWhiteSpace(item.Material) ? null : item.Material.Trim(),
                    Quantity = item.Quantity,
                    Price = item.UnitPrice,
                    Total = lineTotal,
                    Created = now
                };
            }).ToList();

            var subtotal = items.Sum(i => i.Total);
            var source = dto.Source == OrderSource.Storefront ? OrderSource.ManualZalo : dto.Source;

            return await CreateAdminOrderRecordAsync(
                userId,
                dto.CustomerEmail.Trim(),
                source,
                null,
                dto.ReceiverName.Trim(),
                dto.ReceiverPhone.Trim(),
                dto.AddressLine.Trim(),
                string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                subtotal,
                dto.ShippingFee,
                dto.IsPaid,
                dto.PaidAt,
                items,
                adminUserId,
                $"Admin tạo đơn thủ công ({source})",
                ct);
        }

        public async Task<AdminOrderDetailDto> UpdateOrderPaymentStatusAsync(
            string orderId,
            AdminUpdateOrderPaymentDto dto,
            string? adminUserId,
            CancellationToken ct = default)
        {
            var order = await _context.Orders
                .Include(o => o.Payments)
                .Include(o => o.StatusHistories)
                .FirstOrDefaultAsync(o => o.Id == orderId, ct)
                ?? throw new KeyNotFoundException("Order not found");

            var now = DateTime.UtcNow;
            var targetStatus = dto.IsPaid ? PaymentStatus.Paid : PaymentStatus.Pending;
            var paidAt = dto.IsPaid ? (dto.PaidAt ?? now) : (DateTime?)null;

            var latestPayment = order.Payments
                .OrderByDescending(p => p.Created)
                .FirstOrDefault();

            if (latestPayment is not null)
            {
                latestPayment.Status = targetStatus;
                latestPayment.PaidAt = paidAt;
                latestPayment.Updated = now;
                if (!string.IsNullOrWhiteSpace(dto.Note))
                {
                    latestPayment.OrderInfo = dto.Note.Trim();
                }
            }
            else
            {
                _context.Payments.Add(new Payment
                {
                    Id = Guid.NewGuid().ToString(),
                    OrderId = order.Id,
                    Method = PaymentMethod.COD,
                    Provider = "Manual",
                    Amount = Math.Max(order.Total, 1m),
                    Status = targetStatus,
                    PaidAt = paidAt,
                    TransactionNo = $"PAY-{Guid.NewGuid():N}",
                    OrderInfo = string.IsNullOrWhiteSpace(dto.Note) ? "Admin cập nhật thanh toán" : dto.Note.Trim(),
                    Created = now,
                    Updated = now
                });
            }

            order.Updated = now;
            order.StatusHistories.Add(new OrderStatusHistory
            {
                Id = Guid.NewGuid().ToString(),
                OrderId = order.Id,
                Status = order.Status,
                Title = dto.IsPaid ? "Xác nhận đã thanh toán" : "Cập nhật chưa thanh toán",
                Description = string.IsNullOrWhiteSpace(dto.Note)
                    ? (dto.IsPaid ? "Admin xác nhận đơn hàng đã thu tiền." : "Admin chuyển trạng thái thanh toán về chờ thu.")
                    : dto.Note.Trim(),
                ActorUserId = adminUserId,
                ActorRole = Role.Admin.ToString(),
                Created = now
            });

            await _context.SaveChangesAsync(ct);
            return await GetOrderByIdAsync(order.Id, ct);
        }

        private async Task<AdminOrderDetailDto> CreateAdminOrderRecordAsync(
            string? userId,
            string? customerEmail,
            OrderSource source,
            string? quoteRequestId,
            string receiverName,
            string receiverPhone,
            string addressLine,
            string? note,
            decimal subtotal,
            decimal shippingFee,
            bool isPaid,
            DateTime? paidAt,
            List<OrderItem> items,
            string? adminUserId,
            string historyDescription,
            CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var total = subtotal + shippingFee;
            var orderId = Guid.NewGuid().ToString();
            var orderCode = $"ORD-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

            foreach (var item in items)
            {
                item.OrderId = orderId;
            }

            var order = new Order
            {
                Id = orderId,
                OrderCode = orderCode,
                UserId = userId,
                CustomerEmail = string.IsNullOrWhiteSpace(customerEmail) ? null : customerEmail.Trim(),
                Source = source,
                QuoteRequestId = quoteRequestId,
                Subtotal = subtotal,
                ShippingFee = shippingFee,
                Total = total,
                Status = OrderStatus.SellerConfirmed,
                ReceiverName = receiverName,
                ReceiverPhone = receiverPhone,
                AddressLine = addressLine,
                Note = note,
                Created = now,
                Updated = now,
                OrderItems = items,
                StatusHistories = new List<OrderStatusHistory>
                {
                    new()
                    {
                        Id = Guid.NewGuid().ToString(),
                        OrderId = orderId,
                        Status = OrderStatus.SellerConfirmed,
                        Title = "Đã tạo đơn hàng",
                        Description = historyDescription,
                        Note = note,
                        ActorUserId = adminUserId,
                        ActorRole = Role.Admin.ToString(),
                        Created = now
                    }
                }
            };

            if (total > 0)
            {
                order.Payments = new List<Payment>
                {
                    new()
                    {
                        Id = Guid.NewGuid().ToString(),
                        OrderId = orderId,
                        Method = PaymentMethod.COD,
                        Provider = "Manual",
                        Amount = total,
                        Status = isPaid ? PaymentStatus.Paid : PaymentStatus.Pending,
                        PaidAt = isPaid ? (paidAt ?? now) : null,
                        TransactionNo = $"PAY-{Guid.NewGuid():N}",
                        OrderInfo = note ?? historyDescription,
                        Created = now,
                        Updated = now
                    }
                };
            }

            _context.Orders.Add(order);
            await _context.SaveChangesAsync(ct);

            return await GetOrderByIdAsync(orderId, ct);
        }

        public async Task<AdminPagedResultDto<ProductSummaryDto>> GetProductsAsync(
            string? search = null,
            bool? isActive = null,
            int page = 1,
            int pageSize = 20,
            CancellationToken ct = default)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Products
                .AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.ProductCategories)
                    .ThenInclude(pc => pc.Category)
                .Include(p => p.ProductVariants)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim();
                query = query.Where(p =>
                    p.Name.Contains(normalizedSearch) ||
                    p.Sku.Contains(normalizedSearch) ||
                    p.Slug.Contains(normalizedSearch));
            }

            if (isActive.HasValue)
            {
                query = query.Where(p => p.IsActive == isActive.Value);
            }

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(p => p.Created)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new ProductSummaryDto
                {
                    Id = p.Id,
                    Sku = p.Sku,
                    Name = p.Name,
                    Slug = p.Slug,
                    ImageUrl = p.ImageUrl,
                    Price = p.Price,
                    MinVariantPrice = p.ProductVariants.Where(v => v.IsActive).Select(v => (decimal?)v.Price).Min(),
                    DefaultVariantId = p.ProductVariants.Where(v => v.IsActive).OrderBy(v => v.Id).Select(v => v.Id).FirstOrDefault(),
                    TotalStock = p.ProductVariants.Any(v => v.IsActive)
                        ? p.ProductVariants.Where(v => v.IsActive).Sum(v => (int?)v.Stock) ?? 0
                        : p.Stock,
                    Stock = p.Stock,
                    AverageRating = p.AverageRating,
                    ReviewCount = p.ReviewCount,
                    IsActive = p.IsActive,
                    BrandId = p.BrandId,
                    BrandName = p.Brand != null ? p.Brand.Name : null,
                    Categories = p.ProductCategories
                        .Where(pc => pc.Category != null)
                        .Select(pc => new CategorySummaryDto
                        {
                            Id = pc.CategoryId,
                            Name = pc.Category!.Name,
                            Slug = pc.Category.Slug
                        })
                        .ToList(),
                    Created = p.Created
                })
                .ToListAsync(ct);

            return new AdminPagedResultDto<ProductSummaryDto>
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            };
        }

        public async Task<ProductDto> GetProductByIdAsync(string productId, CancellationToken ct = default)
        {
            var product = await GetProductEntityAsync(productId, ct);
            return ProductMapping.MapToDto(product);
        }

        public async Task<ProductDto> CreateProductAsync(CreateProductDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Sku))
            {
                throw new ArgumentException("SKU is required.");
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                throw new ArgumentException("Product name is required.");
            }

            if ((dto.BasePrice ?? dto.Price) < 0 || dto.Stock < 0 || dto.AverageRating < 0 || dto.AverageRating > 5 || dto.ReviewCount < 0)
            {
                throw new ArgumentException("Invalid product values.");
            }

            if (dto.MinOrderQuantity is < 1 or > 100000)
            {
                throw new ArgumentException("MinOrderQuantity must be between 1 and 100000.");
            }

            var normalizedSku = dto.Sku.Trim();
            var skuExists = await _context.Products.AsNoTracking().AnyAsync(p => p.Sku == normalizedSku, ct);
            if (skuExists)
            {
                throw new InvalidOperationException($"SKU '{normalizedSku}' already exists.");
            }

            if (!string.IsNullOrWhiteSpace(dto.BrandId))
            {
                var brandExists = await _context.Brands.AsNoTracking().AnyAsync(b => b.Id == dto.BrandId, ct);
                if (!brandExists)
                {
                    throw new KeyNotFoundException("Brand not found");
                }
            }

            var slug = await BuildUniqueSlugAsync(dto.Slug ?? dto.Name, null, ct);

            var product = new Product
            {
                Id = Guid.NewGuid().ToString(),
                Sku = normalizedSku,
                Name = dto.Name.Trim(),
                Slug = slug,
                Description = dto.Description?.Trim() ?? string.Empty,
                Price = dto.Price,
                Taxable = dto.Taxable,
                IsActive = dto.IsActive,
                BrandId = string.IsNullOrWhiteSpace(dto.BrandId) ? null : dto.BrandId.Trim(),
                ImageUrl = dto.ImageUrl?.Trim() ?? string.Empty,
                ImageKey = dto.ImageKey?.Trim() ?? string.Empty,
                Stock = dto.Stock,
                AverageRating = dto.AverageRating,
                ReviewCount = dto.ReviewCount,
                Created = DateTime.UtcNow
            };

            ProductRfqMetadataHelper.ApplyCreateFields(product, dto);

            _context.Products.Add(product);
            await _context.SaveChangesAsync(ct);

            await SyncCategoriesAsync(product.Id, dto.CategoryIds, ct);
            return await GetProductByIdAsync(product.Id, ct);
        }

        public async Task<ProductDto> UpdateProductAsync(
            string productId,
            UpdateProductDto dto,
            CancellationToken ct = default)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, ct)
                ?? throw new KeyNotFoundException("Product not found");

            if (dto.Sku != null)
            {
                var sku = dto.Sku.Trim();
                if (string.IsNullOrWhiteSpace(sku))
                {
                    throw new ArgumentException("SKU is required.");
                }

                var skuExists = await _context.Products
                    .AsNoTracking()
                    .AnyAsync(p => p.Id != productId && p.Sku == sku, ct);

                if (skuExists)
                {
                    throw new InvalidOperationException($"SKU '{sku}' already exists.");
                }

                product.Sku = sku;
            }

            if (dto.Name != null)
            {
                var name = dto.Name.Trim();
                if (string.IsNullOrWhiteSpace(name))
                {
                    throw new ArgumentException("Product name is required.");
                }

                product.Name = name;
                if (dto.Slug == null)
                {
                    product.Slug = await BuildUniqueSlugAsync(name, productId, ct);
                }
            }

            if (dto.Slug != null)
            {
                product.Slug = await BuildUniqueSlugAsync(dto.Slug, productId, ct);
            }

            if (dto.Description != null)
            {
                product.Description = dto.Description.Trim();
            }

            if (dto.Price.HasValue && dto.Price.Value < 0)
            {
                throw new ArgumentException("Price must be greater than or equal to 0.");
            }

            if (dto.BasePrice.HasValue && dto.BasePrice.Value < 0)
            {
                throw new ArgumentException("BasePrice must be greater than or equal to 0.");
            }

            if (dto.MinOrderQuantity is < 1 or > 100000)
            {
                throw new ArgumentException("MinOrderQuantity must be between 1 and 100000.");
            }

            ProductRfqMetadataHelper.ApplyUpdateFields(product, dto);

            if (dto.Stock.HasValue)
            {
                if (dto.Stock.Value < 0) throw new ArgumentException("Stock must be greater than or equal to 0.");
                product.Stock = dto.Stock.Value;
            }

            if (dto.AverageRating.HasValue)
            {
                if (dto.AverageRating.Value < 0 || dto.AverageRating.Value > 5)
                {
                    throw new ArgumentException("AverageRating must be between 0 and 5.");
                }

                product.AverageRating = dto.AverageRating.Value;
            }

            if (dto.ReviewCount.HasValue)
            {
                if (dto.ReviewCount.Value < 0)
                {
                    throw new ArgumentException("ReviewCount must be greater than or equal to 0.");
                }

                product.ReviewCount = dto.ReviewCount.Value;
            }

            if (dto.Taxable.HasValue) product.Taxable = dto.Taxable.Value;
            if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;

            if (dto.BrandId != null)
            {
                if (dto.BrandId == "null" || string.IsNullOrWhiteSpace(dto.BrandId))
                {
                    product.BrandId = null;
                }
                else
                {
                    var brandId = dto.BrandId.Trim();
                    var brandExists = await _context.Brands.AsNoTracking().AnyAsync(b => b.Id == brandId, ct);
                    if (!brandExists)
                    {
                        throw new KeyNotFoundException("Brand not found");
                    }

                    product.BrandId = brandId;
                }
            }

            var oldImageKey = product.ImageKey;

            if (dto.ImageUrl != null)
            {
                product.ImageUrl = dto.ImageUrl.Trim();
            }

            if (dto.ImageKey != null)
            {
                product.ImageKey = dto.ImageKey.Trim();
            }

            product.Updated = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            if (dto.CategoryIds != null)
            {
                await SyncCategoriesAsync(productId, dto.CategoryIds, ct);
            }

            if (!string.IsNullOrWhiteSpace(oldImageKey) &&
                !string.Equals(oldImageKey, product.ImageKey, StringComparison.Ordinal))
            {
                await TryDeleteCloudinaryAssetAsync(oldImageKey);
            }

            return await GetProductByIdAsync(productId, ct);
        }

        public async Task DeleteProductAsync(string productId, CancellationToken ct = default)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, ct)
                ?? throw new KeyNotFoundException("Product not found");

            var imageKey = product.ImageKey;

            _context.Products.Remove(product);
            await _context.SaveChangesAsync(ct);

            if (!string.IsNullOrWhiteSpace(imageKey))
            {
                await TryDeleteCloudinaryAssetAsync(imageKey);
            }
        }

        public async Task<ProductDto> ToggleProductActiveAsync(string productId, CancellationToken ct = default)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, ct)
                ?? throw new KeyNotFoundException("Product not found");

            product.IsActive = !product.IsActive;
            product.Updated = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            return await GetProductByIdAsync(productId, ct);
        }

        public async Task<AdminSettingsDto> GetSettingsAsync(CancellationToken ct = default)
        {
            var settings = await GetOrCreateSettingsAsync(ct);
            return MapSettings(settings);
        }

        public async Task<AdminSettingsDto> UpdateSettingsAsync(
            UpdateAdminSettingsDto dto,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.StoreName))
            {
                throw new ArgumentException("Store name is required.");
            }

            if (string.IsNullOrWhiteSpace(dto.SupportEmail))
            {
                throw new ArgumentException("Support email is required.");
            }

            var settings = await GetOrCreateSettingsAsync(ct);

            settings.StoreName = dto.StoreName.Trim();
            settings.SupportEmail = dto.SupportEmail.Trim();
            settings.SupportPhone = dto.SupportPhone?.Trim();
            settings.LowStockThreshold = Math.Max(dto.LowStockThreshold, 0);
            settings.RecentOrdersLimit = Math.Clamp(dto.RecentOrdersLimit, 1, 20);
            settings.EnableOrderNotifications = dto.EnableOrderNotifications;
            settings.EnableInventoryAlerts = dto.EnableInventoryAlerts;
            settings.EnableWeeklySummary = dto.EnableWeeklySummary;
            settings.Updated = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            return MapSettings(settings);
        }

        private async Task<Product> GetProductEntityAsync(string productId, CancellationToken ct)
        {
            return await _context.Products
                .AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.ProductCategories)
                    .ThenInclude(pc => pc.Category)
                .Include(p => p.ProductVariants)
                .FirstOrDefaultAsync(p => p.Id == productId, ct)
                ?? throw new KeyNotFoundException("Product not found");
        }

        private async Task SyncCategoriesAsync(string productId, List<string>? categoryIds, CancellationToken ct)
        {
            var normalizedIds = (categoryIds ?? new List<string>())
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct()
                .ToList();

            if (normalizedIds.Count > 0)
            {
                var existingCount = await _context.Categories
                    .AsNoTracking()
                    .CountAsync(c => normalizedIds.Contains(c.Id), ct);

                if (existingCount != normalizedIds.Count)
                {
                    throw new KeyNotFoundException("One or more categories were not found.");
                }
            }

            var existingLinks = await _context.ProductCategories
                .Where(pc => pc.ProductId == productId)
                .ToListAsync(ct);

            _context.ProductCategories.RemoveRange(existingLinks);

            if (normalizedIds.Count > 0)
            {
                var nextLinks = normalizedIds.Select(categoryId => new ProductCategory
                {
                    ProductId = productId,
                    CategoryId = categoryId
                });

                await _context.ProductCategories.AddRangeAsync(nextLinks, ct);
            }

            await _context.SaveChangesAsync(ct);
        }

        private async Task<string> BuildUniqueSlugAsync(string input, string? excludingProductId, CancellationToken ct)
        {
            var baseSlug = BuildSlug(input);
            if (string.IsNullOrWhiteSpace(baseSlug))
            {
                throw new ArgumentException("Slug is invalid.");
            }

            var slug = baseSlug;
            var exists = await _context.Products
                .AsNoTracking()
                .AnyAsync(p => p.Slug == slug && p.Id != excludingProductId, ct);

            if (!exists)
            {
                return slug;
            }

            slug = $"{baseSlug}-{Guid.NewGuid().ToString("N")[..6]}";
            return slug;
        }

        private static string BuildSlug(string input)
        {
            var slug = input.Trim().ToLowerInvariant();
            foreach (var kv in VietnameseMap)
            {
                slug = slug.Replace(kv.Key, kv.Value);
            }

            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug.Trim(), @"\s+", "-");
            return slug;
        }

        private async Task TryDeleteCloudinaryAssetAsync(string imageKey)
        {
            try
            {
                await _cloudinaryService.DeleteAsync(imageKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete Cloudinary asset {ImageKey}", imageKey);
            }
        }

        private async Task<AdminSetting> GetOrCreateSettingsAsync(CancellationToken ct)
        {
            var settings = await _context.AdminSettings.FirstOrDefaultAsync(x => x.Id == "default", ct);
            if (settings is not null)
            {
                return settings;
            }

            settings = new AdminSetting
            {
                Id = "default",
            };

            _context.AdminSettings.Add(settings);
            await _context.SaveChangesAsync(ct);
            return settings;
        }

        private static AdminSettingsDto MapSettings(AdminSetting settings)
        {
            return new AdminSettingsDto
            {
                StoreName = settings.StoreName,
                SupportEmail = settings.SupportEmail,
                SupportPhone = settings.SupportPhone,
                LowStockThreshold = settings.LowStockThreshold,
                RecentOrdersLimit = settings.RecentOrdersLimit,
                EnableOrderNotifications = settings.EnableOrderNotifications,
                EnableInventoryAlerts = settings.EnableInventoryAlerts,
                EnableWeeklySummary = settings.EnableWeeklySummary,
                Updated = settings.Updated ?? settings.Created
            };
        }

        internal static bool CanCreateOrderFromQuote(QuoteStatus status)
            => status is QuoteStatus.Quoted or QuoteStatus.Accepted;

        internal static bool IsValidStatusTransition(OrderStatus currentStatus, OrderStatus nextStatus)
        {
            if (currentStatus == nextStatus)
            {
                return true;
            }

            return currentStatus switch
            {
                OrderStatus.Pending => nextStatus is OrderStatus.Processing or OrderStatus.OrderPlaced or OrderStatus.SellerConfirmed or OrderStatus.Cancelled,
                OrderStatus.Processing => nextStatus is OrderStatus.SellerConfirmed or OrderStatus.Packing or OrderStatus.HandoverToCarrier or OrderStatus.Shipping or OrderStatus.Cancelled,
                OrderStatus.Shipping => nextStatus is OrderStatus.InTransit or OrderStatus.OutForDelivery or OrderStatus.Delivered or OrderStatus.DeliveryFailed or OrderStatus.Completed,
                OrderStatus.PaymentSucceeded => nextStatus is OrderStatus.SellerConfirmed or OrderStatus.Completed,
                OrderStatus.OrderPlaced => nextStatus is OrderStatus.SellerConfirmed or OrderStatus.Cancelled,
                OrderStatus.SellerConfirmed => nextStatus is OrderStatus.InProduction or OrderStatus.Packing or OrderStatus.Cancelled,
                OrderStatus.InProduction => nextStatus is OrderStatus.Packing or OrderStatus.HandoverToCarrier or OrderStatus.Shipping or OrderStatus.Cancelled,
                OrderStatus.Packing => nextStatus is OrderStatus.HandoverToCarrier or OrderStatus.Cancelled,
                OrderStatus.HandoverToCarrier => nextStatus is OrderStatus.InTransit or OrderStatus.DeliveryFailed,
                OrderStatus.InTransit => nextStatus is OrderStatus.OutForDelivery or OrderStatus.DeliveryFailed,
                OrderStatus.OutForDelivery => nextStatus is OrderStatus.Delivered or OrderStatus.DeliveryFailed,
                OrderStatus.DeliveryFailed => nextStatus is OrderStatus.OutForDelivery or OrderStatus.Returned or OrderStatus.Cancelled,
                OrderStatus.Delivered => nextStatus is OrderStatus.Completed or OrderStatus.ReturnRequested,
                OrderStatus.Completed => nextStatus == OrderStatus.ReturnRequested,
                OrderStatus.ReturnRequested => nextStatus is OrderStatus.ReturnApproved or OrderStatus.ReturnRejected,
                OrderStatus.ReturnRejected => nextStatus is OrderStatus.Delivered or OrderStatus.Completed,
                OrderStatus.ReturnApproved => nextStatus == OrderStatus.Returned,
                OrderStatus.Returned => nextStatus == OrderStatus.Refunded,
                OrderStatus.Cancelled => false,
                OrderStatus.Refunded => false,
                _ => false
            };
        }

        internal static string BuildStatusHistoryDescription(OrderStatus status, string? note)
            => string.IsNullOrWhiteSpace(note) ? $"Đơn hàng chuyển sang {status}." : note.Trim();

        private async Task TryNotifyOrderStatusChangedAsync(
            string orderId,
            OrderStatus previousStatus,
            OrderStatus nextStatus,
            CancellationToken ct)
        {
            try
            {
                await _notificationService.NotifyOrderStatusChangedAsync(orderId, previousStatus, nextStatus, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Order status notification failed. OrderId={OrderId}, PreviousStatus={PreviousStatus}, NextStatus={NextStatus}",
                    orderId,
                    previousStatus,
                    nextStatus);
            }
        }
    }
}
