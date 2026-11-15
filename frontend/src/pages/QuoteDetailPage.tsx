import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { LogoFileRefDto } from "../@types/quoteRequest.type";
import { useToast } from "../context/toastContext";
import { useAcceptQuoteRequest, useCancelQuoteRequest, useQuoteDetail } from "../hooks/useQuoteRequests";
import { useShopContact } from "../hooks/useShopContact";
import { openZaloProductConsult } from "../lib/productRfq";
import ZaloIcon from "../components/common/ZaloIcon";
import {
  DEFAULT_QUOTE_PRODUCT_IMAGE,
  QUOTE_STATUS_META,
  canCustomerCancelQuote,
  formatPrintTechnique,
  getUserStatusBadge,
  resolveQuoteProductTitle,
} from "../lib/quoteStatus";
import { ROUTES, routeTo } from "../lib/routes";
import { quoteRequestService } from "../services/quoteRequestService";
import { formatPrice } from "../utils/formatPrice";

const orderStatusLabels: Record<string, string> = {
  Pending: "Chờ xử lý",
  Processing: "Đang xử lý",
  PaymentSucceeded: "Thanh toán thành công",
  OrderPlaced: "Đã đặt hàng",
  SellerConfirmed: "Đã xác nhận",
  InProduction: "Đang sản xuất",
  Packing: "Đang đóng gói",
  Shipping: "Đang giao",
  HandoverToCarrier: "Đã bàn giao vận chuyển",
  InTransit: "Đang vận chuyển",
  OutForDelivery: "Đang giao hàng",
  Delivered: "Đã giao",
  DeliveryFailed: "Giao hàng thất bại",
  Completed: "Hoàn tất",
  Cancelled: "Đã hủy",
  ReturnRequested: "Yêu cầu hoàn hàng",
  ReturnApproved: "Đã duyệt hoàn hàng",
  ReturnRejected: "Từ chối hoàn hàng",
  Returned: "Đã hoàn hàng",
  Refunded: "Đã hoàn tiền",
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: contact } = useShopContact();
  const quoteQuery = useQuoteDetail(id);
  const cancelMutation = useCancelQuoteRequest();
  const acceptMutation = useAcceptQuoteRequest();
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
  const shippingStatuses = [
    "Shipping",
    "HandoverToCarrier",
    "InTransit",
    "OutForDelivery",
    "Delivered",
    "Completed",
  ];
  const productionStatuses = ["InProduction", "Packing", ...shippingStatuses];
  const hasConfirmedOrder = quote.status === "Accepted" && Boolean(quote.order);
  const orderMilestones = hasConfirmedOrder && quote.order
    ? [
        { label: "Đã xác nhận", done: true },
        { label: "Đang sản xuất", done: productionStatuses.includes(quote.order.status) },
        { label: "Đóng gói", done: ["Packing", ...shippingStatuses].includes(quote.order.status) },
        { label: "Vận chuyển", done: shippingStatuses.includes(quote.order.status) },
        { label: "Hoàn tất", done: quote.order.status === "Completed" },
      ]
    : [
        { label: "1. Chờ xử lý", done: true },
        { label: "2. Đã báo giá", done: quote.status === "Quoted" || quote.status === "Accepted" },
        { label: "3. Báo giá thành công", done: quote.status === "Accepted" },
      ];
  const sizeEntries = Object.entries(quote.sizeBreakdown ?? {}).filter(([, qty]) => qty > 0);
  const displayTitle = resolveQuoteProductTitle(quote);
  const displayImage = quote.productImageUrl || DEFAULT_QUOTE_PRODUCT_IMAGE;

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
      productName: `${quote.quoteCode} - ${displayTitle}`,
      productUrl: window.location.href,
    });
    if (!result.opened) {
      showToast("Số Zalo đang cập nhật, hãy dùng nút Chat với shop.", "info");
    } else if (result.copied) {
      showToast("Đã sao chép mã báo giá — đang mở Zalo", "info");
    }
  };

  return (
    <section className="min-h-[75vh] bg-[#f8faf9] px-4 py-10 font-inter antialiased sm:px-6 lg:px-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={ROUTES.QUOTES}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#1d4ed8]"
          >
            <Icon icon="mdi:arrow-left" width={18} />
            Danh sách báo giá của tôi
          </Link>

          <div className="flex flex-wrap gap-2">
            {quote.status === "Quoted" ? (
              <button
                type="button"
                disabled={acceptMutation.isPending}
                onClick={() =>
                  void acceptMutation
                    .mutateAsync(quote.id)
                    .then(() => showToast("Báo giá thành công, đơn hàng đã được tạo", "success"))
                    .catch((error: unknown) =>
                      showToast((error as Error).message || "Không thể xác nhận báo giá", "error")
                    )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Icon icon="mdi:check-circle-outline" width={17} />
                {acceptMutation.isPending ? "Đang xác nhận..." : "Chốt báo giá"}
              </button>
            ) : null}
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

        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-mono text-xl font-bold text-primeColor sm:text-2xl">
                {quote.quoteCode}
              </h1>
              <span className={`rounded-md px-3 py-1 text-xs font-semibold ${userBadge.label === "Báo giá thành công" ? "border border-emerald-500 bg-emerald-500 text-black" : userBadge.badgeClass}`}>
                {userBadge.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-lightText sm:text-sm">{meta.description}</p>
          </div>

          {!isTerminalClosed && !hasConfirmedOrder ? (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {orderMilestones.map((milestone) => (
                  <div key={milestone.label} className="flex flex-col items-start gap-1">
                    <div
                      className={`h-1.5 w-full rounded-full ${
                        milestone.done ? "bg-primeColor" : "bg-gray-200"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        milestone.done ? "text-primeColor" : "text-slate-400"
                      }`}
                    >
                      {milestone.label}
                    </span>
                  </div>
              ))}
            </div>
          ) : null}

          {isTerminalClosed ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs sm:text-sm text-slate-700">
              Yêu cầu này đang ở trạng thái <strong>Đã hủy</strong>.
            </div>
          ) : null}

          {quote.order ? (
            <section className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Sản phẩm: <span className="font-bold text-primeColor">{displayTitle}</span>
                  </p>
                  <p className="mt-1 text-lg font-bold text-black">{quote.order.orderCode || quote.order.id}</p>
                </div>
                <span className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
                  {orderStatusLabels[quote.order.status] || quote.order.status}
                </span>
              </div>

              <div className="p-5">
                <div className="overflow-x-auto pb-1">
                  <div className="grid min-w-[620px] grid-cols-5 gap-3">
                    {orderMilestones.map((milestone, index) => (
                      <div key={milestone.label} className="min-w-0 text-center">
                        <div className="relative flex justify-center">
                          <span className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${milestone.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-500"}`}>
                            {index + 1}
                          </span>
                          {index < orderMilestones.length - 1 ? (
                            <span className={`absolute left-[calc(50%+14px)] top-1/2 h-0.5 w-[calc(100%+0.75rem-28px)] -translate-y-1/2 ${milestone.done && orderMilestones[index + 1]?.done ? "bg-emerald-500" : "bg-slate-200"}`} />
                          ) : null}
                        </div>
                        <p className={`mt-2 truncate text-center text-xs font-semibold ${milestone.done ? "text-black" : "text-slate-500"}`} title={milestone.label}>
                          {milestone.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <OrderInfoBox label="Tổng tiền" value={formatPrice(quote.order.total)} />
                  <OrderInfoBox label="Thanh toán" value={quote.order.paymentStatus === "Paid" ? "Đã thanh toán" : "Chờ thanh toán"} />
                  <OrderInfoBox label="Đơn vị vận chuyển" value={quote.order.shipping?.carrierName || "Chưa cập nhật"} />
                  <OrderInfoBox label="Mã vận đơn" value={quote.order.shipping?.trackingNumber || "Chưa cập nhật"} />
                </div>

                {(quote.order.shipping?.currentLocation || quote.order.shipping?.estimatedDelivery) ? (
                  <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Vị trí hiện tại</p>
                      <p className="mt-1 font-semibold text-black">{quote.order.shipping?.currentLocation || "Chưa cập nhật"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Dự kiến giao hàng</p>
                      <p className="mt-1 font-semibold text-black">
                        {quote.order.shipping?.estimatedDelivery
                          ? new Date(quote.order.shipping.estimatedDelivery).toLocaleString("vi-VN")
                          : "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                ) : null}

                {quote.order.shipping?.trackingUrl ? (
                  <a href={quote.order.shipping.trackingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-md border border-emerald-500 bg-emerald-50 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-100">
                    Theo dõi vận chuyển
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Thông số sản xuất
            </h2>
            {quote.quotedPrice != null ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600">
                <p>
                  Tổng giá: <span className="text-sm font-medium text-black">{formatPrice(quote.quotedPrice)}</span>
                </p>
                {quote.quotedAt ? (
                  <time>Cập nhật {new Date(quote.quotedAt).toLocaleString("vi-VN")}</time>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0 rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">Tên sản phẩm</p>
                <p className="mt-1 truncate text-sm font-medium text-black" title={displayTitle}>
                  {displayTitle}
                </p>
                {quote.productSlug ? (
                  <Link to={routeTo.product(quote.productSlug)} className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">
                    Xem mẫu áo
                  </Link>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-3 text-center">
                <p className="text-xs text-slate-500">Ảnh sản phẩm</p>
                <a
                  href={displayImage}
                  target="_blank"
                  rel="noreferrer"
                  className="mx-auto mt-2 block w-fit overflow-hidden rounded-md border border-slate-200 bg-white"
                >
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    className="h-24 w-32 object-cover transition hover:scale-105"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== DEFAULT_QUOTE_PRODUCT_IMAGE) {
                        target.src = DEFAULT_QUOTE_PRODUCT_IMAGE;
                      }
                    }}
                  />
                </a>
              </div>
            </div>

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

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
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
                const previewFiles = designFiles.filter((file) =>
                  file.contentType.startsWith("image/") || /\.(png|jpe?g|svg|webp)$/i.test(file.originalName)
                );
                const sizeFiles = quote.logoFiles.filter(
                  (f) => !/\.(png|jpe?g|svg|webp|ai)$/i.test(f.fileName || f.originalName)
                );

                return (
                  <div className="space-y-3">
                    {previewFiles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {previewFiles.map((file) => (
                          <QuoteImagePreview key={file.fileName} quoteId={quote.id} file={file} />
                        ))}
                      </div>
                    ) : null}
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

function OrderInfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-black" title={value}>{value}</p>
    </div>
  );
}

function QuoteImagePreview({ quoteId, file }: { quoteId: string; file: LogoFileRefDto }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void quoteRequestService.getLogoBlob(quoteId, file.fileName)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.fileName, quoteId]);

  return (
    <button
      type="button"
      disabled={!previewUrl}
      onClick={() => previewUrl && window.open(previewUrl, "_blank", "noopener,noreferrer")}
      className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left disabled:cursor-wait"
      aria-label={`Xem ảnh ${file.originalName}`}
    >
      {previewUrl ? (
        <img src={previewUrl} alt={file.originalName} className="h-28 w-full object-cover transition group-hover:scale-105" />
      ) : (
        <span className="block h-28 animate-pulse bg-slate-100" />
      )}
      <span className="block truncate border-t border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-black">
        {file.originalName}
      </span>
    </button>
  );
}

