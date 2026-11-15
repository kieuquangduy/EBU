import type { PrintTechnique, QuoteStatus } from "../@types/quoteRequest.type";

export const QUOTE_STATUS_META: Record<
  QuoteStatus,
  { label: string; badgeClass: string; description: string }
> = {
  Pending: {
    label: "Chờ xử lý",
    badgeClass: "bg-amber-100 text-amber-800",
    description: "Yêu cầu đã gửi thành công, đang chờ tư vấn viên tiếp nhận.",
  },
  Contacted: {
    label: "Chờ xử lý",
    badgeClass: "bg-sky-100 text-sky-800",
    description: "Yêu cầu cũ đang chờ shop gửi báo giá chính thức.",
  },
  Quoted: {
    label: "Đã báo giá",
    badgeClass: "bg-indigo-100 text-indigo-800",
    description: "Shop đã gửi mức báo giá chính thức cho đơn hàng của bạn.",
  },
  Accepted: {
    label: "Báo giá thành công",
    badgeClass: "bg-emerald-100 text-emerald-800",
    description: "Khách hàng đã xác nhận báo giá; đơn hàng được chuyển sang xử lý.",
  },
  InProduction: {
    label: "Đang sản xuất",
    badgeClass: "bg-violet-100 text-violet-800",
    description: "Đơn hàng đang được may và in/thêu tại xưởng.",
  },
  Completed: {
    label: "Hoàn tất",
    badgeClass: "bg-emerald-600 text-white",
    description: "Đơn hàng báo giá đã hoàn thành.",
  },
  Rejected: {
    label: "Từ chối",
    badgeClass: "bg-rose-100 text-rose-800",
    description: "Yêu cầu báo giá chưa thể thực hiện.",
  },
  Cancelled: {
    label: "Đã hủy",
    badgeClass: "bg-slate-200 text-slate-700",
    description: "Yêu cầu báo giá đã được hủy.",
  },
};

export const QUOTE_STATUS_STEPS: QuoteStatus[] = [
  "Pending",
  "Contacted",
  "Quoted",
  "Accepted",
  "InProduction",
  "Completed",
];

export const PRINT_TECHNIQUE_OPTIONS: ReadonlyArray<{
  value: PrintTechnique;
  label: string;
}> = [
  { value: "ScreenPrint", label: "In lụa" },
  { value: "HeatTransfer", label: "In chuyển nhiệt" },
  { value: "DtfPrint", label: "In DTF" },
  { value: "Decal", label: "In Decal" },
  { value: "Embroidery", label: "Thêu vi tính" },
  { value: "Sublimation", label: "In thăng hoa" },
  { value: "Other", label: "Kỹ thuật khác" },
];

export const PRINT_TECHNIQUE_LABELS: Record<PrintTechnique, string> = Object.fromEntries(
  PRINT_TECHNIQUE_OPTIONS.map((item) => [item.value, item.label])
) as Record<PrintTechnique, string>;

export const QUOTE_ADMIN_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  Pending: ["Rejected", "Cancelled"],
  Contacted: ["Rejected", "Cancelled"],
  Quoted: ["Rejected", "Cancelled"],
  Accepted: [],
  InProduction: [],
  Completed: [],
  Rejected: [],
  Cancelled: [],
};

export function canCustomerCancelQuote(status: QuoteStatus): boolean {
  return status === "Pending" || status === "Contacted" || status === "Quoted";
}

export function formatQuoteStatus(status: QuoteStatus): string {
  return QUOTE_STATUS_META[status]?.label ?? status;
}

export function formatPrintTechnique(technique: PrintTechnique): string {
  return PRINT_TECHNIQUE_LABELS[technique] ?? technique;
}

export type UserStatusGroup = "" | "pending" | "quoted" | "accepted" | "cancelled";

export const USER_STATUS_TABS: ReadonlyArray<{ value: UserStatusGroup; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "accepted", label: "Báo giá thành công" },
  { value: "cancelled", label: "Đã hủy" },
];

export function getUserStatusBadge(status: QuoteStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "Pending":
    case "Contacted":
      return {
        label: "Chờ xử lý",
        badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
      };
    case "Quoted":
      return {
        label: "Đã báo giá",
        badgeClass: "bg-indigo-50 text-indigo-800 border border-indigo-200",
      };
    case "Accepted":
    case "InProduction":
    case "Completed":
      return {
        label: "Báo giá thành công",
        badgeClass: "bg-blue-50 text-blue-800 border border-blue-200",
      };
    case "Cancelled":
    case "Rejected":
      return {
        label: "Đã hủy",
        badgeClass: "bg-gray-100 text-gray-600 border border-gray-200",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-gray-100 text-gray-700 border border-gray-200",
      };
  }
}

export const DEFAULT_QUOTE_PRODUCT_IMAGE =
  "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476872/haushop/product/custom/ao-co-co-01.png";

export function resolveQuoteProductTitle(item: {
  productName?: string | null;
  organizationName?: string | null;
  orderCode?: string | null;
  material?: string | null;
  quoteCode?: string;
}): string {
  const name = item.productName?.trim();
  if (
    name &&
    name !== "Đặt may áo custom theo yêu cầu" &&
    !/^đơn\s+(đặt|hàng)\s+áo\s+custom/i.test(name) &&
    !/^áo\s+custom/i.test(name)
  ) {
    return name;
  }
  if (item.organizationName) {
    return `Áo đồng phục ${item.organizationName}`;
  }
  if (item.material) {
    return `Áo thun custom vải ${item.material}`;
  }
  return "Áo polo custom đồng phục theo yêu cầu";
}


