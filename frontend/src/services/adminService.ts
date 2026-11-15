import { http } from "../lib/http";
import api from "../api/apiClient";
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
  AdminUpdateOrderDetailsDto,
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
    return http.get<AdminPagedResultDto<AdminOrderListItemDto>>("/order-management", {
      params: filters,
    });
  },

  getOrderById(orderId: string) {
    return http.get<AdminOrderDetailDto>(`/order-management/${orderId}`);
  },

  createOrderFromQuote(quoteRequestId: string, dto: AdminCreateOrderFromQuoteDto) {
    return http.post<AdminOrderDetailDto>(
      `/admin/orders/from-quote/${encodeURIComponent(quoteRequestId)}`,
      dto
    );
  },

  createManualOrder(dto: AdminCreateManualOrderDto) {
    return http.post<AdminOrderDetailDto>("/order-management", dto);
  },

  updateOrderStatus(orderId: string, dto: AdminUpdateOrderStatusDto) {
    return http.patch<AdminOrderDetailDto>(`/order-management/${orderId}/status`, dto);
  },

  updateOrderDetails(orderId: string, dto: AdminUpdateOrderDetailsDto) {
    return http.put<AdminOrderDetailDto>(`/order-management/${orderId}/details`, dto);
  },

  uploadOrderFiles(orderId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file, file.name));
    return http.post<import("../@types/quoteRequest.type").LogoFileRefDto[]>(
      `/order-management/${orderId}/files`,
      formData
    );
  },

  deleteOrderFile(orderId: string, fileName: string) {
    return http.delete<import("../@types/quoteRequest.type").LogoFileRefDto[]>(
      `/order-management/${encodeURIComponent(orderId)}/files/${encodeURIComponent(fileName)}`
    );
  },

  async getOrderFileBlob(orderId: string, fileName: string) {
    const response = await api.get<Blob>(
      `/order-management/${encodeURIComponent(orderId)}/files/${encodeURIComponent(fileName)}`,
      { responseType: "blob" }
    );
    return response.data;
  },

  async downloadOrderFile(orderId: string, fileName: string, originalName: string) {
    const url = URL.createObjectURL(await this.getOrderFileBlob(orderId, fileName));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async previewOrderFile(orderId: string, fileName: string) {
    const url = URL.createObjectURL(await this.getOrderFileBlob(orderId, fileName));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  updateOrderPaymentStatus(orderId: string, dto: AdminUpdateOrderPaymentDto) {
    return http.patch<AdminOrderDetailDto>(`/order-management/${orderId}/payment-status`, dto);
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
