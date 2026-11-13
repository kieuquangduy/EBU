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
  QUOTE_ADMIN_TRANSITIONS,
  QUOTE_STATUS_META,
  formatPrintTechnique,
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
  AdminSecondaryButton,
  AdminStatCard,
  formatAdminDateTime,
} from "./adminShared";

const PAGE_SIZE = 12;

const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  "Pending",
  "Contacted",
  "Quoted",
  "Accepted",
  "InProduction",
  "Completed",
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
  const [nextStatus, setNextStatus] = useState<QuoteStatus | "">("");
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
    if (!selectedQuoteId && items.length > 0) {
      setSelectedQuoteId(items[0].id);
    }
  }, [items, selectedQuoteId]);

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
    const allowed = QUOTE_ADMIN_TRANSITIONS[detail.status] ?? [];
    setNextStatus(allowed[0] ?? "");
  }, [detailQuery.data]);

  const detail = detailQuery.data;
  const allowedTransitions = detail ? QUOTE_ADMIN_TRANSITIONS[detail.status] ?? [] : [];
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

  const handleUpdateStatus = async () => {
    if (!detail || !nextStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: detail.id,
        dto: {
          status: nextStatus,
          internalNote: internalNote.trim() || null,
        },
      });
      showToast(`Đã chuyển trạng thái sang ${formatQuoteStatus(nextStatus)}`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể chuyển trạng thái", "error");
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
          label="Đã chốt / Đang sản xuất"
          value={String((dash?.acceptedQuotes ?? 0) + (dash?.inProductionQuotes ?? 0))}
          meta={`Tỷ lệ chốt: ${dash?.quoteConversionRate ?? 0}%`}
          accentClass="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_440px]">
        <AdminPanel className="self-start">
          <AdminPanelHeader
            title="Hộp thư Yêu cầu Báo giá (RFQ)"
            subtitle="Theo dõi yêu cầu từ khách, gửi báo giá và chuyển thành đơn hàng"
          />

          <div className="grid gap-3 border-b border-gray-200 px-5 py-4 sm:grid-cols-4 sm:px-6">
            <div className="relative sm:col-span-2">
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
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as QuoteStatus | "");
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
            >
              <option value="">Tất cả trạng thái</option>
              {QUOTE_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {formatQuoteStatus(st)}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                title="Từ ngày"
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                title="Đến ngày"
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
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
              <table className="w-full border-collapse text-left font-inter text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50/70 text-[11px] uppercase tracking-[0.1em] text-gray-500">
                    <th className="px-4 py-3 font-semibold">Mã RFQ</th>
                    <th className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Mẫu / SL</th>
                    <th className="px-4 py-3 text-right font-semibold">Giá báo</th>
                    <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
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
                        className={`cursor-pointer border-b border-gray-100 transition ${
                          selected ? "bg-blue-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <p className="font-mono text-xs font-bold text-blue-700">{row.quoteCode}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-slate-900">{row.customerName}</p>
                          <p className="text-xs text-slate-500">{row.phone}</p>
                          {row.organizationName && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                              {row.organizationName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-[170px]">
                            {row.productName ?? "May theo yêu cầu"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.quantity} áo · {formatPrintTechnique(row.printTechnique)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right align-top font-semibold text-slate-900">
                          {row.quotedPrice != null ? formatPrice(row.quotedPrice) : "--"}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <AdminBadge className={meta.badgeClass}>
                            {formatQuoteStatus(row.status)}
                          </AdminBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5 text-sm text-gray-600">
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

        <AdminPanel className="self-start">
          <AdminPanelHeader
            title={detail ? `Chi tiết ${detail.quoteCode}` : "Chi tiết yêu cầu"}
            subtitle={detail ? formatAdminDateTime(detail.createdAt) : undefined}
          />
          {!selectedQuoteId ? (
            <div className="p-6 text-sm text-slate-500">Chọn một yêu cầu ở bảng bên để xử lý.</div>
          ) : detailQuery.isLoading || !detail ? (
            <div className="flex items-center justify-center p-10 text-sm text-slate-500">
              <Icon icon="mdi:loading" width={22} className="mr-2 animate-spin text-blue-600" />
              Đang tải chi tiết...
            </div>
          ) : (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminBadge className={QUOTE_STATUS_META[detail.status].badgeClass}>
                  {formatQuoteStatus(detail.status)}
                </AdminBadge>
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
                  <strong>{detail.quantity} áo</strong> · Kỹ thuật:{" "}
                  <strong>{formatPrintTechnique(detail.printTechnique)}</strong>
                </p>
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

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Cập nhật báo giá chính thức
                </p>
                <div className="space-y-2.5">
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

              {allowedTransitions.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Chuyển trạng thái xử lý
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as QuoteStatus)}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
                    >
                      {allowedTransitions.map((st) => (
                        <option key={st} value={st}>
                          {formatQuoteStatus(st)}
                        </option>
                      ))}
                    </select>
                    <AdminSecondaryButton
                      type="button"
                      disabled={!nextStatus || updateStatusMutation.isPending}
                      onClick={handleUpdateStatus}
                    >
                      Cập nhật
                    </AdminSecondaryButton>
                  </div>
                </div>
              )}

              {(detail.status === "Quoted" ||
                detail.status === "Accepted" ||
                detail.status === "InProduction") && (
                <button
                  type="button"
                  onClick={openConvertOrderModal}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Icon icon="mdi:clipboard-plus-outline" width={18} />
                  Tạo đơn hàng (tính doanh thu) từ báo giá này
                </button>
              )}
            </div>
          )}
        </AdminPanel>
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
                Tạo đơn hàng từ {detail.quoteCode}
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
                {createOrderMutation.isPending ? "Đang tạo..." : "Xác nhận tạo đơn"}
              </AdminPrimaryButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

