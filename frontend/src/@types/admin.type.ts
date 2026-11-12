import type { OrderStatus, PaymentStatus, Role } from "./enums.type";
import type { OrderStatusHistoryDto, ShippingDetailDto } from "./order.type";
import type { QuoteStatus } from "./quoteRequest.type";

export type OrderSource = "Storefront" | "FromQuote" | "ManualZalo";

export interface LowStockProductDto {
  id: string;
  sku: string;
  name: string;
  stock: number;
  isActive: boolean;
}

export interface RecentOrderDto {
  id: string;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  created: string;
}

export interface AdminRecentQuoteDto {
  id: string;
  quoteCode: string;
  customerName: string;
  phone: string;
  organizationName?: string | null;
  productName?: string | null;
  quantity: number;
  quotedPrice?: number | null;
  status: QuoteStatus | string;
  createdAt: string;
}

export interface AdminDashboardDto {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingReviews: number;
  orderStatusCounts: Partial<Record<OrderStatus, number>>;
  lowStockProducts: LowStockProductDto[];
  recentOrders: RecentOrderDto[];
  revenueGrowthPercent: number;
  averageOrderValue: number;
  conversionRate: number | null;
  conversionRateNote?: string | null;
  returningCustomers: number;
  returningCustomerRate: number;
  dailyRevenueTrend: RevenueTrendPointDto[];
  weeklyRevenueTrend: RevenueTrendPointDto[];
  monthlyRevenueTrend: RevenueTrendPointDto[];
  orderStatusAnalytics: OrderStatusAnalyticsDto[];
  topSellingProducts: TopSellingProductDto[];
  totalQuotes: number;
  pendingQuotes: number;
  contactedQuotes: number;
  quotedCount: number;
  acceptedQuotes: number;
  inProductionQuotes: number;
  completedQuotes: number;
  quoteConversionRate: number;
  quotesByStatus: Partial<Record<QuoteStatus | string, number>>;
  recentQuoteRequests: AdminRecentQuoteDto[];
}

export interface RevenueTrendPointDto {
  label: string;
  periodStart: string;
  revenue: number;
  previousRevenue: number;
  growthPercent: number;
  orders: number;
  averageOrderValue: number;
}

export interface OrderStatusAnalyticsDto {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface TopSellingProductDto {
  productId: string;
  name: string;
  imageUrl?: string | null;
  quantitySold: number;
  revenue: number;
}

export interface AdminPagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserListItemDto {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: Role;
  merchantId?: string | null;
  isOnline: boolean;
  created: string;
  lastSeen?: string | null;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  recentOrders?: RecentOrderDto[];
  totalQuoteRequests?: number;
  lastQuoteAt?: string | null;
  recentQuoteRequests?: AdminRecentQuoteDto[];
}

export interface AdminUpdateUserRoleDto {
  role: Role;
  merchantId?: string | null;
}

export interface AdminUpdateUserDto {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  merchantId?: string | null;
}

export interface AdminOrderListItemDto {
  id: string;
  orderCode?: string | null;
  userId?: string | null;
  source: OrderSource | string;
  quoteRequestId?: string | null;
  customerName: string;
  receiverName: string;
  receiverPhone: string;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  itemCount: number;
  note?: string | null;
  created: string;
  updated?: string | null;
}

export interface AdminOrderItemDto {
  productId?: string | null;
  productVariantId?: string | null;
  productName: string;
  variantSku?: string | null;
  variantSize?: string | null;
  variantColor?: string | null;
  quantity: number;
  price: number;
  total: number;
}

export interface AdminOrderDetailDto {
  id: string;
  orderCode?: string | null;
  userId?: string | null;
  source: OrderSource | string;
  quoteRequestId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  note?: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  created: string;
  updated?: string | null;
  items: AdminOrderItemDto[];
  shipping?: ShippingDetailDto | null;
  statusHistory: OrderStatusHistoryDto[];
}

export interface AdminCreateOrderFromQuoteDto {
  receiverName?: string | null;
  receiverPhone?: string | null;
  addressLine: string;
  subtotal?: number | null;
  shippingFee: number;
  note?: string | null;
  isPaid: boolean;
  paidAt?: string | null;
}

export interface AdminCreateOrderItemDto {
  productId?: string | null;
  productName: string;
  variantSize?: string | null;
  variantColor?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface AdminCreateManualOrderDto {
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  userId?: string | null;
  source: OrderSource;
  note?: string | null;
  shippingFee: number;
  isPaid: boolean;
  paidAt?: string | null;
  items: AdminCreateOrderItemDto[];
}

export interface AdminUpdateOrderPaymentDto {
  isPaid: boolean;
  paidAt?: string | null;
  note?: string | null;
}

export interface AdminUpdateOrderStatusDto {
  status: OrderStatus;
  trackingNumber?: string | null;
  carrierName?: string | null;
  carrierCode?: string | null;
  currentLocation?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  note?: string | null;
}

export interface AdminSettingsDto {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  lowStockThreshold: number;
  recentOrdersLimit: number;
  enableOrderNotifications: boolean;
  enableInventoryAlerts: boolean;
  enableWeeklySummary: boolean;
  updated?: string | null;
}

export interface UpdateAdminSettingsDto {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  lowStockThreshold: number;
  recentOrdersLimit: number;
  enableOrderNotifications: boolean;
  enableInventoryAlerts: boolean;
  enableWeeklySummary: boolean;
}

export interface UpdateShopContactDto {
  zaloPhone: string;
  zaloOAId?: string | null;
  hotline: string;
  email: string;
  messengerLink?: string | null;
  workingHours?: string | null;
}
