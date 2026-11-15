import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PrintTechnique, QuoteStatus } from "../../@types/quoteRequest.type";
import { useToast } from "../../context/toastContext";
import {
  useAdminDashboard,
  useAdminQuote,
  useAdminQuotes,
  useAssignAdminQuote,
  useCreateOrderFromQuote,
  useUpdateAdminQuotePrice,
  useUpdateAdminQuoteStatus,
} from "../../hooks/useAdmin";
import { useAuth } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import {
  PRINT_TECHNIQUE_OPTIONS,
  QUOTE_STATUS_META,
  canCustomerCancelQuote,
  formatQuoteStatus,
} from "../../lib/quoteStatus";
import { routeTo } from "../../lib/routes";
import { quoteRequestService } from "../../services/quoteRequestService";
import { buildZaloUrl } from "../../services/shopContactService";
import ZaloIcon from "../../components/common/ZaloIcon";
import { formatPrice } from "../../utils/formatPrice";
import {
  AdminBadge,
  AdminEmptyState,
  AdminPanel,
  AdminPanelHeader,
  AdminPrimaryButton,
  ResizableTh,
  AdminSecondaryButton,
  AdminStatCard,
  formatAdminDateTime,
  useResizableColumns,
} from "./adminShared";

const PAGE_SIZE = 12;

const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  "Pending",
  "Quoted",
  "Accepted",
  "Rejected",
  "Cancelled",
];

export default function AdminQuotesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>();
  const { widths, totalWidth, startResize } = useResizableColumns([150, 220, 220, 140, 150, 150]);

  const debouncedSearch = useDebounce(search, 300);

  const dashboardQuery = useAdminDashboard();
  const quotesQuery = useAdminQuotes({
    search: debouncedSearch,
    status: statusFilter,
    fromDate,
    toDate,
    page,
    pageSize: PAGE_SIZE,
  });
  const detailQuery = useAdminQuote(selectedQuoteId);

  const updateStatusMutation = useUpdateAdminQuoteStatus();
  const updatePriceMutation = useUpdateAdminQuotePrice();
  const assignAdminMutation = useAssignAdminQuote();
  const createOrderMutation = useCreateOrderFromQuote();

  // Pricing form state
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quotedPrintTechnique, setQuotedPrintTechnique] = useState<PrintTechnique>("ScreenPrint");
  const [quotedDeliveryDate, setQuotedDeliveryDate] = useState("");
  const [quotedNote, setQuotedNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Convert-to-order modal state
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [orderSubtotal, setOrderSubtotal] = useState("");
  const [shippingFee, setShippingFee] = useState("0");
  const [orderNote, setOrderNote] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  const items = quotesQuery.data?.items ?? [];

  useEffect(() => {
    if (!selectedQuoteId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (orderModalOpen) setOrderModalOpen(false);
      else setSelectedQuoteId(undefined);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [orderModalOpen, selectedQuoteId]);

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail) return;
    setQuotedPrice(detail.quotedPrice != null ? String(detail.quotedPrice) : "");
    setQuotedPrintTechnique(detail.printTechnique ?? "ScreenPrint");
    setQuotedDeliveryDate(
      detail.expectedDeliveryDate ? detail.expectedDeliveryDate.split("T")[0] : ""
    );
    setQuotedNote(detail.quotedNote ?? "");
    setInternalNote(detail.internalNote ?? "");
  }, [detailQuery.data]);

  const detail = detailQuery.data;
  const sizeEntries = detail
    ? Object.entries(detail.sizeBreakdown ?? {}).filter(([, qty]) => qty > 0)
    : [];

  const handleSaveQuotePrice = async () => {
    if (!detail) return;
    const price = Number(quotedPrice);
    if (!Number.isFinite(price) || price <= 0 || price >= 1_000_000_000) {
      showToast("Giá báo phải lớn hơn 0 và nhỏ hơn 1 tỷ đồng", "warning");
      return;
    }

    try {
      await updatePriceMutation.mutateAsync({
        id: detail.id,
        dto: {
          quotedPrice: price,
          printTechnique: quotedPrintTechnique,
          expectedDeliveryDate: quotedDeliveryDate
            ? new Date(`${quotedDeliveryDate}T00:00:00Z`).toISOString()
            : null,
          quotedNote: quotedNote.trim() || null,
          internalNote: internalNote.trim() || null,
        },
      });
      showToast("Đã gửi báo giá tới khách hàng", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể cập nhật báo giá", "error");
    }
  };

  const handleCancelQuote = async () => {
    if (!detail) return;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu báo giá ${detail.quoteCode}?`)) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: detail.id,
        dto: {
          status: "Cancelled",
          internalNote: internalNote.trim() || null,
        },
      });
      showToast("Đã hủy yêu cầu báo giá", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể hủy yêu cầu báo giá", "error");
    }
  };

  const handleAssignToMe = async () => {
    if (!detail || !user?.id) return;
    try {
      await assignAdminMutation.mutateAsync({
        id: detail.id,
        dto: { assignedAdminId: detail.assignedAdminId === user.id ? null : user.id },
      });
      showToast("Đã cập nhật người phụ trách", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể phân công", "error");
    }
  };

  const openConvertOrderModal = () => {
    if (!detail) return;
    setReceiverName(detail.customerName);
    setReceiverPhone(detail.phone);
    setAddressLine("");
    setOrderSubtotal(detail.quotedPrice != null ? String(detail.quotedPrice) : "");
    setShippingFee("0");
    setOrderNote(`Tạo từ báo giá ${detail.quoteCode}`);
    setIsPaid(false);
    setOrderModalOpen(true);
  };

  const handleCreateOrderFromQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    const trimmedAddress = addressLine.trim();
    if (!trimmedAddress) {
      showToast("Vui lòng nhập địa chỉ giao hàng", "warning");
      return;
    }

    const subtotalNum = orderSubtotal.trim() ? Number(orderSubtotal) : null;
    const shipNum = Number(shippingFee) || 0;

    try {
      const created = await createOrderMutation.mutateAsync({
        quoteRequestId: detail.id,
        dto: {
          receiverName: receiverName.trim() || null,
          receiverPhone: receiverPhone.trim() || null,
          addressLine: trimmedAddress,
          subtotal: subtotalNum && Number.isFinite(subtotalNum) ? subtotalNum : null,
          shippingFee: shipNum,
          note: orderNote.trim() || null,
          isPaid,
          paidAt: isPaid ? new Date().toISOString() : null,
        },
      });
      setOrderModalOpen(false);
      showToast(`Đã tạo đơn hàng từ báo giá ${detail.quoteCode}`, "success");
      navigate(routeTo.adminOrder(created.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể tạo đơn hàng từ báo giá", "error");
    }
  };

  const dash = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon="mdi:file-document-edit-outline"
          label="Tổng yêu cầu báo giá"
          value={String(dash?.totalQuotes ?? quotesQuery.data?.total ?? 0)}
          meta="Tất cả RFQ trên hệ thống"
          accentClass="bg-blue-50 text-blue-700"
        />
        <AdminStatCard
          icon="mdi:clock-alert-outline"
          label="Chờ tiếp nhận"
          value={String(dash?.pendingQuotes ?? 0)}
          meta="Cần liên hệ & báo giá sớm"
          accentClass="bg-amber-50 text-amber-700"
        />
        <AdminStatCard
          icon="mdi:cash-check"
          label="Đã báo giá"
          value={String(dash?.quotedCount ?? 0)}
          meta="Đang chờ khách chốt đơn"
          accentClass="bg-indigo-50 text-indigo-700"
        />
        <AdminStatCard
          icon="mdi:factory"
          label="Báo giá thành công / Đang sản xuất"
          value={String((dash?.acceptedQuotes ?? 0) + (dash?.inProductionQuotes ?? 0))}
          meta={`Tỷ lệ chốt: ${dash?.quoteConversionRate ?? 0}%`}
          accentClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div>
        <AdminPanel className="self-start">
          <AdminPanelHeader
            title="Hộp thư Yêu cầu Báo giá (RFQ)"
            subtitle="Theo dõi yêu cầu từ khách, gửi báo giá và chuyển thành đơn hàng"
          />

          <div className="grid gap-3 border-b border-slate-200/80 px-5 py-4 sm:px-6 md:grid-cols-2 xl:grid-cols-[minmax(260px,2fr)_minmax(180px,1fr)_minmax(300px,1.4fr)]">
            <div className="relative min-w-0">
              <Icon
                icon="mdi:magnify"
                width={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã RFQ, tên, SĐT, công ty..."
                className="w-full min-w-0 rounded-lg border border-sky-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as QuoteStatus | "");
                setPage(1);
              }}
              className="w-full min-w-0 rounded-lg border border-sky-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              {QUOTE_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {formatQuoteStatus(st)}
                </option>
              ))}
            </select>

            <div className="grid min-w-0 grid-cols-2 gap-2 md:col-span-2 xl:col-span-1">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                title="Từ ngày"
                className="w-full min-w-0 rounded-lg border border-sky-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                title="Đến ngày"
                className="w-full min-w-0 rounded-lg border border-sky-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto px-2 pt-2 sm:px-4">
            {quotesQuery.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <AdminEmptyState
                  icon="mdi:file-search-outline"
                  title="Chưa có yêu cầu báo giá phù hợp"
                  description="Thử xóa bộ lọc tìm kiếm hoặc chờ khách gửi yêu cầu mới."
                />
              </div>
            ) : (
              <table
                className="w-full table-fixed border-collapse font-inter text-sm font-normal"
                style={{ minWidth: totalWidth }}
              >
                <colgroup>
                  {widths.map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    <ResizableTh onResizeStart={startResize(0)}>Mã RFQ</ResizableTh>
                    <ResizableTh onResizeStart={startResize(1)}>Khách hàng</ResizableTh>
                    <ResizableTh onResizeStart={startResize(2)}>Mẫu / SL</ResizableTh>
                    <ResizableTh align="right" onResizeStart={startResize(3)}>
                      Đơn giá/SP
                    </ResizableTh>
                    <ResizableTh align="right" onResizeStart={startResize(4)}>
                      Tổng báo giá
                    </ResizableTh>
                    <ResizableTh align="center" showDivider={false}>
                      Trạng thái
                    </ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const meta = QUOTE_STATUS_META[row.status];
                    const selected = row.id === selectedQuoteId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedQuoteId(row.id)}
                        className={`cursor-pointer border-b border-slate-100 transition last:border-b-0 ${
                          selected ? "bg-blue-50/70" : "hover:bg-sky-50/70"
                        }`}
                      >
                        <td className="truncate px-3 py-3 align-top" title={row.quoteCode}>
                          <p className="font-mono text-xs font-bold text-blue-700">{row.quoteCode}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="truncate font-semibold text-slate-900" title={row.customerName}>
                            {row.customerName}
                          </p>
                          <p className="truncate text-xs text-slate-500" title={row.phone}>
                            {row.phone}
                          </p>
                          {row.organizationName && (
                            <p
                              className="truncate text-[11px] text-slate-400"
                              title={row.organizationName}
                            >
                              {row.organizationName}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p
                            className="truncate text-xs font-medium text-slate-800"
                            title={row.productName ?? "May theo yêu cầu"}
                          >
                            {row.productName ?? "May theo yêu cầu"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.quantity} áo
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top font-semibold text-slate-900">
                          {row.productUnitPrice != null ? formatPrice(row.productUnitPrice) : "--"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top font-semibold text-slate-900">
                          {row.quotedPrice != null ? formatPrice(row.quotedPrice) : "--"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center align-top">
                          {row.status === "Accepted" && row.orderId ? (
                            <button
                              type="button"
                              title="Mở đơn hàng"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(routeTo.adminOrder(row.orderId!));
                              }}
                            >
                              <AdminBadge className={`${meta.badgeClass} cursor-pointer hover:ring-2 hover:ring-emerald-200`}>
                                {formatQuoteStatus(row.status)}
                              </AdminBadge>
                            </button>
                          ) : (
                            <AdminBadge className={meta.badgeClass}>
                              {formatQuoteStatus(row.status)}
                            </AdminBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Tổng {quotesQuery.data?.total ?? 0} yêu cầu</span>
            <div className="flex items-center gap-2">
              <AdminSecondaryButton
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs"
              >
                Trước
              </AdminSecondaryButton>
              <span className="text-xs font-semibold text-black">
                {page}/{Math.max(1, quotesQuery.data?.totalPages ?? 1)}
              </span>
              <AdminSecondaryButton
                type="button"
                disabled={page >= (quotesQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs"
              >
                Sau
              </AdminSecondaryButton>
            </div>
          </div>
        </AdminPanel>

        <div
          className={`fixed inset-0 z-40 transition-[visibility] duration-300 ${
            selectedQuoteId ? "visible" : "invisible"
          }`}
        >
          <button
            type="button"
            aria-label="Đóng chi tiết yêu cầu"
            onClick={() => setSelectedQuoteId(undefined)}
            className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${
              selectedQuoteId ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={detail ? `Chi tiết ${detail.quoteCode}` : "Chi tiết yêu cầu"}
            className={`absolute inset-y-0 right-0 w-full max-w-2xl transform transition-transform duration-300 ease-out ${
              selectedQuoteId ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedQuoteId ? (
              <AdminPanel className="flex h-full flex-col overflow-hidden !rounded-none border-y-0 border-r-0 shadow-2xl">
                <AdminPanelHeader
                  title={detail ? `Chi tiết ${detail.quoteCode}` : "Chi tiết yêu cầu"}
                  subtitle={detail ? formatAdminDateTime(detail.createdAt) : undefined}
                  action={
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setSelectedQuoteId(undefined)}
                      aria-label="Đóng chi tiết yêu cầu"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Icon icon="mdi:close" width={22} />
                    </button>
                  }
                />
          <div className="min-h-0 flex-1 overflow-y-auto">
          {detailQuery.isLoading || !detail ? (
            <div className="flex items-center justify-center p-10 text-sm text-slate-500">
              <Icon icon="mdi:loading" width={22} className="mr-2 animate-spin text-blue-600" />
              Đang tải chi tiết...
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {detail.status === "Accepted" && detail.orderId ? (
                  <button
                    type="button"
                    title="Mở đơn hàng"
                    onClick={() => navigate(routeTo.adminOrder(detail.orderId!))}
                  >
                    <AdminBadge className={`${QUOTE_STATUS_META[detail.status].badgeClass} cursor-pointer hover:ring-2 hover:ring-emerald-200`}>
                      {formatQuoteStatus(detail.status)}
                    </AdminBadge>
                  </button>
                ) : (
                  <AdminBadge className={QUOTE_STATUS_META[detail.status].badgeClass}>
                    {formatQuoteStatus(detail.status)}
                  </AdminBadge>
                )}
                <div className="flex flex-wrap gap-2">
                  {buildZaloUrl(detail.phone) ? (
                    <a
                      href={buildZaloUrl(detail.phone)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0068ff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0057d9] shadow-xs transition"
                    >
                      <ZaloIcon size={15} />
                      Mở Zalo ({detail.phone})
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleAssignToMe}
                    disabled={assignAdminMutation.isPending}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {detail.assignedAdminId === user?.id
                      ? "Bỏ nhận xử lý"
                      : detail.assignedAdminName
                      ? `Phụ trách: ${detail.assignedAdminName}`
                      : "Nhận phụ trách"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
                <p>
                  <span className="text-slate-500">Khách hàng:</span>{" "}
                  <strong className="text-slate-900">{detail.customerName}</strong>
                </p>
                {detail.organizationName && (
                  <p>
                    <span className="text-slate-500">Đơn vị / Lớp:</span>{" "}
                    <strong>{detail.organizationName}</strong>
                  </p>
                )}
                {detail.email && (
                  <p>
                    <span className="text-slate-500">Email:</span> <strong>{detail.email}</strong>
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Sản phẩm:</span>{" "}
                  <strong>{detail.productName ?? "May/In custom theo yêu cầu"}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Số lượng:</span>{" "}
                  <strong>{detail.quantity} áo</strong>
                </p>
                {detail.productUnitPrice != null ? (
                  <p>
                    <span className="text-slate-500">Giá sản phẩm:</span>{" "}
                    <strong>{formatPrice(detail.productUnitPrice)}/áo</strong>
                  </p>
                ) : null}
                {detail.material && (
                  <p>
                    <span className="text-slate-500">Chất liệu:</span>{" "}
                    <strong>{detail.material}</strong>
                  </p>
                )}
                {detail.colorSelection && (
                  <p>
                    <span className="text-slate-500">Màu sắc:</span>{" "}
                    <strong>{detail.colorSelection}</strong>
                  </p>
                )}
                {detail.expectedDeliveryDate && (
                  <p>
                    <span className="text-slate-500">Cần giao trước:</span>{" "}
                    <strong>
                      {new Date(detail.expectedDeliveryDate).toLocaleDateString("vi-VN")}
                    </strong>
                  </p>
                )}
                {sizeEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sizeEntries.map(([size, qty]) => (
                      <span
                        key={size}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold"
                      >
                        {size}: {qty}
                      </span>
                    ))}
                  </div>
                )}
                {detail.note && (
                  <p className="pt-1 whitespace-pre-line text-slate-700">
                    <span className="text-slate-500">Ghi chú khách:</span> {detail.note}
                  </p>
                )}
              </div>

              {detail.logoFiles.length > 0 && (() => {
                const designFiles = detail.logoFiles.filter((f) =>
                  /\.(png|jpe?g|svg|webp|ai)$/i.test(f.fileName || f.originalName)
                );
                const sizeFiles = detail.logoFiles.filter(
                  (f) => !/\.(png|jpe?g|svg|webp|ai)$/i.test(f.fileName || f.originalName)
                );

                return (
                  <div className="space-y-3">
                    {designFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Icon icon="mdi:image-outline" className="text-blue-600" width={16} />
                          Ảnh logo / Mẫu áo thiết kế ({designFiles.length})
                        </p>
                        <div className="space-y-1.5">
                          {designFiles.map((file) => (
                            <div
                              key={file.fileName}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <span className="truncate font-medium text-slate-800">
                                {file.originalName}
                              </span>
                              <button
                                type="button"
                                disabled={downloadingFile === file.fileName}
                                onClick={async () => {
                                  setDownloadingFile(file.fileName);
                                  try {
                                    await quoteRequestService.downloadLogo(
                                      detail.id,
                                      file.fileName,
                                      file.originalName
                                    );
                                  } finally {
                                    setDownloadingFile(null);
                                  }
                                }}
                                className="shrink-0 font-semibold text-blue-700 hover:underline"
                              >
                                {downloadingFile === file.fileName ? "Đang tải..." : "Tải xuống"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sizeFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Icon icon="mdi:file-table-box-outline" className="text-emerald-600" width={16} />
                          File kích thước áo / Excel / Word ({sizeFiles.length})
                        </p>
                        <div className="space-y-1.5">
                          {sizeFiles.map((file) => (
                            <div
                              key={file.fileName}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            >
                              <span className="truncate font-medium text-slate-800">
                                {file.originalName}
                              </span>
                              <button
                                type="button"
                                disabled={downloadingFile === file.fileName}
                                onClick={async () => {
                                  setDownloadingFile(file.fileName);
                                  try {
                                    await quoteRequestService.downloadLogo(
                                      detail.id,
                                      file.fileName,
                                      file.originalName
                                    );
                                  } finally {
                                    setDownloadingFile(null);
                                  }
                                }}
                                className="shrink-0 font-semibold text-emerald-700 hover:underline"
                              >
                                {downloadingFile === file.fileName ? "Đang tải..." : "Tải xuống"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(detail.status === "Pending" ||
                detail.status === "Contacted" ||
                detail.status === "Quoted") && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cập nhật báo giá chính thức
                </p>
                <div className="space-y-2.5">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Giá sản phẩm (từ Product)
                      </label>
                      <input
                        type="number"
                        value={detail.productUnitPrice ?? ""}
                        readOnly
                        placeholder="RFQ không gắn sản phẩm"
                        className="w-full rounded-lg border border-gray-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                      />
                    </div>
                    <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Tổng tiền báo giá (VNĐ) *
                    </label>
                    <input
                      type="number"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                      placeholder="Tổng tiền báo giá (VNĐ)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Kỹ thuật in / thêu *
                      </label>
                      <select
                        value={quotedPrintTechnique}
                        onChange={(e) => setQuotedPrintTechnique(e.target.value as PrintTechnique)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-600"
                      >
                        {PRINT_TECHNIQUE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Ngày hẹn giao hàng
                      </label>
                      <input
                        type="date"
                        value={quotedDeliveryDate}
                        onChange={(e) => setQuotedDeliveryDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Ghi chú báo giá gửi khách
                    </label>
                    <textarea
                      rows={2}
                      value={quotedNote}
                      onChange={(e) => setQuotedNote(e.target.value)}
                      placeholder="Ghi chú báo giá gửi khách (VD: đã bao gồm in logo ngực trái + miễn phí ship)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Ghi chú nội bộ Admin
                    </label>
                    <textarea
                      rows={2}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Ghi chú nội bộ Admin (khách không thấy)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                    />
                  </div>

                  <AdminPrimaryButton
                    type="button"
                    disabled={updatePriceMutation.isPending}
                    onClick={handleSaveQuotePrice}
                    className="w-full"
                  >
                    {updatePriceMutation.isPending ? "Đang gửi báo giá..." : "Gửi báo giá cho khách"}
                  </AdminPrimaryButton>
                </div>
              </div>
              )}

              {canCustomerCancelQuote(detail.status) && (
                <button
                  type="button"
                  disabled={updateStatusMutation.isPending}
                  onClick={handleCancelQuote}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <Icon icon="mdi:close-circle-outline" width={18} />
                  {updateStatusMutation.isPending ? "Đang hủy..." : "Hủy yêu cầu báo giá"}
                </button>
              )}

              {detail.orderId ? (
                <button
                  type="button"
                  onClick={() => navigate(routeTo.adminOrder(detail.orderId!))}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Icon icon="mdi:open-in-new" width={18} />
                  Xem đơn hàng {detail.orderCode || detail.orderId}
                </button>
              ) : detail.status === "Quoted" || detail.status === "Accepted" ? (
                <button
                  type="button"
                  onClick={openConvertOrderModal}
                  className="flex w-full items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  {detail.status === "Quoted" ? "Báo giá thành công" : "Tạo đơn hàng"}
                </button>
              ) : null}
            </div>
          )}
          </div>
              </AdminPanel>
            ) : null}
          </aside>
        </div>
      </div>

      {orderModalOpen && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOrderModalOpen(false)}
        >
          <form
            onSubmit={handleCreateOrderFromQuote}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {detail.status === "Quoted" ? "Hoàn tất báo giá" : "Tạo đơn hàng"} {detail.quoteCode}
              </h3>
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Người nhận
                </label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Số điện thoại
                </label>
                <input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Địa chỉ giao hàng <span className="text-red-500">*</span>
              </label>
              <input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiền hàng (VNĐ)
                </label>
                <input
                  type="number"
                  value={orderSubtotal}
                  onChange={(e) => setOrderSubtotal(e.target.value)}
                  placeholder="Mặc định lấy theo giá báo"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phí vận chuyển (VNĐ)
                </label>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú đơn</label>
              <textarea
                rows={2}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
              Đã thanh toán (tính vào doanh thu đã thu)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <AdminSecondaryButton type="button" onClick={() => setOrderModalOpen(false)}>
                Hủy
              </AdminSecondaryButton>
              <AdminPrimaryButton type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending
                  ? "Đang tạo..."
                  : detail.status === "Quoted"
                    ? "Báo giá thành công và tạo đơn"
                    : "Xác nhận tạo đơn"}
              </AdminPrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

