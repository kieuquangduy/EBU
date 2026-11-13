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
    label: "Đã liên hệ",
    badgeClass: "bg-sky-100 text-sky-800",
    description: "Tư vấn viên đã liên hệ và xác nhận yêu cầu thiết kế.",
  },
  Quoted: {
    label: "Đã báo giá",
    badgeClass: "bg-indigo-100 text-indigo-800",
    description: "Shop đã gửi mức báo giá chính thức cho đơn hàng của bạn.",
  },
  Accepted: {
    label: "Đã chốt báo giá",
    badgeClass: "bg-emerald-100 text-emerald-800",
    description: "Hai bên đã chốt báo giá và sẵn sàng chuyển xưởng sản xuất.",
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
  Pending: ["Contacted", "Quoted", "Rejected", "Cancelled"],
  Contacted: ["Quoted", "Rejected", "Cancelled"],
  Quoted: ["Accepted", "Rejected", "Cancelled"],
  Accepted: ["InProduction", "Cancelled"],
  InProduction: ["Completed", "Cancelled"],
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

export type UserStatusGroup = "" | "pending" | "accepted" | "completed" | "cancelled";

export const USER_STATUS_TABS: ReadonlyArray<{ value: UserStatusGroup; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "accepted", label: "Đã chốt" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
];

export function getUserStatusBadge(status: QuoteStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case "Pending":
    case "Contacted":
    case "Quoted":
      return {
        label: "Chờ xử lý",
        badgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
      };
    case "Accepted":
    case "InProduction":
      return {
        label: "Đã chốt",
        badgeClass: "bg-blue-50 text-blue-800 border border-blue-200",
      };
    case "Completed":
      return {
        label: "Hoàn tất",
        badgeClass: "bg-emerald-50 text-emerald-800 border border-emerald-200",
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

