using System.Security.Claims;
using api.controllers.admin;
using api.DTOs.admin;
using api.DTOs.product;
using api.models.enums;
using api.services.interfaces.admin;
using api.services.implementations.admin;
using api.validators.admin;
using api.validators.product;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace api.Tests.Rfq
{
    public class AdminOrderAndDashboardTests
    {
        [Fact]
        public void InProductionOrderStatus_PreservesExistingDatabaseValues()
        {
            Assert.Equal(19, (int)OrderStatus.InProduction);
        }

        [Theory]
        [InlineData(QuoteStatus.Quoted, true)]
        [InlineData(QuoteStatus.Accepted, true)]
        [InlineData(QuoteStatus.Pending, false)]
        [InlineData(QuoteStatus.Rejected, false)]
        public void CreateOrderFromQuote_AllowsSentOrAcceptedQuotes(QuoteStatus status, bool expected)
        {
            Assert.Equal(expected, AdminManagementService.CanCreateOrderFromQuote(status));
        }

        [Theory]
        [InlineData(OrderStatus.Pending, OrderStatus.Processing, true)]
        [InlineData(OrderStatus.Processing, OrderStatus.Shipping, true)]
        [InlineData(OrderStatus.SellerConfirmed, OrderStatus.InProduction, true)]
        [InlineData(OrderStatus.InProduction, OrderStatus.Packing, true)]
        [InlineData(OrderStatus.Packing, OrderStatus.HandoverToCarrier, true)]
        [InlineData(OrderStatus.HandoverToCarrier, OrderStatus.InTransit, true)]
        [InlineData(OrderStatus.SellerConfirmed, OrderStatus.InTransit, false)]
        [InlineData(OrderStatus.Completed, OrderStatus.Shipping, false)]
        public void OrderStatusTransition_MatchesFulfillmentFlow(
            OrderStatus current,
            OrderStatus next,
            bool expected)
        {
            Assert.Equal(expected, AdminManagementService.IsValidStatusTransition(current, next));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void StatusHistoryDescription_NeverReturnsNullForEmptyNote(string? note)
        {
            Assert.False(string.IsNullOrWhiteSpace(
                AdminManagementService.BuildStatusHistoryDescription(OrderStatus.Processing, note)));
        }

        [Theory]
        [InlineData("pending", OrderStatus.Pending, OrderStatus.OrderPlaced, OrderStatus.Processing, OrderStatus.SellerConfirmed)]
        [InlineData("production", OrderStatus.InProduction, OrderStatus.Packing)]
        [InlineData("shipping", OrderStatus.Shipping, OrderStatus.HandoverToCarrier, OrderStatus.InTransit, OrderStatus.OutForDelivery, OrderStatus.DeliveryFailed)]
        [InlineData("completed", OrderStatus.Delivered, OrderStatus.Completed, OrderStatus.PaymentSucceeded)]
        [InlineData("cancelled", OrderStatus.Cancelled)]
        [InlineData("returns", OrderStatus.ReturnRequested, OrderStatus.ReturnApproved, OrderStatus.ReturnRejected, OrderStatus.Returned, OrderStatus.Refunded)]
        public void OrderStatusFilter_ResolvesCompactBusinessGroups(
            string filter,
            params OrderStatus[] expected)
        {
            Assert.Equal(expected, AdminManagementService.ResolveOrderStatuses(filter));
        }

        [Fact]
        public void AdminController_RequiresAdminOnlyPolicy()
        {
            var attr = typeof(AdminController)
                .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                .Cast<AuthorizeAttribute>()
                .FirstOrDefault();

            Assert.NotNull(attr);
            Assert.Equal("AdminOnly", attr!.Policy);
        }

        [Fact]
        public void CreateManualOrderValidator_AcceptsGuestZaloOrderWithoutProductId()
        {
            var validator = new AdminCreateManualOrderDtoValidator();
            var dto = new AdminCreateManualOrderDto
            {
                ReceiverName = "CLB Bóng Rổ ĐH Bách Khoa",
                CustomerEmail = "clb@hust.edu.vn",
                ReceiverPhone = "0912345678",
                AddressLine = "Số 1 Đại Cồ Việt, Hà Nội",
                UserId = null,
                Source = OrderSource.ManualZalo,
                Note = "Chốt qua Zalo, in chuyển nhiệt logo ngực trái",
                ShippingFee = 30_000m,
                IsPaid = true,
                Items = new List<AdminCreateOrderItemDto>
                {
                    new()
                    {
                        ProductId = null,
                        ProductName = "Áo gió đồng phục CLB",
                        VariantSize = "L",
                        VariantColor = "Xanh bích",
                        Quantity = 35,
                        UnitPrice = 245_000m
                    }
                }
            };

            var result = validator.Validate(dto);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void CreateManualOrderValidator_RejectsInvalidPhoneAndEmptyItems()
        {
            var validator = new AdminCreateManualOrderDtoValidator();
            var dto = new AdminCreateManualOrderDto
            {
                ReceiverName = "Khách A",
                CustomerEmail = "khach@example.com",
                ReceiverPhone = "12345",
                AddressLine = "Hà Nội",
                Items = new List<AdminCreateOrderItemDto>()
            };

            var result = validator.Validate(dto);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(dto.ReceiverPhone));
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(dto.Items));
        }

        [Fact]
        public void UpdateOrderDetailsValidator_RejectsMaterialLongerThanDatabaseColumn()
        {
            var validator = new AdminUpdateOrderDetailsDtoValidator();
            var dto = new AdminUpdateOrderDetailsDto
            {
                ReceiverName = "Khách A",
                Items =
                [
                    new AdminCreateOrderItemDto
                    {
                        ProductName = "Áo custom",
                        Material = new string('a', 101),
                        Quantity = 1,
                        UnitPrice = 100_000m
                    }
                ]
            };

            var result = validator.Validate(dto);

            Assert.Contains(result.Errors, error => error.PropertyName.EndsWith(nameof(AdminCreateOrderItemDto.Material)));
        }

        [Fact]
        public void CreateOrderFromQuoteValidator_RejectsNonPositiveSubtotal()
        {
            var validator = new AdminCreateOrderFromQuoteDtoValidator();
            var dto = new AdminCreateOrderFromQuoteDto
            {
                AddressLine = "123 Nguyễn Trãi, Hà Nội",
                Subtotal = 0m
            };

            var result = validator.Validate(dto);
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(dto.Subtotal));
        }

        [Fact]
        public async Task AdminController_CreateOrderFromQuoteAndManualOrder_Returns201WithExpectedSource()
        {
            var fakeService = new FakeAdminManagementService();
            var controller = BuildController(fakeService);

            var fromQuoteResult = await controller.CreateOrderFromQuote(
                "quote-1",
                new AdminCreateOrderFromQuoteDto
                {
                    AddressLine = "KTX Khu A",
                    ShippingFee = 0m,
                    IsPaid = true
                },
                CancellationToken.None);

            var quoteCreated = Assert.IsType<ObjectResult>(fromQuoteResult);
            Assert.Equal(StatusCodes.Status201Created, quoteCreated.StatusCode);
            var quoteOrder = Assert.IsType<AdminOrderDetailDto>(quoteCreated.Value);
            Assert.Equal("Rfq", quoteOrder.Source);
            Assert.Equal("quote-1", quoteOrder.QuoteRequestId);
            Assert.Equal("Paid", quoteOrder.PaymentStatus);

            var manualResult = await controller.CreateManualOrder(
                new AdminCreateManualOrderDto
                {
                    ReceiverName = "Lớp 12A1",
                    CustomerEmail = "lop12a1@example.com",
                    ReceiverPhone = "0987654321",
                    AddressLine = "THPT Chu Văn An",
                    Source = OrderSource.ManualZalo,
                    IsPaid = false,
                    Items = new List<AdminCreateOrderItemDto>
                    {
                        new() { ProductName = "Áo lớp Polo", Quantity = 40, UnitPrice = 180_000m }
                    }
                },
                CancellationToken.None);

            var manualCreated = Assert.IsType<ObjectResult>(manualResult);
            Assert.Equal(StatusCodes.Status201Created, manualCreated.StatusCode);
            var manualOrder = Assert.IsType<AdminOrderDetailDto>(manualCreated.Value);
            Assert.Equal("ManualZalo", manualOrder.Source);
            Assert.Equal(7_200_000m, manualOrder.Total);
            Assert.Equal("Pending", manualOrder.PaymentStatus);
        }

        [Fact]
        public void AdminDashboardDto_DefaultsRfqMetricsCleanly()
        {
            var dashboard = new AdminDashboardDto
            {
                TotalRevenue = 15_000_000m,
                TotalQuotes = 10,
                AcceptedQuotes = 4,
                InProductionQuotes = 1,
                CompletedQuotes = 2,
                QuoteConversionRate = 70.0m
            };

            Assert.Equal(15_000_000m, dashboard.TotalRevenue);
            Assert.Equal(70.0m, dashboard.QuoteConversionRate);
            Assert.Empty(dashboard.LowStockProducts);
        }

        private static AdminController BuildController(IAdminManagementService managementService)
        {
            var controller = new AdminController(
                new StubDashboardService(),
                managementService,
                new CreateProductValidator(),
                new UpdateProductValidator(),
                new AdminCreateOrderFromQuoteDtoValidator(),
                new AdminCreateManualOrderDtoValidator());

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[]
                        {
                            new Claim(ClaimTypes.NameIdentifier, "admin-1"),
                            new Claim(ClaimTypes.Role, "Admin")
                        },
                        "Test"))
                }
            };

            return controller;
        }

        private sealed class StubDashboardService : IAdminDashboardService
        {
            public Task<AdminDashboardDto> GetDashboardAsync(int lowStockThreshold = 5, int recentOrdersLimit = 10, CancellationToken ct = default)
                => Task.FromResult(new AdminDashboardDto());
        }

        private sealed class FakeAdminManagementService : IAdminManagementService
        {
            public Task<AdminOrderDetailDto> CreateOrderFromQuoteAsync(string quoteRequestId, AdminCreateOrderFromQuoteDto dto, string? adminUserId, CancellationToken ct = default)
                => Task.FromResult(new AdminOrderDetailDto
                {
                    Id = "ord-rfq-1",
                    OrderCode = "ORD-20261112-ABCD",
                    Source = OrderSource.Rfq.ToString(),
                    QuoteRequestId = quoteRequestId,
                    AddressLine = dto.AddressLine,
                    Subtotal = dto.Subtotal ?? 5_000_000m,
                    ShippingFee = dto.ShippingFee,
                    Total = (dto.Subtotal ?? 5_000_000m) + dto.ShippingFee,
                    PaymentStatus = dto.IsPaid ? "Paid" : "Pending"
                });

            public Task<AdminOrderDetailDto> CreateManualOrderAsync(AdminCreateManualOrderDto dto, string? adminUserId, CancellationToken ct = default)
            {
                var subtotal = dto.Items.Sum(i => i.Quantity * i.UnitPrice);
                return Task.FromResult(new AdminOrderDetailDto
                {
                    Id = "ord-zalo-1",
                    OrderCode = "ORD-20261112-ZALO",
                    Source = dto.Source.ToString(),
                    ReceiverName = dto.ReceiverName,
                    ReceiverPhone = dto.ReceiverPhone,
                    AddressLine = dto.AddressLine,
                    Subtotal = subtotal,
                    ShippingFee = dto.ShippingFee,
                    Total = subtotal + dto.ShippingFee,
                    PaymentStatus = dto.IsPaid ? "Paid" : "Pending"
                });
            }

            public Task<AdminOrderDetailDto> UpdateOrderPaymentStatusAsync(string orderId, AdminUpdateOrderPaymentDto dto, string? adminUserId, CancellationToken ct = default)
                => Task.FromResult(new AdminOrderDetailDto { Id = orderId, PaymentStatus = dto.IsPaid ? "Paid" : "Pending" });

            public Task<AdminPagedResultDto<AdminUserListItemDto>> GetUsersAsync(string? search = null, string? role = null, int page = 1, int pageSize = 20, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminUserDetailDto> GetUserByIdAsync(string userId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task DeleteUserAsync(string userId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminUserDetailDto> UpdateUserRoleAsync(string userId, AdminUpdateUserRoleDto dto, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminUserDetailDto> UpdateUserAsync(string userId, AdminUpdateUserDto dto, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminPagedResultDto<AdminOrderListItemDto>> GetOrdersAsync(string? search = null, string? status = null, int page = 1, int pageSize = 20, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminOrderDetailDto> GetOrderByIdAsync(string orderId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminOrderDetailDto> UpdateOrderStatusAsync(string orderId, AdminUpdateOrderStatusDto dto, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminOrderDetailDto> UpdateOrderDetailsAsync(string orderId, AdminUpdateOrderDetailsDto dto, string? actorUserId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminPagedResultDto<ProductSummaryDto>> GetProductsAsync(string? search = null, bool? isActive = null, int page = 1, int pageSize = 20, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ProductDto> GetProductByIdAsync(string productId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ProductDto> CreateProductAsync(CreateProductDto dto, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ProductDto> UpdateProductAsync(string productId, UpdateProductDto dto, CancellationToken ct = default) => throw new NotImplementedException();
            public Task DeleteProductAsync(string productId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<ProductDto> ToggleProductActiveAsync(string productId, CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminSettingsDto> GetSettingsAsync(CancellationToken ct = default) => throw new NotImplementedException();
            public Task<AdminSettingsDto> UpdateSettingsAsync(UpdateAdminSettingsDto dto, CancellationToken ct = default) => throw new NotImplementedException();
        }
    }
}

