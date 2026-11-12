import { http } from "../lib/http";
import type {
  AdminCreateManualOrderDto,
  AdminCreateOrderFromQuoteDto,
  AdminDashboardDto,
  AdminOrderDetailDto,
  AdminOrderListItemDto,
  AdminPagedResultDto,
  AdminSettingsDto,
  AdminUpdateOrderPaymentDto,
  AdminUpdateOrderStatusDto,
  AdminUpdateUserDto,
  AdminUpdateUserRoleDto,
  AdminUserDetailDto,
  AdminUserListItemDto,
  UpdateAdminSettingsDto,
  UpdateShopContactDto,
} from "../@types/admin.type";
import type {
  CreateProductDto,
  ProductDto,
  ProductSummaryDto,
  UpdateProductDto,
} from "../@types/product.type";
import type {
  AssignQuoteAdminDto,
  PagedQuoteRequestDto,
  QuoteRequestDto,
  QuoteRequestFilterDto,
  UpdateQuotePriceDto,
  UpdateQuoteStatusDto,
} from "../@types/quoteRequest.type";
import type { ShopContactDto } from "../@types/shopContact.type";

export type AdminUserFilters = {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
};

export type AdminOrderFilters = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type AdminProductFilters = {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export const adminService = {
  getDashboard(lowStockThreshold = 5, recentOrdersLimit = 5) {
    return http.get<AdminDashboardDto>("/admin/dashboard", {
      params: { lowStockThreshold, recentOrdersLimit },
    });
  },

  getUsers(filters: AdminUserFilters = {}) {
    return http.get<AdminPagedResultDto<AdminUserListItemDto>>("/admin/users", {
      params: filters,
    });
  },

  getUserById(userId: string) {
    return http.get<AdminUserDetailDto>(`/admin/users/${userId}`);
  },

  updateUserRole(userId: string, dto: AdminUpdateUserRoleDto) {
    return http.patch<AdminUserDetailDto>(`/admin/users/${userId}/role`, dto);
  },

  updateUser(userId: string, dto: AdminUpdateUserDto) {
    return http.put<AdminUserDetailDto>(`/admin/users/${userId}`, dto);
  },

  deleteUser(userId: string) {
    return http.delete(`/admin/users/${userId}`);
  },

  getOrders(filters: AdminOrderFilters = {}) {
    return http.get<AdminPagedResultDto<AdminOrderListItemDto>>("/admin/orders", {
      params: filters,
    });
  },

  getOrderById(orderId: string) {
    return http.get<AdminOrderDetailDto>(`/admin/orders/${orderId}`);
  },

  createOrderFromQuote(quoteRequestId: string, dto: AdminCreateOrderFromQuoteDto) {
    return http.post<AdminOrderDetailDto>(
      `/admin/orders/from-quote/${encodeURIComponent(quoteRequestId)}`,
      dto
    );
  },

  createManualOrder(dto: AdminCreateManualOrderDto) {
    return http.post<AdminOrderDetailDto>("/admin/orders", dto);
  },

  updateOrderStatus(orderId: string, dto: AdminUpdateOrderStatusDto) {
    return http.patch<AdminOrderDetailDto>(`/admin/orders/${orderId}/status`, dto);
  },

  updateOrderPaymentStatus(orderId: string, dto: AdminUpdateOrderPaymentDto) {
    return http.patch<AdminOrderDetailDto>(`/admin/orders/${orderId}/payment-status`, dto);
  },

  getQuotes(filters: QuoteRequestFilterDto = {}) {
    return http.get<PagedQuoteRequestDto>("/admin/quote-requests", {
      params: filters,
    });
  },

  getQuoteById(id: string) {
    return http.get<QuoteRequestDto>(`/admin/quote-requests/${encodeURIComponent(id)}`);
  },

  updateQuoteStatus(id: string, dto: UpdateQuoteStatusDto) {
    return http.patch<QuoteRequestDto>(
      `/admin/quote-requests/${encodeURIComponent(id)}/status`,
      dto
    );
  },

  updateQuotePrice(id: string, dto: UpdateQuotePriceDto) {
    return http.put<QuoteRequestDto>(
      `/admin/quote-requests/${encodeURIComponent(id)}/quote`,
      dto
    );
  },

  assignQuoteAdmin(id: string, dto: AssignQuoteAdminDto) {
    return http.patch<QuoteRequestDto>(
      `/admin/quote-requests/${encodeURIComponent(id)}/assign`,
      dto
    );
  },

  getProducts(filters: AdminProductFilters = {}) {
    return http.get<AdminPagedResultDto<ProductSummaryDto>>("/admin/products", {
      params: filters,
    });
  },

  getProductById(productId: string) {
    return http.get<ProductDto>(`/admin/products/${productId}`);
  },

  createProduct(dto: CreateProductDto) {
    return http.post<ProductDto>("/admin/products", dto);
  },

  updateProduct(productId: string, dto: UpdateProductDto) {
    return http.put<ProductDto>(`/admin/products/${productId}`, dto);
  },

  deleteProduct(productId: string) {
    return http.delete(`/admin/products/${productId}`);
  },

  toggleProductActive(productId: string) {
    return http.patch<ProductDto>(`/admin/products/${productId}/toggle-active`);
  },

  getSettings() {
    return http.get<AdminSettingsDto>("/admin/settings");
  },

  updateSettings(dto: UpdateAdminSettingsDto) {
    return http.put<AdminSettingsDto>("/admin/settings", dto);
  },

  updateShopContact(dto: UpdateShopContactDto) {
    return http.put<ShopContactDto>("/admin/shop-contact", dto);
  },
};
