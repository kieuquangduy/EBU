import { Icon } from "@iconify/react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type {
  AdminCreateOrderItemDto,
  AdminUpdateOrderStatusDto,
  OrderSource,
} from "../../@types/admin.type";
import { OrderStatuses } from "../../@types/enums.type";
import { useToast } from "../../context/toastContext";
import {
  useAdminOrder,
  useAdminOrders,
  useCreateManualOrder,
  useUpdateAdminOrderPayment,
  useUpdateAdminOrderStatus,
} from "../../hooks/useAdmin";
import { useDebounce } from "../../hooks/useDebounce";
import { formatPrice } from "../../utils/formatPrice";
import {
  AdminBadge,
  AdminEmptyState,
  AdminPanel,
  AdminPanelHeader,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminStatCard,
  ResizableTh,
  formatAdminDateTime,
  formatOrderStatusLabel,
  formatPaymentStatusLabel,
  statusTone,
  useResizableColumns,
} from "./adminShared";

const statuses: Array<AdminUpdateOrderStatusDto["status"] | ""> = [
  "",
  OrderStatuses.Pending,
  OrderStatuses.OrderPlaced,
  OrderStatuses.SellerConfirmed,
  OrderStatuses.Packing,
  OrderStatuses.HandoverToCarrier,
  OrderStatuses.InTransit,
  OrderStatuses.OutForDelivery,
  OrderStatuses.Delivered,
  OrderStatuses.DeliveryFailed,
  OrderStatuses.Processing,
  OrderStatuses.Shipping,
  OrderStatuses.Completed,
  OrderStatuses.Cancelled,
  OrderStatuses.ReturnRequested,
  OrderStatuses.ReturnApproved,
  OrderStatuses.ReturnRejected,
  OrderStatuses.Returned,
  OrderStatuses.Refunded,
];

const statusOptions = statuses.slice(1) as AdminUpdateOrderStatusDto["status"][];
const PAGE_SIZE = 10;

const validTransitions: Partial<Record<AdminUpdateOrderStatusDto["status"], AdminUpdateOrderStatusDto["status"][]>> = {
  Pending: [OrderStatuses.Pending, OrderStatuses.OrderPlaced, OrderStatuses.SellerConfirmed, OrderStatuses.Cancelled],
  Processing: [OrderStatuses.Processing, OrderStatuses.SellerConfirmed, OrderStatuses.Packing, OrderStatuses.HandoverToCarrier, OrderStatuses.Cancelled],
  Shipping: [OrderStatuses.Shipping, OrderStatuses.InTransit, OrderStatuses.OutForDelivery, OrderStatuses.Delivered, OrderStatuses.DeliveryFailed, OrderStatuses.Completed],
  OrderPlaced: [OrderStatuses.OrderPlaced, OrderStatuses.SellerConfirmed, OrderStatuses.Cancelled],
  SellerConfirmed: [OrderStatuses.SellerConfirmed, OrderStatuses.Packing, OrderStatuses.Cancelled],
  Packing: [OrderStatuses.Packing, OrderStatuses.HandoverToCarrier, OrderStatuses.Cancelled],
  HandoverToCarrier: [OrderStatuses.HandoverToCarrier, OrderStatuses.InTransit, OrderStatuses.DeliveryFailed],
  InTransit: [OrderStatuses.InTransit, OrderStatuses.OutForDelivery, OrderStatuses.DeliveryFailed],
  OutForDelivery: [OrderStatuses.OutForDelivery, OrderStatuses.Delivered, OrderStatuses.DeliveryFailed],
  DeliveryFailed: [OrderStatuses.DeliveryFailed, OrderStatuses.OutForDelivery, OrderStatuses.Returned, OrderStatuses.Cancelled],
  Delivered: [OrderStatuses.Delivered, OrderStatuses.Completed, OrderStatuses.ReturnRequested],
  Completed: [OrderStatuses.Completed, OrderStatuses.ReturnRequested],
  Cancelled: [OrderStatuses.Cancelled],
  ReturnRequested: [OrderStatuses.ReturnRequested, OrderStatuses.ReturnApproved, OrderStatuses.ReturnRejected],
  ReturnRejected: [OrderStatuses.ReturnRejected, OrderStatuses.Delivered, OrderStatuses.Completed],
  ReturnApproved: [OrderStatuses.ReturnApproved, OrderStatuses.Returned],
  Returned: [OrderStatuses.Returned, OrderStatuses.Refunded],
  Refunded: [OrderStatuses.Refunded],
};

function toDateTimeInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatOrderSourceLabel(source?: string | null) {
  if (source === "FromQuote") return "Từ báo giá";
  if (source === "ManualZalo") return "Zalo / Nhập tay";
  return "Website";
}

function orderSourceTone(source?: string | null) {
  if (source === "FromQuote") return "bg-indigo-100 text-indigo-800";
  if (source === "ManualZalo") return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-700";
}

export default function AdminOrdersPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminUpdateOrderStatusDto["status"] | "">("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [draftStatus, setDraftStatus] = useState<AdminUpdateOrderStatusDto["status"]>(OrderStatuses.Pending);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { widths, startResize } = useResizableColumns([
    56, 120, 150, 150, 125, 145, 130, 130, 150,
  ]);

  const debouncedSearch = useDebounce(search, 350);
  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, page, status]
  );

  const ordersQuery = useAdminOrders(filters);
  const orderDetailQuery = useAdminOrder(selectedOrderId);
  const updateStatusMutation = useUpdateAdminOrderStatus();
  const updatePaymentMutation = useUpdateAdminOrderPayment();
  const createManualOrderMutation = useCreateManualOrder();
  const orderDetail = orderDetailQuery.data;
  const orders = ordersQuery.data?.items ?? [];

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualReceiverName, setManualReceiverName] = useState("");
  const [manualReceiverPhone, setManualReceiverPhone] = useState("");
  const [manualAddressLine, setManualAddressLine] = useState("");
  const [manualSource, setManualSource] = useState<OrderSource>("ManualZalo");
  const [manualShippingFee, setManualShippingFee] = useState("0");
  const [manualNote, setManualNote] = useState("");
  const [manualIsPaid, setManualIsPaid] = useState(false);
  const [manualItems, setManualItems] = useState<AdminCreateOrderItemDto[]>([
    { productName: "", variantSize: "", variantColor: "", quantity: 10, unitPrice: 120000 },
  ]);

  useEffect(() => {
    const orderId = new URLSearchParams(location.search).get("orderId");
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  }, [location.search]);

  const stats = useMemo(() => {
    return {
      pending: orders.filter((item) => item.status === "Pending").length,
      shipping: orders.filter((item) => item.status === "Shipping").length,
      completed: orders.filter((item) => item.status === "Completed").length,
    };
  }, [orders]);

  useEffect(() => {
    if (!orderDetail) return;
    setDraftStatus(orderDetail.status as AdminUpdateOrderStatusDto["status"]);
    setTrackingNumber(orderDetail.shipping?.trackingNumber ?? "");
    setCarrierName(orderDetail.shipping?.carrierName ?? "");
    setCurrentLocation(orderDetail.shipping?.currentLocation ?? "");
    setEstimatedDelivery(toDateTimeInputValue(orderDetail.shipping?.estimatedDelivery));
    setStatusNote("");
    setFormError(null);
  }, [orderDetail]);

  const handleUpdateStatus = async () => {
    if (!selectedOrderId || !orderDetail) {
      setFormError("Cần chọn một đơn hàng hợp lệ.");
      return;
    }

    const currentStatus = orderDetail.status as AdminUpdateOrderStatusDto["status"];
    if (!validTransitions[currentStatus]?.includes(draftStatus)) {
      setFormError(
        `Không thể chuyển trạng thái từ ${formatOrderStatusLabel(currentStatus)} sang ${formatOrderStatusLabel(draftStatus)}.`
      );
      return;
    }

    setFormError(null);

    try {
      await updateStatusMutation.mutateAsync({
        orderId: selectedOrderId,
        dto: {
          status: draftStatus,
          trackingNumber: trackingNumber.trim() || null,
          carrierName: carrierName.trim() || null,
          currentLocation: currentLocation.trim() || null,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
          note: statusNote.trim() || null,
        },
      });
    } catch (error) {
      setFormError((error as Error).message);
    }
  };

  const handleCreateManualOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const validItems = manualItems.filter((item) => item.productName.trim() && item.quantity > 0);
    if (!manualReceiverName.trim() || !manualReceiverPhone.trim() || !manualAddressLine.trim()) {
      showToast("Vui lòng nhập đầy đủ tên, SĐT và địa chỉ người nhận", "warning");
      return;
    }
    if (!validItems.length) {
      showToast("Cần ít nhất 1 dòng sản phẩm hợp lệ", "warning");
      return;
    }

    try {
      const created = await createManualOrderMutation.mutateAsync({
        receiverName: manualReceiverName.trim(),
        receiverPhone: manualReceiverPhone.trim(),
        addressLine: manualAddressLine.trim(),
        source: manualSource,
        shippingFee: Number(manualShippingFee) || 0,
        note: manualNote.trim() || null,
        isPaid: manualIsPaid,
        paidAt: manualIsPaid ? new Date().toISOString() : null,
        items: validItems.map((item) => ({
          ...item,
          productName: item.productName.trim(),
          variantSize: item.variantSize?.trim() || null,
          variantColor: item.variantColor?.trim() || null,
        })),
      });
      setManualModalOpen(false);
      setSelectedOrderId(created.id);
      setManualReceiverName("");
      setManualReceiverPhone("");
      setManualAddressLine("");
      setManualNote("");
      setManualItems([
        { productName: "", variantSize: "", variantColor: "", quantity: 10, unitPrice: 120000 },
      ]);
      showToast("Đã tạo đơn hàng thủ công thành công", "success");
    } catch (error) {
      showToast((error as Error).message || "Không thể tạo đơn hàng", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quản lý đơn hàng &amp; doanh thu</h2>
          <p className="text-xs text-slate-500">
            Theo dõi đơn chốt từ RFQ, tạo đơn thủ công khi khách chốt qua Zalo và đối soát thanh toán.
          </p>
        </div>
        <AdminPrimaryButton type="button" onClick={() => setManualModalOpen(true)}>
          <Icon icon="mdi:plus" width={18} className="mr-1.5" />
          Tạo đơn thủ công (Zalo)
        </AdminPrimaryButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Tổng đơn trong trang"
          value={String(ordersQuery.data?.items.length ?? 0)}
          meta={`Tổng kết quả ${ordersQuery.data?.total ?? 0}`}
          accentClass="bg-blue-50 text-blue-700"
        />
        <AdminStatCard
          label="Đang chờ / xử lý"
          value={String(stats.pending)}
          meta="Cần theo dõi tiếp"
          accentClass="bg-red-50 text-red-700"
        />
        <AdminStatCard
          label="Đang giao / hoàn tất"
          value={String(stats.shipping + stats.completed)}
          meta={`${stats.completed} đã hoàn thành`}
          accentClass="bg-cyan-50 text-cyan-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <AdminPanel className="self-start">
          <AdminPanelHeader title="Danh sách đơn hàng" />

          <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:px-6">
            <div className="relative flex-1">
              <Icon
                icon="mdi:magnify"
                width={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => {
                    setPage(1);
                    setSearch(value);
                  });
                }}
                placeholder="Tìm theo mã đơn, thư điện tử, tên người nhận"
                className="w-full rounded-lg border border-sky-200 bg-slate-50 px-11 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as AdminUpdateOrderStatusDto["status"] | "");
              }}
              className="w-full rounded-lg border border-sky-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 sm:w-auto"
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {formatOrderStatusLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto px-2 pt-2 sm:px-4">
            <table className="w-full table-fixed border-collapse font-inter text-sm font-normal">
              <colgroup>
                {widths.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <ResizableTh align="center" onResizeStart={startResize(0)}>
                    STT
                  </ResizableTh>
                  <ResizableTh onResizeStart={startResize(1)}>Mã đơn</ResizableTh>
                  <ResizableTh onResizeStart={startResize(2)}>Khách hàng</ResizableTh>
                  <ResizableTh onResizeStart={startResize(3)}>Người nhận</ResizableTh>
                  <ResizableTh onResizeStart={startResize(4)}>Số điện thoại</ResizableTh>
                  <ResizableTh onResizeStart={startResize(5)}>Thời gian đặt</ResizableTh>
                  <ResizableTh align="center" onResizeStart={startResize(6)}>
                    Thanh toán
                  </ResizableTh>
                  <ResizableTh align="right" onResizeStart={startResize(7)}>
                    Tổng tiền
                  </ResizableTh>
                  <ResizableTh align="center" showDivider={false}>
                    Trạng thái
                  </ResizableTh>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const stt = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={[
                        "cursor-pointer border-b border-slate-100 transition last:border-b-0 hover:bg-sky-50/70",
                        selectedOrderId === order.id ? "bg-blue-50/70" : "",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-center font-normal text-slate-500">
                        {stt}
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 font-medium text-slate-800"
                        title={order.orderCode || order.id}
                      >
                        <div className="truncate">{order.orderCode || order.id}</div>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${orderSourceTone(order.source)}`}>
                          {formatOrderSourceLabel(order.source)}
                        </span>
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 font-normal text-slate-700"
                        title={order.customerName || "Khách lẻ"}
                      >
                        {order.customerName || "Khách lẻ"}
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 font-normal text-slate-600"
                        title={order.receiverName}
                      >
                        {order.receiverName}
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 font-normal text-slate-600"
                        title={order.receiverPhone}
                      >
                        {order.receiverPhone}
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 text-xs font-normal text-slate-500"
                        title={formatAdminDateTime(order.created)}
                      >
                        {formatAdminDateTime(order.created)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <AdminBadge
                          className={[statusTone(order.paymentStatus, "payment"), "max-w-full truncate"].join(" ")}
                        >
                          {formatPaymentStatusLabel(order.paymentStatus)}
                        </AdminBadge>
                      </td>
                      <td
                        className="truncate whitespace-nowrap px-3 py-3 text-right font-inter text-[13px] font-medium tabular-nums text-slate-800"
                      >
                        {formatPrice(order.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <AdminBadge className={[statusTone(order.status), "max-w-full truncate"].join(" ")}>
                          {formatOrderStatusLabel(order.status)}
                        </AdminBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!orders.length ? (
              <div className="px-2 py-4">
                <AdminEmptyState
                  icon="mdi:shopping-off"
                  title="Không có đơn hàng phù hợp"
                  description="Thử đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái hiện tại."
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>Tổng {ordersQuery.data?.total ?? 0} đơn hàng</span>
            <div className="flex items-center gap-2">
              <AdminSecondaryButton
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="px-3 py-2"
              >
                Trước
              </AdminSecondaryButton>
              <span className="px-2 font-semibold text-slate-900">
                {page}/{ordersQuery.data?.totalPages ?? 1}
              </span>
              <AdminSecondaryButton
                type="button"
                disabled={page >= (ordersQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
                className="px-3 py-2"
              >
                Sau
              </AdminSecondaryButton>
            </div>
          </div>
        </AdminPanel>

        <div className="min-h-[520px] xl:relative xl:self-stretch">
          <AdminPanel className="flex max-h-[680px] flex-col overflow-hidden xl:absolute xl:inset-0 xl:max-h-none">
            <AdminPanelHeader title="Chi tiết đơn hàng" />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
            {!selectedOrderId ? (
              <AdminEmptyState
                icon="mdi:shopping-outline"
                title="Chọn một đơn hàng"
                description="Chi tiết giao nhận, sản phẩm và thao tác cập nhật trạng thái sẽ hiển thị tại đây."
              />
            ) : orderDetailQuery.isLoading ? (
              <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
            ) : orderDetail ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-200/80 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-slate-900">
                        {orderDetail.orderCode || orderDetail.id}
                      </p>
                      <p className="truncate text-sm text-slate-600">
                        {orderDetail.customerName || "Khách lẻ"} · {orderDetail.customerEmail || "Không có thư điện tử"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <AdminBadge className={orderSourceTone(orderDetail.source)}>
                          Nguồn: {formatOrderSourceLabel(orderDetail.source)}
                        </AdminBadge>
                        {orderDetail.quoteRequestId ? (
                          <AdminBadge className="bg-blue-50 text-blue-700">
                            Liên kết RFQ
                          </AdminBadge>
                        ) : null}
                      </div>
                    </div>
                    <AdminBadge className={statusTone(orderDetail.status)}>
                      {formatOrderStatusLabel(orderDetail.status)}
                    </AdminBadge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Tổng tiền" value={formatPrice(orderDetail.total)} />
                    <InfoCard label="Thanh toán" value={formatPaymentStatusLabel(orderDetail.paymentStatus)} />
                    <InfoCard label="Tạm tính" value={formatPrice(orderDetail.subtotal)} />
                    <InfoCard label="Phí vận chuyển" value={formatPrice(orderDetail.shippingFee)} />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <AdminSecondaryButton
                      type="button"
                      disabled={updatePaymentMutation.isPending}
                      onClick={() =>
                        void updatePaymentMutation
                          .mutateAsync({
                            orderId: orderDetail.id,
                            dto: {
                              isPaid: orderDetail.paymentStatus !== "Paid",
                              paidAt:
                                orderDetail.paymentStatus !== "Paid"
                                  ? new Date().toISOString()
                                  : null,
                            },
                          })
                          .then(() => showToast("Đã cập nhật trạng thái thanh toán", "success"))
                          .catch((err: unknown) =>
                            showToast((err as Error).message || "Lỗi cập nhật thanh toán", "error")
                          )
                      }
                      className="px-3 py-1.5 text-xs"
                    >
                      {orderDetail.paymentStatus === "Paid"
                        ? "Chuyển sang Chờ thanh toán"
                        : "Đánh dấu Đã thanh toán"}
                    </AdminSecondaryButton>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-800">Người nhận</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">{orderDetail.receiverName}</span>
                      {" · "}
                      {orderDetail.receiverPhone}
                    </p>
                    <p>{orderDetail.addressLine}</p>
                    <p className="text-xs text-slate-400">Cập nhật lần cuối: {formatAdminDateTime(orderDetail.updated)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-800">Vận chuyển</p>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600">
                    <InfoCard label="Đơn vị" value={orderDetail.shipping?.carrierName || "Chưa cập nhật"} />
                    <InfoCard label="Mã vận đơn" value={orderDetail.shipping?.trackingNumber || "Chưa cập nhật"} />
                    <InfoCard label="Vị trí" value={orderDetail.shipping?.currentLocation || "Chưa cập nhật"} />
                    <InfoCard label="Dự kiến" value={formatAdminDateTime(orderDetail.shipping?.estimatedDelivery)} />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-white p-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">Trạng thái mới</span>
                    <select
                      value={draftStatus}
                      onChange={(event) => {
                        setDraftStatus(event.target.value as AdminUpdateOrderStatusDto["status"]);
                        setFormError(null);
                      }}
                      className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                    >
                      {statusOptions
                        .filter((item) =>
                          validTransitions[
                            (orderDetail.status as AdminUpdateOrderStatusDto["status"]) ?? "Pending"
                          ]?.includes(item)
                        )
                        .map((item) => (
                          <option key={item} value={item}>
                            {formatOrderStatusLabel(item)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Mã vận đơn</span>
                      <input
                        value={trackingNumber}
                        onChange={(event) => setTrackingNumber(event.target.value)}
                        className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                        placeholder="VD: GHN123456789"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-800">Đơn vị vận chuyển</span>
                        <input
                          value={carrierName}
                          onChange={(event) => setCarrierName(event.target.value)}
                          className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                          placeholder="GHN, GHTK, Viettel Post..."
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-800">Dự kiến giao</span>
                        <input
                          type="datetime-local"
                          value={estimatedDelivery}
                          onChange={(event) => setEstimatedDelivery(event.target.value)}
                          className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Vị trí hiện tại</span>
                      <input
                        value={currentLocation}
                        onChange={(event) => setCurrentLocation(event.target.value)}
                        className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                        placeholder="Kho Hồ Chí Minh, đang giao tại Quận 1..."
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Ghi chú vận chuyển</span>
                      <textarea
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400"
                        placeholder="Thông tin sẽ hiển thị trong lịch trình đơn hàng của khách hàng"
                      />
                    </label>
                  </div>

                  {formError ? (
                    <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  ) : null}

                  {updateStatusMutation.isSuccess ? (
                    <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Đã cập nhật trạng thái đơn hàng thành công.
                    </div>
                  ) : null}

                  <AdminPrimaryButton
                    type="button"
                    onClick={() => void handleUpdateStatus()}
                    disabled={updateStatusMutation.isPending}
                    className="mt-4 w-full"
                  >
                    {updateStatusMutation.isPending ? "Đang cập nhật..." : "Lưu trạng thái"}
                  </AdminPrimaryButton>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-800">Sản phẩm trong đơn</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full table-fixed border-collapse font-inter text-xs font-normal">
                      <thead>
                        <tr className="border-b border-slate-200 text-left uppercase tracking-wider text-slate-400">
                          <th className="w-36 whitespace-nowrap py-2 pr-2 font-medium">Sản phẩm</th>
                          <th className="w-24 whitespace-nowrap px-2 py-2 font-medium">Mã SP</th>
                          <th className="w-16 whitespace-nowrap px-2 py-2 text-center font-medium">Cỡ</th>
                          <th className="w-16 whitespace-nowrap px-2 py-2 text-center font-medium">Màu</th>
                          <th className="w-12 whitespace-nowrap px-2 py-2 text-center font-medium">SL</th>
                          <th className="w-24 whitespace-nowrap py-2 pl-2 text-right font-medium">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(orderDetail.items ?? []).map((item, index) => (
                          <tr key={`${item.productId}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="truncate whitespace-nowrap py-2.5 pr-2 font-medium text-slate-800" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 font-normal text-slate-500" title={item.variantSku || "--"}>
                              {item.variantSku || "--"}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 text-center font-normal text-slate-600">
                              {item.variantSize || "-"}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 text-center font-normal text-slate-600">
                              {item.variantColor || "-"}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-center font-normal text-slate-700">
                              {item.quantity}
                            </td>
                            <td className="truncate whitespace-nowrap py-2.5 pl-2 text-right font-medium text-blue-700">
                              {formatPrice(item.total ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <AdminEmptyState
                icon="mdi:alert-circle-outline"
                title="Không tìm thấy đơn"
                description="Bản ghi có thể đã bị thay đổi hoặc không tồn tại."
              />
            )}
          </div>
          </AdminPanel>
        </div>
      </div>

      {manualModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setManualModalOpen(false)}
        >
          <form
            onSubmit={handleCreateManualOrder}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Tạo đơn hàng thủ công (Zalo / Khách lẻ)</h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <Icon icon="mdi:close" width={20} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Người nhận *</label>
                <input
                  value={manualReceiverName}
                  onChange={(e) => setManualReceiverName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Số điện thoại *</label>
                <input
                  value={manualReceiverPhone}
                  onChange={(e) => setManualReceiverPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nguồn đơn</label>
                <select
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value as OrderSource)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ManualZalo">Zalo / Nhập tay</option>
                  <option value="FromQuote">Từ báo giá</option>
                  <option value="Storefront">Storefront</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Địa chỉ giao hàng *</label>
              <input
                value={manualAddressLine}
                onChange={(e) => setManualAddressLine(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Danh sách sản phẩm
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setManualItems((prev) => [
                      ...prev,
                      { productName: "", variantSize: "", variantColor: "", quantity: 10, unitPrice: 120000 },
                    ])
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  + Thêm dòng
                </button>
              </div>
              {manualItems.map((item, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1.5fr_70px_80px_70px_100px_auto] items-center">
                  <input
                    value={item.productName}
                    onChange={(e) =>
                      setManualItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, productName: e.target.value } : row))
                      )
                    }
                    placeholder="Tên mẫu áo"
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
                  />
                  <input
                    value={item.variantSize ?? ""}
                    onChange={(e) =>
                      setManualItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, variantSize: e.target.value } : row))
                      )
                    }
                    placeholder="Size"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    value={item.variantColor ?? ""}
                    onChange={(e) =>
                      setManualItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, variantColor: e.target.value } : row))
                      )
                    }
                    placeholder="Màu"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      setManualItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) } : row
                        )
                      )
                    }
                    placeholder="SL"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      setManualItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, unitPrice: Math.max(0, Number(e.target.value) || 0) } : row
                        )
                      )
                    }
                    placeholder="Đơn giá"
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                  />
                  {manualItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setManualItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Icon icon="mdi:trash-can-outline" width={16} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Phí vận chuyển</label>
                <input
                  type="number"
                  min={0}
                  value={manualShippingFee}
                  onChange={(e) => setManualShippingFee(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Ghi chú đơn</label>
                <input
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={manualIsPaid}
                onChange={(e) => setManualIsPaid(e.target.checked)}
              />
              Đã thanh toán (cộng vào doanh thu thực thu)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <AdminSecondaryButton type="button" onClick={() => setManualModalOpen(false)}>
                Hủy
              </AdminSecondaryButton>
              <AdminPrimaryButton type="submit" disabled={createManualOrderMutation.isPending}>
                {createManualOrderMutation.isPending ? "Đang tạo..." : "Lưu đơn hàng"}
              </AdminPrimaryButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-base font-semibold text-slate-900" title={value}>{value}</p>
    </div>
  );
}
