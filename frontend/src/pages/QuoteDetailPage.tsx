import { Icon } from "@iconify/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../context/toastContext";
import { useCancelQuoteRequest, useQuoteDetail } from "../hooks/useQuoteRequests";
import { useShopContact } from "../hooks/useShopContact";
import { openZaloProductConsult } from "../lib/productRfq";
import ZaloIcon from "../components/common/ZaloIcon";
import {
  QUOTE_STATUS_META,
  canCustomerCancelQuote,
  formatPrintTechnique,
  getUserStatusBadge,
} from "../lib/quoteStatus";
import { ROUTES, routeTo } from "../lib/routes";
import { quoteRequestService } from "../services/quoteRequestService";
import { formatPrice } from "../utils/formatPrice";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: contact } = useShopContact();
  const quoteQuery = useQuoteDetail(id);
  const cancelMutation = useCancelQuoteRequest();
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  if (quoteQuery.isLoading) {
    return (
      <section className="min-h-[70vh] bg-[#fafafa] py-10 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200/70" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-200/70" />
        </div>
      </section>
    );
  }

  if (quoteQuery.isError || !quoteQuery.data) {
    return (
      <section className="min-h-[60vh] bg-[#fafafa] py-16 px-4 text-center">
        <p className="text-base font-semibold text-red-600">
          Không tìm thấy yêu cầu báo giá hoặc bạn không có quyền xem.
        </p>
        <Link
          to={ROUTES.QUOTES}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white"
        >
          ← Quay lại danh sách báo giá
        </Link>
      </section>
    );
  }

  const quote = quoteQuery.data;
  const meta = QUOTE_STATUS_META[quote.status];
  const userBadge = getUserStatusBadge(quote.status);
  const isTerminalClosed = quote.status === "Rejected" || quote.status === "Cancelled";
  const milestoneIndex =
    quote.status === "Completed"
      ? 2
      : quote.status === "Accepted" || quote.status === "InProduction"
      ? 1
      : 0;
  const sizeEntries = Object.entries(quote.sizeBreakdown ?? {}).filter(([, qty]) => qty > 0);

  const handleCancel = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy yêu cầu ${quote.quoteCode}?`)) return;
    try {
      await cancelMutation.mutateAsync(quote.id);
      showToast("Đã hủy yêu cầu báo giá", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể hủy báo giá", "error");
    }
  };

  const handleDownloadLogo = async (fileName: string, originalName: string) => {
    setDownloadingFile(fileName);
    try {
      await quoteRequestService.downloadLogo(quote.id, fileName, originalName);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể tải file logo", "error");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleOpenChat = () => {
    navigate(
      `${ROUTES.QUOTES}/${encodeURIComponent(quote.id)}?chat=support&quoteId=${encodeURIComponent(quote.id)}`
    );
  };

  const handleOpenZalo = async () => {
    const result = await openZaloProductConsult({
      zaloPhone: contact?.zaloPhone,
      productName: `${quote.quoteCode} - ${quote.productName ?? "Áo custom"}`,
      productUrl: window.location.href,
    });
    if (!result.opened) {
      showToast("Số Zalo đang cập nhật, hãy dùng nút Chat với shop.", "info");
    } else if (result.copied) {
      showToast("Đã sao chép mã báo giá — đang mở Zalo", "info");
    }
  };

  return (
    <section className="min-h-[75vh] bg-[#fafafa] py-10 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={ROUTES.QUOTES}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#1d4ed8]"
          >
            <Icon icon="mdi:arrow-left" width={18} />
            Danh sách báo giá của tôi
          </Link>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenChat}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e40af]"
            >
              <Icon icon="mdi:chat-processing-outline" width={16} />
              Chat về báo giá này
            </button>
            <button
              type="button"
              onClick={handleOpenZalo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0068ff] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0057d9] transition"
            >
              <ZaloIcon size={16} />
              Trao đổi Zalo
            </button>
            {canCustomerCancelQuote(quote.status) && (
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Hủy yêu cầu
              </button>
            )}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-xl sm:text-2xl font-bold text-primeColor">
                  {quote.quoteCode}
                </h1>
                <span className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${userBadge.badgeClass}`}>
                  {userBadge.label}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-lightText">{meta.description}</p>
            </div>
            <p className="text-xs text-slate-400">
              Gửi lúc {new Date(quote.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          {!isTerminalClosed ? (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                { label: "1. Chờ xử lý", step: 0 },
                { label: "2. Đã chốt", step: 1 },
                { label: "3. Hoàn tất", step: 2 },
              ].map((m) => {
                const done = milestoneIndex >= m.step;
                return (
                  <div key={m.label} className="flex flex-col items-start gap-1">
                    <div
                      className={`h-1.5 w-full rounded-full ${
                        done ? "bg-primeColor" : "bg-gray-200"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        done ? "text-primeColor" : "text-slate-400"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs sm:text-sm text-slate-700">
              Yêu cầu này đang ở trạng thái <strong>Đã hủy</strong>.
            </div>
          )}

          {quote.quotedPrice != null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Báo giá chính thức từ xưởng
                </span>
                {quote.quotedAt && (
                  <span className="text-xs text-emerald-700">
                    Cập nhật {new Date(quote.quotedAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-2xl font-bold text-emerald-700">
                {formatPrice(quote.quotedPrice)}
              </p>
              {quote.quotedNote && (
                <p className="mt-2 whitespace-pre-line text-sm text-emerald-900">
                  {quote.quotedNote}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Thông số sản xuất
            </h2>
            {quote.productName && (
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50 p-3">
                {quote.productImageUrl && (
                  <img
                    src={quote.productImageUrl}
                    alt={quote.productName}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primeColor">{quote.productName}</p>
                  {quote.productSlug && (
                    <Link
                      to={routeTo.product(quote.productSlug)}
                      className="text-xs font-medium text-[#1d4ed8] hover:underline"
                    >
                      Xem mẫu áo →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Số lượng:</dt>
                <dd className="font-semibold text-primeColor">{quote.quantity} áo</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Kỹ thuật in / thêu:</dt>
                <dd className="font-semibold text-primeColor">
                  {quote.quotedPrice != null
                    ? formatPrintTechnique(quote.printTechnique)
                    : "Shop sẽ xác nhận khi gửi báo giá"}
                </dd>
              </div>
              {quote.material && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Chất liệu:</dt>
                  <dd className="font-semibold text-primeColor">{quote.material}</dd>
                </div>
              )}
              {quote.colorSelection && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Màu sắc:</dt>
                  <dd className="font-semibold text-primeColor">{quote.colorSelection}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Ngày giao dự kiến:</dt>
                <dd className="font-semibold text-primeColor">
                  {quote.expectedDeliveryDate
                    ? new Date(quote.expectedDeliveryDate).toLocaleDateString("vi-VN")
                    : "Shop sẽ hẹn ngày khi gửi báo giá"}
                </dd>
              </div>
            </dl>

            {sizeEntries.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold text-slate-500">Chi tiết bảng size:</p>
                <div className="flex flex-wrap gap-2">
                  {sizeEntries.map(([size, qty]) => (
                    <span
                      key={size}
                      className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-primeColor"
                    >
                      {size}: {qty}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Thông tin liên hệ &amp; File đính kèm
            </h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Khách hàng:</dt>
                <dd className="font-semibold text-primeColor">{quote.customerName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Số điện thoại:</dt>
                <dd className="font-semibold text-primeColor">{quote.phone}</dd>
              </div>
              {quote.email && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Email:</dt>
                  <dd className="font-semibold text-primeColor">{quote.email}</dd>
                </div>
              )}
              {quote.organizationName && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Đơn vị / Lớp:</dt>
                  <dd className="font-semibold text-primeColor">{quote.organizationName}</dd>
                </div>
              )}
            </dl>

            {quote.note && (
              <div className="rounded-xl border border-gray-100 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-line">
                <p className="mb-1 text-xs font-semibold text-slate-500">Ghi chú của bạn:</p>
                {quote.note}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                File đính kèm ({quote.logoFiles.length}):
              </p>
              {quote.logoFiles.length === 0 ? (
                <p className="text-xs text-slate-400">Không có file đính kèm.</p>
              ) : (() => {
                const designFiles = quote.logoFiles.filter((f) =>
                  /\.(png|jpe?g|svg|webp|ai)$/i.test(f.fileName || f.originalName)
                );
                const sizeFiles = quote.logoFiles.filter(
                  (f) => !/\.(png|jpe?g|svg|webp|ai)$/i.test(f.fileName || f.originalName)
                );

                return (
                  <div className="space-y-3">
                    {designFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Icon icon="mdi:image-outline" className="text-blue-600" width={15} />
                          Ảnh logo / Bản vẽ mẫu ({designFiles.length})
                        </p>
                        <div className="space-y-1.5">
                          {designFiles.map((file) => (
                            <div
                              key={file.fileName}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-xs bg-slate-50/50"
                            >
                              <span className="truncate font-medium text-primeColor">
                                {file.originalName}
                              </span>
                              <button
                                type="button"
                                disabled={downloadingFile === file.fileName}
                                onClick={() => handleDownloadLogo(file.fileName, file.originalName)}
                                className="shrink-0 font-semibold text-[#1d4ed8] hover:underline disabled:opacity-50"
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
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Icon icon="mdi:file-table-box-outline" className="text-emerald-600" width={15} />
                          File kích thước áo / Excel / Word ({sizeFiles.length})
                        </p>
                        <div className="space-y-1.5">
                          {sizeFiles.map((file) => (
                            <div
                              key={file.fileName}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-xs bg-slate-50/50"
                            >
                              <span className="truncate font-medium text-primeColor">
                                {file.originalName}
                              </span>
                              <button
                                type="button"
                                disabled={downloadingFile === file.fileName}
                                onClick={() => handleDownloadLogo(file.fileName, file.originalName)}
                                className="shrink-0 font-semibold text-emerald-700 hover:underline disabled:opacity-50"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

