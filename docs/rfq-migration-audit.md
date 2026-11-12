# HauShop — RFQ Migration Audit Report (Phase 1)

> **Scope:** Chỉ audit hiện trạng codebase tại `d:\Nam4\HauShop_EBU` (không chỉnh sửa source code).  
> **Target:** Chuyển đổi HauShop từ mô hình e-commerce (Cart → Checkout → Payment → Order) sang hệ thống đặt áo custom CLB/áo lớp theo mô hình **RFQ (Request For Quotation)** + Chat nội bộ theo sản phẩm + Tư vấn Zalo.

---

## 0. Tóm tắt kiến trúc & Phát hiện quan trọng (Baseline Findings)

1. **Backend runtime & kiến trúc thực tế:** `api/api.csproj` đang target **`net9.0`** (không phải `.NET 8`), dùng `Pomelo.EntityFrameworkCore.MySql` 9.0.0, `StackExchange.Redis` 2.8.0, `FluentValidation.AspNetCore` 11.3.0, `AutoMapper` 13.0.1, `MailKit` 4.10.0, `CloudinaryDotNet` 1.28.0, `VNPAY.NET` 2.1.0, và ASP.NET Core SignalR. Codebase tổ chức theo **layered monolith trong 1 project `api/`** (`controllers/`, `services/`, `repositories/`, `models/`, `data/`, `DTOs/`, `mappings/`, `validators/`, `hubs/`, `middlewares/`), chưa tách thành nhiều assemblies Clean Architecture.
2. **Frontend state management (đính chính ARCH-1):** Kiểm tra `frontend/package.json` và `frontend/src/` cho thấy **KHÔNG có Redux** (`@reduxjs/toolkit`, `react-redux`) và **KHÔNG có Cart Context**. State giỏ hàng hiện chỉ dùng **TanStack React Query** (`frontend/src/hooks/useCart.ts`, `queryKeys.cart.me`) kết hợp mapper `cartDtoToState` (`frontend/src/lib/cart.ts`). `react-hook-form` và `zod` chưa có trong `frontend/package.json`.
3. **Background jobs:** **Không có Hangfire** trong repo. Hiện chỉ có `ProductSearchWarmupService` (`BackgroundService`) và `RedisEventBus` (`PublishAsync` / `StreamAddAsync` trên Redis, hiện chưa có consumer worker đọc stream `haushop:v1:streams:*`).
4. **Realtime & Chat sẵn có:** Đã có `ChatHub` (`/hubs/chat`) và `NotificationHub` (`/hubs/notifications`) dùng Cookie JWT + SignalR, kèm `SupportTicket`, `ChatRoom`, `ChatMessage`, `UserConnection` (tracking `User.IsOnline`, `User.LastSeen`).
5. **Lỗ hổng bảo mật cần xử lý khi migrate:** `api/controllers/cloud/ImageController.cs` (`POST /api/image/upload`, `DELETE /api/image/delete`) hiện **thiếu `[Authorize]`**, cho phép anonymous upload/xóa ảnh Cloudinary.
6. **Trạng thái Git hiện tại:** Working tree đang có thay đổi unstaged ở nhiều file (`api/Program.cs`, `api/data/ApplicationDbContext.cs`, `api/services/implementations/order/OrderService.cs`, `api/repositories/implementations/ProductRepository.cs`, một số migrations, `.env.example`, `docker-compose*.yml`, và các ảnh cũ đã xóa dưới `frontend/src/assets/images/products/`). Cần dọn/commit snapshot hiện tại trước khi tạo PR migrate.

---

## 1. Inventory & Phân loại thành phần (`REMOVE` / `REFACTOR` / `KEEP` / `NEW`)

### 1.1 Backend — Entities, Enums & DbContext (`api/models/`, `api/data/`)

| File path | Vai trò hiện tại | Phân loại | Lý do |
|---|---|---|---|
| `api/models/entities/Cart.cs` | Entity giỏ hàng 1-1 với `User` | `REMOVE` *(PR cuối)* | Mô hình RFQ không dùng giỏ hàng |
| `api/models/entities/CartItem.cs` | Item trong giỏ hàng (`ProductVariantId`, `Quantity`, `Price`) | `REMOVE` *(PR cuối)* | Không còn add-to-cart |
| `api/models/entities/Order.cs` | Đơn hàng (`Subtotal`, `ShippingFee`, `Total`, `Status`, `ShippingAddressId`) | `REFACTOR` → `KEEP (Read-Only)` | Giữ lịch sử đơn cũ read-only trước khi archive/drop |
| `api/models/entities/OrderItem.cs` | Chi tiết sản phẩm theo biến thể trong đơn hàng | `KEEP (Read-Only)` | Phục vụ tra cứu lịch sử đơn cũ |
| `api/models/entities/OrderStatusHistory.cs` | Lịch sử trạng thái đơn hàng | `KEEP (Read-Only)` | Phục vụ lịch sử đơn cũ |
| `api/models/entities/Payment.cs` | Giao dịch thanh toán (`COD`, `VNPay`, `TransactionNo`, `PaidAt`) | `KEEP (Read-Only)` | Liên quan đối soát tài chính đơn cũ |
| `api/models/entities/ShippingDetail.cs` | Thông tin vận chuyển theo `OrderId` | `KEEP (Read-Only)` | Thuộc luồng order cũ |
| `api/models/entities/ShippingTrackingEvent.cs` | Sự kiện tracking vận chuyển | `KEEP (Read-Only)` | Thuộc luồng order cũ |
| `api/models/enums/OrderStatus.cs` | 18 trạng thái đơn e-commerce | `KEEP (Read-Only)` | Dùng cho bảng `Orders` cũ |
| `api/models/enums/PaymentMethod.cs` | `COD`, `VNPay`, ... | `KEEP (Read-Only)` | Dùng cho bảng `Payments` cũ |
| `api/models/enums/PaymentStatus.cs` | `Pending`, `Paid`, `Failed`, ... | `KEEP (Read-Only)` | Dùng cho bảng `Payments` cũ |
| `api/models/enums/ShippingMethod.cs` | Phương thức giao hàng | `KEEP (Read-Only)` | Dùng cho bảng `ShippingDetails` cũ |
| `api/models/entities/Product.cs` | Có `Price`, `Stock`, `Taxable`, `CartItems`, `OrderItems`, `ProductVariants` | `REFACTOR` | Bỏ phụ thuộc stock/cart; thêm `BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`, `AvailableMaterials`, `AvailablePrintTechniques`, `MinOrderQuantity` |
| `api/models/entities/ProductVariant.cs` | Biến thể `Size`/`Color`/`Sku`/`Price`/`Stock` | `REFACTOR` | Bỏ `CartItems`, không enforce `Stock` khi đặt; giữ/tái dùng làm gợi ý màu/size hoặc tách sang cấu hình sản phẩm |
| `api/models/entities/User.cs` | Có navigation `Cart`, `Orders`, `SupportTickets*`, `Connections`, `Notifications` | `REFACTOR` | Xóa navigation `Cart` ở PR cuối; thêm navigation `QuoteRequests` |
| `api/models/entities/AdminSetting.cs` | Chứa `StoreName`, `SupportEmail`, `SupportPhone`, `LowStockThreshold`, `RecentOrdersLimit`, `EnableOrderNotifications`, `EnableInventoryAlerts` | `REFACTOR` | Tái sử dụng / mở rộng hoặc tách `ShopContact` (ZaloPhone, ZaloOAId, Hotline, Email, MessengerLink) và cấu hình thông báo RFQ |
| `api/models/entities/ChatRoom.cs` | Phòng chat (`Support`, `Internal`, `AiSupport`) | `REFACTOR` | Gắn thêm ngữ cảnh `ProductId` / `QuoteRequestId` (hoặc tạo `ChatConversation` theo spec) |
| `api/models/entities/ChatMessage.cs` | Tin nhắn (`Message`, `MessageType`, `IsRead`, `ReadAt`) | `REFACTOR` | Bổ sung `Attachments` (JSON/list URL) & sanitize HTML/XSS |
| `api/models/entities/SupportTicket.cs` | Mapping `CustomerId`, `AssignedToId`, `ChatRoomId`, `Subject`, `Status`, `Priority` | `REFACTOR` | Gắn thêm `ProductId`, `QuoteRequestId` hoặc thay/hợp nhất với `ChatConversation` |
| `api/models/entities/Notification.cs` & `NotificationType.cs` | Thông báo realtime (`OrderStatus`, `Payment`, `Return`, `Refund`, `ChatMessage`, `OrderId`) | `REFACTOR` | Thêm `QuoteRequest` / `QuoteStatus` enum values & `QuoteRequestId` (nullable) |
| `api/data/ApplicationDbContext.cs` | Cấu hình toàn bộ DbSet, index, check constraint (`CK_CartItem_Quantity`, `CK_Product_Stock`, `CK_Variant_Stock`, ...) | `REFACTOR` | Thêm cấu hình `QuoteRequest`, `ShopContact`, `ChatConversation`/`ChatMessage`; giữ/migrate bảng cũ; gỡ `Cart`/`CartItem` ở PR cuối |
| `api/Migrations/*.cs` | 13 migrations hiện có (`20260410...` → `20260528...`) | `KEEP` | **Không sửa migration cũ**; mọi thay đổi schema tạo migration mới |
| `api/data/seed/OrderSeedDataStore.cs` & `SeedDataStore.cs` | Seed catalog + 40+ customer orders mẫu | `REFACTOR` | Bỏ/tắt seed order tự động trong luồng seed mặc định; seed dữ liệu áo custom (`BasePrice`, `OriginalPrice`, `DiscountPercent`, `Materials`, `PrintTechniques`, `ShopContact`, sample `QuoteRequest`) |
| *(Mới)* `QuoteRequest`, `QuoteStatus`, `PrintTechnique`, `ShopContact`, `ChatConversation` | Mô hình RFQ + cấu hình liên hệ shop + hội thoại gắn SP/RFQ | `NEW` | Core domain mới của Phase 2 |

### 1.2 Backend — Controllers, Services, Repositories, DTOs, Validators, Mappings (`api/`)

| File path | Vai trò hiện tại | Phân loại | Lý do |
|---|---|---|---|
| `api/controllers/cart/CartController.cs` | 7 endpoints `/api/cart/*` | `REMOVE` | Xóa tính năng giỏ hàng |
| `api/services/interfaces/cart/ICartService.cs` & `ICartCacheService.cs` | Contract cart service + cache | `REMOVE` | Không còn cart |
| `api/services/implementations/cart/CartService.cs` & `CartCacheService.cs` | Nghiệp vụ cart & Redis cache cart | `REMOVE` | Không còn cart |
| `api/repositories/interfaces/ICartRepository.cs` & `CartRepository.cs` | Query bảng `Carts`, `CartItems` | `REMOVE` | Không còn cart |
| `api/DTOs/cart/*.cs` (`AddCartItemDto`, `CartDto`, `CartItemDto`, `MergeGuestCartDto`, `UpdateCartItemDto`) | DTO giỏ hàng | `REMOVE` | Không còn cart |
| `api/validators/cart/*.cs` (`AddCartItemDtoValidator`, `MergeGuestCartDtoValidator`, `UpdateCartItemDtoValidator`) | Validator giỏ hàng | `REMOVE` | Không còn cart |
| `api/controllers/order/OrderController.cs` | Checkout, `my`, `{id}`, `cancel`, `complete`, `seller/{id}/status`, `vnpay-return`, `vnpay-ipn` | `REMOVE` hoặc `REFACTOR` (Read-Only `GET` lịch sử) | Bỏ `POST /checkout`, `vnpay-return`, `vnpay-ipn`, `cancel`, `complete`, `seller/status`; quyết định giữ `GET my/{id}` read-only hay tắt hẳn |
| `api/services/interfaces/order/IOrderService.cs` & `OrderService.cs` | Checkout transaction, trừ kho `variant.Stock`, tạo Payment, gọi `VnPayService`, `IEventBus`, `INotificationService` | `REMOVE` / `REFACTOR` | Gỡ hoàn toàn checkout & trừ kho; chỉ giữ read-only query nếu còn cần tra đơn lịch sử |
| `api/repositories/interfaces/IOrderRepository.cs` & `OrderRepository.cs` | Truy vấn `Orders` | `KEEP (Read-Only)` hoặc `REMOVE` | Tùy quyết định lưu trữ lịch sử đơn |
| `api/DTOs/order/*.cs` (9 files) & `api/mappings/OrderMapping.cs` | DTO + mapping đơn hàng & VNPay IPN | `REMOVE` / `KEEP (Read-Only)` | Theo `OrderController` |
| `api/validators/order/CreateOrderDtoValidator.cs` | Validator checkout | `REMOVE` | Không còn checkout |
| `api/controllers/payment` *(không có)*, `api/services/interfaces/payment/IVNPayService.cs`, `VnPayService.cs`, `api/middlewares/VnPayOptions.cs` | Tích hợp cổng thanh toán VNPay | `REMOVE` | Không thanh toán online trong Phase 2; gỡ package `VNPAY.NET` sau khi dọn |
| `api/controllers/admin/AdminController.cs` | Dashboard, Users, Orders, Products, Inventory, Settings | `REFACTOR` | Bỏ/tắt endpoints Inventory (`updateInventory`, `inventory/overview`) và Orders (hoặc giữ read-only); thêm Admin RFQ endpoints + `ShopContact` settings |
| `api/services/interfaces/admin/IAdminDashboardService.cs` & `AdminDashboardService.cs` | Thống kê `TotalRevenue`, `TotalOrders`, `TopSellingProducts`, `LowStockProducts`, `RecentOrders` | `REFACTOR` | Chuyển KPI sang thống kê RFQ (`TotalQuotes`, theo `QuoteStatus`, `ConversionRate` Accepted/Total, top sản phẩm được hỏi báo giá, bỏ `LowStockProducts`/revenue giả định từ Payments) |
| `api/services/interfaces/admin/IAdminManagementService.cs` & `AdminManagementService.cs` | CRUD Users, Orders, Products, Inventory, AdminSettings | `REFACTOR` | Bỏ logic stock/inventory; cập nhật `CreateProduct`/`UpdateProduct` theo field giá mới (`BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`, `AvailableMaterials`, `AvailablePrintTechniques`, `MinOrderQuantity`); mở rộng settings cho `ShopContact` |
| `api/DTOs/admin/AdminDashboardDto.cs` & `AdminDtos.cs` | DTO dashboard & quản trị | `REFACTOR` | Thêm DTO RFQ & ShopContact, gỡ inventory/order metrics |
| `api/controllers/product/ProductController.cs` & `ProductService.cs` & `ProductRepository.cs` & `ProductMapping.cs` & `api/DTOs/product/*.cs` & `api/validators/product/*.cs` | Catalog sản phẩm, full-text search, mapping, Redis cache | `REFACTOR` | Bỏ lọc/hiển thị theo `Stock`, bỏ `LowStockProductDto`, thêm field giá tham khảo (`BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`), chất liệu, kỹ thuật in, MOQ |
| `api/repositories/interfaces/IProductVariantRepository.cs` & `ProductVariantRepository.cs` | Query `ProductVariant` kèm `Product` cho `CartService` & `OrderService` | `REMOVE` hoặc `REFACTOR` | Chỉ phục vụ cart/checkout hiện tại |
| `api/mappings/WishlistMapping.cs` | Map `Wishlist` → `ProductSummaryDto` (có `DefaultVariantId`, `TotalStock`, `Stock`) | `REFACTOR` | Đồng bộ khi bỏ `Stock`/`DefaultVariantId` trên `ProductSummaryDto` |
| `api/controllers/chat/ChatController.cs`, `api/hubs/ChatHub.cs`, `api/services/implementations/chat/ChatService.cs`, `api/DTOs/chat/ChatDtos.cs`, `api/validators/chat/*.cs` | Chat hỗ trợ & AI qua SignalR + REST | `REFACTOR` | Gắn `ProductId` / `QuoteRequestId` vào room/conversation, trả trạng thái online/offline của Admin, hỗ trợ đính kèm/card sản phẩm ở tin đầu, sanitize XSS |
| `api/services/implementations/chat/AiChatService.cs` | Đang lọc `p.Stock > 0`, đọc `Orders` của customer để trả lời trạng thái đơn | `REFACTOR` | Bỏ điều kiện `Stock > 0`; chuyển ngữ cảnh sang tư vấn áo custom, chất liệu, kỹ thuật in, số lượng tối thiểu và tra cứu `QuoteRequest` của user |
| `api/services/implementations/notification/NotificationService.cs` & `api/controllers/notification/NotificationController.cs` & `api/hubs/NotificationHub.cs` | Realtime notification qua SignalR | `REFACTOR` | Giữ hạ tầng SignalR, thêm `NotifyQuoteCreatedAsync` (cho Admin) & `NotifyQuoteStatusChangedAsync` / `NotifyQuotePricedAsync` (cho User) |
| `api/services/implementations/auth/EmailService.cs` & `IEmailService.cs` | Gửi mail OTP/Verify/PasswordChanged | `REFACTOR` | Thêm template email thông báo RFQ mới cho Admin & báo giá cho khách |
| `api/controllers/cloud/ImageController.cs` & `CloudinaryService.cs` | Upload/xóa ảnh Cloudinary | `REFACTOR` | Bắt buộc thêm `[Authorize]` cho `ImageController`; bổ sung service/endpoint upload file logo an toàn (whitelist png/jpg/svg-sanitized/pdf/ai, magic-bytes/MIME check, giới hạn size, đổi tên UUID, chống path traversal) |
| `api/controllers/seed/SeedController.cs` & `SeedService.cs` | API seed DB (Admin only) | `REFACTOR` | Bỏ `orders/run`, `orders/clear` hoặc tách riêng; seed dữ liệu RFQ/ShopContact |
| `api/middlewares/GlobalExceptionHandler.cs` & `api/common/ClientErrorMessages.cs` | Chuẩn hóa `ProblemDetails`, không leak exception | `KEEP` | Dùng chung cho toàn bộ API RFQ mới |
| `api/middlewares/RedisLoginRateLimitMiddleware.cs` | Rate limit login bằng Redis | `REFACTOR` / `KEEP` | Tái sử dụng pattern (hoặc ASP.NET `AddRateLimiter` + Redis) cho public `POST /api/quote-requests` |
| `api/Program.cs` | DI, Auth/JWT, CORS, Swagger, SignalR, Redis | `REFACTOR` | Gỡ DI Cart/Order/VnPay; đăng ký QuoteRequest, ShopContact, LogoUpload, RateLimiter, Webhook notification |
| *(Mới)* `QuoteRequestController`, `AdminQuoteRequestController`, `ShopContactController`, `IQuoteRequestService`, `QuoteRequestService`, `IShopContactService`, `ShopContactService`, `WebhookNotificationService`, Validators | Luồng RFQ, quản trị báo giá, ShopContact public/admin, webhook Telegram/Zalo | `NEW` | Core API Phase 2 |

### 1.3 Backend — Redis Cache Keys, Streams & SignalR (`api/`)

| Thành phần / Key | Vị trí | Phân loại | Lý do |
|---|---|---|---|
| `haushop:v1:cart:user:{userId}` (`CacheKeys.UserCart`) | `CacheKeys.cs`, `CartCacheService.cs` | `REMOVE` | Không còn cart |
| `haushop:v1:cart:guest:{guestId}` (`CacheKeys.GuestCart`) | `CacheKeys.cs` | `REMOVE` | Không còn guest cart |
| `haushop:v1:events:order-created`, `haushop:v1:events:inventory-changed`, `haushop:v1:streams:order-events` | `IEventBus.cs` (`EventTopics`), `OrderService.cs` | `REMOVE` / `REFACTOR` | Không còn order/inventory event; có thể thay bằng `quote-created` nếu cần |
| `haushop:v1:product:*`, `haushop:v1:category:*`, `haushop:v1:homepage:*` | `CacheKeys.cs`, `ProductService.cs` | `KEEP` | Tiếp tục cache catalog & invalidate khi admin sửa SP |
| `haushop:v1:auth:*`, `haushop:v1:rate-limit:login:*` | `CacheKeys.cs`, `RedisLoginRateLimitMiddleware.cs` | `KEEP` | Giữ nguyên auth & rate-limit login; thêm key `rate-limit:rfq:*` |
| *(Mới)* `haushop:v1:shop-contact` | `CacheKeys.cs` | `NEW` | Cache public `GET /api/shop-contact` (invalidate khi Admin cập nhật) |
| `/hubs/chat` (`ChatHub.cs`) | `Program.cs`, `ChatHub.cs` | `REFACTOR` | Giữ hub, thêm presence online/offline của admin (`AdminOnlineStatus`) & room context theo Product/RFQ |
| `/hubs/notifications` (`NotificationHub.cs`) | `Program.cs`, `NotificationHub.cs` | `KEEP` | Dùng đẩy realtime notification cho RFQ mới & cập nhật báo giá |
| `ProductSearchWarmupService` | `api/services/implementations/product/ProductSearchWarmupService.cs` | `REFACTOR` | Đổi `WarmupQueries` ("Sneaker", "Balo") sang từ khóa áo custom ("Áo có cổ", "Hoodie") |

### 1.4 Frontend — Pages, Components, Hooks, Services, Types, Routes, Storage (`frontend/src/`)

| File path | Vai trò hiện tại | Phân loại | Lý do |
|---|---|---|---|
| `frontend/src/pages/CartPage.tsx` | Trang giỏ hàng | `REMOVE` | Xóa giỏ hàng; redirect `/cart` → `/shop` hoặc trang RFQ |
| `frontend/src/pages/CheckoutPage.tsx` | Trang checkout (địa chỉ, COD/VNPay) | `REMOVE` | Xóa checkout; redirect `/checkout` → `/shop` hoặc trang RFQ |
| `frontend/src/pages/VnPayReturn.tsx` | Trang callback VNPay | `REMOVE` | Không còn thanh toán VNPay |
| `frontend/src/pages/OrderPage.tsx` | Danh sách đơn hàng của tôi | `REMOVE` / `REFACTOR` | Thay bằng `MyQuoteRequestsPage` (hoặc giữ link xem đơn cũ nếu archive) |
| `frontend/src/pages/OrderDetailPage.tsx` | Chi tiết đơn hàng, tracking, hủy/hoàn thành | `REMOVE` / `REFACTOR` | Thay bằng `QuoteRequestDetailPage` (timeline trạng thái RFQ + chat) |
| `frontend/src/pages/MyCancellationsPage.tsx` | Danh sách đơn đã hủy | `REMOVE` | Thuộc luồng order cũ |
| `frontend/src/hooks/useCart.ts`, `frontend/src/lib/cart.ts`, `frontend/src/services/cartService.ts` | React Query hooks & mapper cho Cart | `REMOVE` | Không còn cart (và xác nhận không có Redux/Cart Context) |
| `frontend/src/hooks/useOrder.ts`, `frontend/src/services/orderService.ts`, `frontend/src/lib/orderStatus.ts`, `frontend/src/@types/order.type.ts` | Hooks, API client, step tracking cho Order/Checkout | `REMOVE` | Thay bằng `quoteRequestService.ts`, `useQuoteRequests.ts`, `quoteStatus.ts`, `quoteRequest.type.ts` |
| `frontend/src/components/layout/Header.tsx`, `HeaderActions.tsx`, `MobileDrawer.tsx`, `HeaderIcons.tsx`, `UserMenu.tsx` | Hiện icon + badge `totalQty` giỏ hàng, link `/cart`, `/orders`, `/cancellations` | `REFACTOR` | Xóa cart icon/badge & `useCart`; đổi link UserMenu/MobileDrawer sang "Yêu cầu báo giá của tôi" (`/quotes`) |
| `frontend/src/components/product/ProductCard.tsx` | Hiện tồn kho `HẾT HÀNG` / `Còn X`, nút `Thêm giỏ hàng` & `Mua ngay` | `REFACTOR` | Bỏ trạng thái hết hàng & add-to-cart; hiển thị "Giá từ", giá gốc gạch ngang, badge `-%`, nút "Nhận báo giá" / "Xem chi tiết" |
| `frontend/src/pages/ShopPageDetail.tsx` | Hiện stock, chọn variant theo tồn kho, nút `Thêm vào giỏ hàng` & `Mua ngay` | `REFACTOR` | Hiển thị "Giá từ / Giá gốc gạch ngang / badge -%", ghi chú thay đổi giá, 3 CTA (**Nhận báo giá**, **Chat với shop**, **Tư vấn qua Zalo** có copy prefill clipboard) |
| `frontend/src/components/home/BestSellers.tsx`, `HomeProductSections.tsx`, `HeroBanner.tsx`, `DarkStrip.tsx`, `TrustBar.tsx` | Copywriting "Mua sắm ngay", "Giao hàng miễn phí", "Thanh toán MoMo/VNPAY", "Đổi trả 30 ngày" | `REFACTOR` | Cập nhật thông điệp sang đặt áo custom CLB/áo lớp & báo giá nhanh |
| `frontend/src/components/layout/Footer.tsx` | Có link `Cart`, logo thanh toán `MoMo`, `VNPAY` | `REFACTOR` | Gỡ link `Cart` & badge `MoMo`/`VNPAY`; gắn link RFQ / `ShopContact` |
| `frontend/src/components/chat/SupportChatWidget.tsx`, `SupportChatPanel.tsx`, `AiChatPanel.tsx`, `hooks/useChatConnection.ts`, `services/chatService.ts`, `@types/chat.type.ts` | Chat CSKH & AI floating widget | `REFACTOR` | Gắn context sản phẩm (product card ở tin đầu), unread badge, trạng thái online/offline admin, fallback form để lại SĐT khi offline, floating contact buttons (Phone/Zalo/Messenger) từ `/api/shop-contact` |
| `frontend/src/pages/admin/AdminInventoryPage.tsx` | Trang quản lý tồn kho | `REMOVE` | Bỏ quản lý tồn kho |
| `frontend/src/pages/admin/AdminOrdersPage.tsx` | Trang quản lý đơn hàng | `REMOVE` / `REFACTOR` | Thay bằng `AdminQuoteRequestsPage` (lọc status/date/search, đổi status, nhập giá báo, assign admin, ghi chú nội bộ) |
| `frontend/src/pages/admin/AdminDashboardPage.tsx` | Biểu đồ doanh thu Payment, đơn hàng, `LowStockProducts` | `REFACTOR` | Thay bằng thống kê RFQ theo trạng thái, số lượng yêu cầu theo ngày/tuần/tháng, top sản phẩm được hỏi báo giá |
| `frontend/src/pages/admin/AdminProductsPage.tsx` | Form tạo/sửa sản phẩm có `stock` | `REFACTOR` | Bỏ `stock`, thêm `BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`, `AvailableMaterials`, `AvailablePrintTechniques`, `MinOrderQuantity` |
| `frontend/src/pages/admin/AdminSettingsPage.tsx` | Hiện lưu `LowStockThreshold`, `RecentOrdersLimit`, `EnableOrderNotifications`, `EnableInventoryAlerts` + `localStorage` `haushop_admin_settings` | `REFACTOR` | Chuyển sang cấu hình `ShopContact` (ZaloPhone, ZaloOAId, Hotline, Email, MessengerLink) + bật/tắt thông báo RFQ |
| `frontend/src/pages/admin/AdminUsersPage.tsx` | Tab chi tiết user hiển thị `TotalOrders`, `TotalSpent`, `RecentOrders` | `REFACTOR` | Hiển thị `TotalQuoteRequests`, `RecentQuoteRequests` |
| `frontend/src/pages/admin/AdminLayout.tsx`, `adminShared.tsx`, `services/adminService.ts`, `hooks/useAdmin.ts`, `@types/admin.type.ts` | Menu sidebar `/admin/orders`, `/admin/inventory`, helpers `formatOrderStatusLabel` | `REFACTOR` | Đổi menu sang Báo giá (`/admin/quotes`), bỏ Tồn kho, cập nhật types & hooks |
| `frontend/src/pages/admin/AdminChatPage.tsx` | Quick replies về đơn hàng/còn size/kho | `REFACTOR` | Cập nhật quick replies sang tư vấn áo lớp/CLB, hiển thị card sản phẩm/RFQ đính kèm |
| `frontend/src/App.tsx`, `lib/routes.ts`, `lib/queryKeys.ts`, `lib/cachePolicy.ts`, `lib/notificationLabels.ts`, `context/authContext.tsx` | Routes `/cart`, `/checkout`, `/orders`, `/cancellations`, `/payment/vnpay-return`, `/admin/orders`, `/admin/inventory`; `removeAccountScopedQueries()` xóa `'cart'`, `'orders'` | `REFACTOR` | Redirect `/cart`, `/checkout` → `/shop` (hoặc `/quotes/new`); xóa route thanh toán/tồn kho; thêm route `/quotes`, `/quotes/:id`, `/admin/quotes` |
| `frontend/src/@types/product.type.ts` & `enums.type.ts` | Có `CartDto`, `CartItemDto`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`, `stock` | `REFACTOR` | Xóa Cart types, thêm `QuoteStatus`, `PrintTechnique`, `ShopContactDto`, cập nhật `ProductDto` |
| `frontend/src/pages/WishlistPage.tsx`, `ShopPage.tsx`, `ContactUs.tsx` | Wishlist dùng `ProductCard`; ContactUs có FAQ giao hàng/đổi trả | `REFACTOR` | Wishlist hoạt động bình thường sau khi refactor `ProductCard`; ContactUs có thể link tới RFQ & `/api/shop-contact` |
| *(Mới)* `QuoteRequestModal/Page`, `MyQuotesPage`, `QuoteDetailPage`, `FloatingContactBar`, `AdminQuotesPage`, `quoteRequestService`, `shopContactService` | Toàn bộ UI RFQ, lịch sử báo giá, floating contact, admin RFQ | `NEW` | Phase 2.2 |

**Kiểm kê `localStorage` keys hiện tại trong `frontend/src/`:**
- `_u` (`authContext.tsx`, `apiClient.ts`) → `KEEP` (UserDto UI cache).
- `_auth_last_activity` (`authContext.tsx`) → `KEEP` (idle timeout).
- `haushop_query_cache_v2` & legacy `haushop_query_cache_v1` (`queryClient.ts`, chỉ persist `products` và `categories`) → `KEEP`.
- `haushop_admin_chat_notes` (`AdminChatPage.tsx`) → `KEEP`.
- `haushop_admin_settings` (`AdminSettingsPage.tsx`) → `REFACTOR` (đồng bộ schema settings mới).
- **Không có `localStorage` key nào cho Cart.**

### 1.5 Tests (`tests/api.Tests/`)

| File path | Vai trò hiện tại | Phân loại | Lý do |
|---|---|---|---|
| `tests/api.Tests/Validators/RequestValidatorTests.cs` | Test `CreateOrderDtoValidator`, `AddCartItemDtoValidator`, `SendChatMessageDtoValidator`, `CreateReviewDtoValidator` | `REFACTOR` | Xóa test validator cart/order khi gỡ code; thêm unit test `CreateQuoteRequestDtoValidator`, `UpdateQuotePriceDtoValidator` |
| `tests/api.Tests/Middleware/GlobalExceptionHandlerTests.cs` & `Security/SecurityHelperTests.cs` | Test `ProblemDetails` & security helpers | `KEEP` | Tiếp tục chạy pass qua mọi PR |
| *(Mới)* `QuoteRequestServiceTests.cs`, `QuoteRequestAuthorizationTests.cs`, `FileUploadSecurityTests.cs` | Test state machine `QuoteStatus`, chống IDOR, whitelist upload logo | `NEW` | Bắt buộc theo Phase 2.3 |

---

## 2. Dependency Map & Rủi ro khi xóa

```
Product / ProductVariant (Stock, Price)
  ├── CartService / CartRepository (Stock check, DefaultVariantId)
  ├── OrderService / OrderController (Trừ variant.Stock, tạo OrderItem)
  ├── AdminManagementService (UpdateInventory, GetInventoryOverview, Create/UpdateProduct)
  ├── AdminDashboardService (LowStockProducts, TopSellingProducts)
  ├── AiChatService (Lọc `Stock > 0`, tra cứu `Orders` của customer)
  ├── ProductRepository / ProductMapping / WishlistMapping (`Stock`, `TotalStock`, `DefaultVariantId`)
  └── Frontend: ProductCard, ShopPageDetail, AdminProductsPage, AdminInventoryPage, AdminDashboardPage

Orders / Payments
  ├── AdminDashboardService (TotalOrders, TotalRevenue, Today/MonthRevenue, Daily/Weekly/MonthlyTrend, OrderStatusAnalytics, RecentOrders)
  ├── AdminManagementService (GetUsers/GetUserById -> TotalOrders, TotalSpent, RecentOrders; GetOrders; UpdateOrderStatus)
  ├── NotificationService & Notification.OrderId (NotifyOrderCreated/Paid/StatusChanged -> Link `/orders/{id}`)
  ├── AiChatService (Intent OrderStatus/ReturnExchange đọc `_context.Orders`)
  ├── SeedService & OrderSeedDataStore (Seed 40+ orders)
  └── Frontend: AdminDashboardPage, AdminOrdersPage, AdminUsersPage, OrderPage, OrderDetailPage, MyCancellationsPage, UserMenu, MobileDrawer
```

**Rủi ro chính khi xóa thiếu thứ tự:**
1. **Break compile Backend/Frontend nếu xóa `Order` hoặc `Product.Stock` sớm:** `AdminDashboardService`, `AdminManagementService`, `NotificationService`, `AiChatService`, `WishlistMapping`, `SeedService`, `RequestValidatorTests` đều đang tham chiếu trực tiếp `Orders`, `Payments`, `ProductVariants.Stock`, `Product.Stock`.
2. **Broken links từ `Notifications` cũ trong DB:** Bảng `Notifications` đang lưu `Link = "/orders/{id}"` và `OrderId`. Nếu xóa route `/orders/:id` mà không có fallback/redirect hoặc filter notification cũ, user bấm vào chuông thông báo cũ sẽ ra 404.
3. **Cache cũ trên Redis & localStorage:** `haushop:v1:product:*` và `haushop_query_cache_v2` đang cache `ProductSummaryDto` / `ProductDto` theo schema cũ. Sau khi thêm field mới cho `Product`, cần bump version prefix trong `CacheKeys` (vd `v4`) và `PERSISTED_QUERY_CACHE_KEY` (`v3`).
4. **Checkout/Order seed & `Reviews`:** `ReviewService.CreateAsync` **không** kiểm tra đã mua hàng (`Orders`), chỉ kiểm tra product tồn tại & active → an toàn khi bỏ `Orders`.

---

## 3. Data Impact & Chiến lược dữ liệu cũ

| Bảng DB hiện tại | Mức độ ảnh hưởng | Đề xuất xử lý (KHÔNG tự drop dữ liệu) |
|---|---|---|
| `Carts`, `CartItems` | Dữ liệu tạm thời, không có giá trị pháp lý/kế toán | Ngừng ghi ở PR UI/API; **giữ bảng trống hoặc export backup rồi drop ở PR dọn dẹp cuối cùng** sau khi confirm production không còn client cũ gọi `/api/cart/*`. |
| `Orders`, `OrderItems`, `OrderStatusHistories`, `Payments`, `ShippingDetails`, `ShippingTrackingEvents` | Có dữ liệu lịch sử đơn hàng & thanh toán tài chính (VNPay/COD) | **KHÔNG DROP.** Đổi sang chế độ **Archive / Read-Only** (gỡ checkout tạo mới, giữ bảng trong DB hoặc rename/backup sang `archive_*` ở phase bảo trì sau; nếu cần, giữ endpoint/admin view read-only tạm thời hoặc xuất CSV/SQL dump trước khi ngừng hiển thị). |
| `Products`, `ProductVariants` | Dữ liệu catalog chính | **GIỮ NGUYÊN BẢNG**, chỉ thêm cột mới trên `Products` (`BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`, `AvailableMaterials`, `AvailablePrintTechniques`, `MinOrderQuantity`) với giá trị default/backfill từ `Price`. Không drop cột `Stock` ngay ở PR đầu để tránh downtime khi rollback; có thể ngừng dùng trên UI trước rồi drop/ignore sau. |
| `AdminSettings` | Có 1 row `"default"` | **GIỮ & MIGRATE**, mở rộng thêm cột cho `ShopContact` (hoặc tạo bảng `ShopContacts` riêng có seed từ `AdminSettings.SupportEmail`/`SupportPhone`). |
| `ChatRooms`, `ChatMessages`, `SupportTickets` | Lịch sử chat hỗ trợ cũ | **GIỮ & MỞ RỘNG** (thêm `ProductId`, `QuoteRequestId`, `AttachmentsJson` nullable trên `ChatRooms`/`SupportTickets`/`ChatMessages`) để không mất lịch sử chat cũ và tận dụng luôn SignalR `ChatHub`. |
| `Notifications` | Thông báo cũ có `OrderId` | **GIỮ BẢNG**, thêm `QuoteRequestId` nullable; giữ enum values `0..4` không đổi số thứ tự cũ để tránh sai dữ liệu cũ, chỉ thêm enum value mới (`5 = QuoteCreated`, `6 = QuoteStatusChanged`). |

---

## 4. Security & Performance Checklist cho tính năng mới (Phase 2)

### 4.1 Security Checklist
- [ ] **Authorization & Anti-IDOR:**
  - `GET /api/quote-requests/me`, `GET /api/quote-requests/{id}`: bắt buộc `[Authorize]`; service kiểm tra `quote.UserId == currentUserId` (hoặc `User.IsInRole("Admin")`), trả `403`/`404` nhất quán khi không phải chủ sở hữu.
  - Guest tạo RFQ (`POST /api/quote-requests` với `UserId == null`): trả mã tham chiếu công khai ngắn (`QuoteCode`, vd `RFQ-20261112-XXXX`) + không cho guest truy cập `GET /api/quote-requests/{id}` bằng `id` tuần tự/dễ đoán nếu chưa đăng nhập (dùng GUID/ULID và yêu cầu đăng nhập hoặc lookup token riêng nếu cho tra cứu guest).
  - Admin endpoints (`/api/admin/quote-requests*`, `PUT /api/admin/shop-contact`): bắt buộc `[Authorize(Policy = "AdminOnly")]`.
  - ChatHub & ChatController: kiểm tra room thuộc `CustomerId == userId` hoặc `Admin`.
  - **Fix lỗ hổng sẵn có:** Gắn `[Authorize(Policy = "AdminOnly")]` (hoặc role phù hợp) lên `ImageController.Upload` và `ImageController.Delete`.
- [ ] **FluentValidation nghiêm ngặt:**
  - Phone VN regex: `^(0|\+84)(3|5|7|8|9)[0-9]{8}$` (sau khi normalize khoảng trắng/dấu gạch).
  - `Quantity > 0` và `Quantity >= product.MinOrderQuantity` (nếu có sản phẩm), tổng số lượng trong `SizeBreakdown` khớp hoặc `<=` giới hạn hợp lý (vd `1..100000`).
  - Giới hạn độ dài mọi string (`CustomerName <= 150`, `OrganizationName <= 200`, `Note <= 2000`, `Material <= 100`, `ColorSelection <= 100`, `ChatMessage <= 5000`).
  - Validate `ExpectedDeliveryDate` không ở quá khứ.
- [ ] **Rate Limiting & Anti-Spam cho Public `POST /api/quote-requests`:**
  - Áp dụng Redis sliding/fixed window rate limit theo IP + Phone/Email (tương tự `RedisLoginRateLimitMiddleware` hoặc .NET `RateLimiter`).
  - Kết hợp honeypot field ẩn + (tùy cấu hình) Google reCAPTCHA v3 / Cloudflare Turnstile token verification ở backend trước khi tạo RFQ.
- [ ] **Upload Logo An Toàn:**
  - Whitelist extension: `.png`, `.jpg`, `.jpeg`, `.svg`, `.pdf`, `.ai` (chú ý `.ai` bản chất có thể là PDF/PostScript header).
  - Kiểm tra **magic bytes / file signature** chứ không chỉ tin `Content-Type` hay đuôi file.
  - Giới hạn dung lượng (vd `<= 10MB` / file, tối đa 3–5 file/RFQ).
  - Đổi tên file sang `Guid.NewGuid()` + extension an toàn; strip toàn bộ `Path.GetFileName` chống path traversal (`../`).
  - **SVG Sanitization:** Nếu nhận `.svg`, parse XML và loại bỏ `<script>`, `onload`/`onerror`/`on*` event handlers, `<foreignObject>`, `javascript:` URI, external `<use href="http...">` trước khi lưu/upload (hoặc upload lên Cloudinary với `raw`/sanitized hoặc serve từ object storage riêng với `Content-Disposition: attachment` / `X-Content-Type-Options: nosniff`, **không** lưu và execute trong `wwwroot` cùng origin với quyền script).
- [ ] **XSS & ProblemDetails:**
  - Sanitize/encode toàn bộ nội dung chat & ghi chú RFQ trước khi render (React escape mặc định; tuyệt đối không dùng `dangerouslySetInnerHTML`, kiểm tra URL attachment chỉ cho `https://`).
  - Giữ chuẩn `GlobalExceptionHandler` (`ProblemDetails` + `traceId`), không leak `ex.Message` / stacktrace ra client ở mọi controller mới (lưu ý `SeedController` cũ có trả `ex.Message` — không lặp lại pattern đó).

### 4.2 Performance & Infra Checklist
- [ ] **Database Indexes (MySQL / EF Core):**
  - `QuoteRequests`: `IX_QuoteRequests_Status_CreatedAt (Status, CreatedAt)`, `IX_QuoteRequests_UserId_CreatedAt (UserId, CreatedAt)`, `IX_QuoteRequests_ProductId (ProductId)`, `IX_QuoteRequests_AssignedAdminId_Status (AssignedAdminId, Status)`, `UX_QuoteRequests_QuoteCode (QuoteCode)`.
  - `ChatRooms` / `ChatConversations`: index `(CustomerId, ProductId)`, `(QuoteRequestId)`.
  - `ChatMessages`: đã có `(ChatRoomId, Created)` và `(ChatRoomId, IsRead)`.
- [ ] **Tránh N+1 & Over-fetching:**
  - Tất cả list query (Admin RFQ list, My RFQ list, Chat rooms) dùng `AsNoTracking()` + inline EF Core `.Select(q => new QuoteRequestSummaryDto { ... })`, không `Include` toàn bộ bảng cha/con thừa.
- [ ] **Caching:**
  - Cache `GET /api/shop-contact` trên Redis (`haushop:v1:shop-contact`, TTL 1h, invalidate ngay khi Admin cập nhật).
  - Bump `CacheKeys.ProductListPrefix` lên `v4` và `PERSISTED_QUERY_CACHE_KEY` lên `v3` khi đổi schema `ProductSummaryDto`.
- [ ] **SignalR vs Polling trên VPS RAM hạn chế:**
  - Hiện `ChatHub` + `NotificationHub` đã chạy trên 1 process ASP.NET Core. Để tiết kiệm RAM trên VPS nhỏ: giữ idle timeout hợp lý, giới hạn `MaximumReceiveMessageSize` (vd `64KB`), dọn stale `UserConnections` khi disconnect/startup, và ở frontend chỉ mở kết nối `ChatHub` khi user thực sự mở chat widget / trang RFQ detail / trang Admin chat (lazy connection), có fallback HTTP polling `GET /messages` mỗi 10–15s nếu SignalR mất kết nối.

---

## 5. Đề xuất kế hoạch Migrate theo từng PR nhỏ

| PR | Mục tiêu & Phạm vi | Files chính dự kiến | Cách Test | Rollback Plan |
|---|---|---|---|---|
| **PR 1: Security Hotfix & Product RFQ Metadata + ShopContact Backend** | - Fix `[Authorize]` cho `ImageController`.<br>- Thêm fields RFQ trên `Product` (`BasePrice`, `OriginalPrice`, `DiscountPercent`, `PriceNote`, `AvailableMaterials`, `AvailablePrintTechniques`, `MinOrderQuantity`).<br>- Tạo entity + API `ShopContact` (`GET /api/shop-contact`, `PUT /api/admin/shop-contact`) + Redis cache.<br>- Tạo EF Migration mới (không đụng migration cũ, chưa xóa `Stock`). | `ImageController.cs`, `Product.cs`, `ProductDto.cs`, `ProductMapping.cs`, `ProductRepository.cs`, `ShopContact.cs`, `ShopContactController.cs`, `ApplicationDbContext.cs`, Migration #1 | `dotnet build`, `dotnet test`, test Swagger `GET /api/shop-contact`, verify product API giữ backward compatibility (`Price` vẫn trả `BasePrice`). | `dotnet ef database update <prev_migration>` + revert PR. |
| **PR 2: Backend RFQ Domain, Upload Logo & Notification** | - Tạo `QuoteRequest`, `QuoteStatus`, `PrintTechnique`, DTOs, FluentValidation.<br>- Tạo `QuoteRequestService` (state machine transition), `QuoteRequestController` (public `POST` có rate-limit + honeypot, `GET /me`, `GET /{id}` chống IDOR), `AdminQuoteRequests` endpoints.<br>- Upload logo service (whitelist, magic-bytes, SVG sanitize, rename UUID).<br>- Email template + NotificationHub + optional Telegram/Zalo webhook.<br>- Unit test transition + Integration test IDOR. | `QuoteRequest.cs`, `QuoteRequestController.cs`, `QuoteRequestService.cs`, `LogoUploadService.cs`, `EmailService.cs`, `NotificationService.cs`, `ApplicationDbContext.cs`, Migration #2, `tests/api.Tests/*` | `dotnet test` (pass unit test state machine + integration test IDOR + upload test với file giả mạo MIME). | Rollback migration #2 (`QuoteRequests`), revert PR. Không ảnh hưởng bảng cũ. |
| **PR 3: Backend Chat Context (Product/RFQ) & Admin Presence + Refactor AiChat/Dashboard** | - Mở rộng `ChatRoom`/`SupportTicket`/`ChatMessage` gắn `ProductId`, `QuoteRequestId`, `Attachments`, sanitize XSS.<br>- Thêm endpoint kiểm tra trạng thái admin online (`GET /api/chat/support/availability`) & unread count.<br>- Refactor `AiChatService` (bỏ `Stock > 0`, tư vấn áo custom + tra RFQ), refactor `AdminDashboardService` sang KPI RFQ (hoặc song song). | `ChatRoom.cs`, `ChatMessage.cs`, `SupportTicket.cs`, `ChatService.cs`, `ChatHub.cs`, `ChatController.cs`, `AiChatService.cs`, `AdminDashboardService.cs`, Migration #3 | `dotnet test`, test SignalR send/receive message có product context & XSS payload (`<script>`). | Rollback migration #3, revert PR. |
| **PR 4: Frontend — Xóa Cart/Checkout/VNPay & Refactor Product UI + Floating Contact** | - Gỡ `CartPage`, `CheckoutPage`, `VnPayReturn`, `useCart`, `cartService`, `lib/cart.ts`, `orderService`, `useOrder`, cart icon/badge header.<br>- Redirect `/cart`, `/checkout` → `/shop`.<br>- Refactor `ProductCard` & `ShopPageDetail` (hiển thị "Giá từ / Giá gốc / -%", note giá, 3 CTA: **Nhận báo giá**, **Chat**, **Tư vấn Zalo** với copy clipboard).<br>- Thêm `FloatingContactBar` lấy từ `/api/shop-contact`. | `App.tsx`, `routes.ts`, `Header*.tsx`, `MobileDrawer.tsx`, `Footer.tsx`, `ProductCard.tsx`, `ShopPageDetail.tsx`, `FloatingContactBar.tsx`, `shopContactService.ts` | `npm run build` (`tsc -b && vite build`), `npm run lint`, kiểm tra manual toàn bộ route storefront & mobile responsive. | Revert PR frontend; backend cũ vẫn chưa xóa endpoints nên rollback tức thì. |
| **PR 5: Frontend — RFQ Form, My Quotes, Chat Product Context & Admin RFQ/ShopContact** | - Cài `react-hook-form`, `zod`, `@hookform/resolvers`.<br>- Build RFQ modal/page (prefill profile, upload logo + preview, size matrix, mã tham chiếu RFQ).<br>- Build `MyQuotesPage` & `QuoteDetailPage` (timeline trạng thái + chat gắn RFQ).<br>- Nâng cấp `SupportChatPanel` (card sản phẩm ở tin đầu, online/offline badge, fallback để lại SĐT).<br>- Build `AdminQuotesPage`, cập nhật `AdminDashboardPage`, `AdminProductsPage`, `AdminSettingsPage` (cấu hình `ShopContact`), `AdminUsersPage`, `AdminChatPage`, bỏ `AdminInventoryPage`. | `QuoteRequestForm.tsx`, `MyQuotesPage.tsx`, `QuoteDetailPage.tsx`, `SupportChatPanel.tsx`, `AdminQuotesPage.tsx`, `AdminDashboardPage.tsx`, `AdminProductsPage.tsx`, `AdminSettingsPage.tsx`, `AdminLayout.tsx` | `npm run build`, `npm run lint`, smoke test end-to-end luồng Khách gửi RFQ → Admin báo giá → Khách xem timeline & chat. | Revert PR frontend. |
| **PR 6: Backend Decommission Cart / Checkout / VNPay & Cleanup (Migration tách riêng)** | - Gỡ `CartController`, `CartService`, `CartCacheService`, `CartRepository`, `VnPayService`, `VnPayOptions`, package `VNPAY.NET`, `Cart`/`CartItem` khỏi `ApplicationDbContext` (và gỡ `OrderController` checkout hoặc chuyển sang read-only archive).<br>- Tạo **Migration riêng** drop bảng `Carts`, `CartItems` (sau khi đã backup/confirm production).<br>- Dọn dead code, update `SeedService` & test suite. | `Cart*`, `Order*`, `VnPay*`, `Program.cs`, `api.csproj`, `CacheKeys.cs`, `SeedService.cs`, Migration #4 (Drop Carts/CartItems) | `dotnet build`, `dotnet test`, `npm run build`, `npm run lint`, kiểm tra `dotnet ef migrations script` trước khi apply DB. | Phục hồi từ DB backup (trước khi chạy Migration #4 chỉ cần revert code). |

