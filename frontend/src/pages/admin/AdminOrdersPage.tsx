import { Icon } from "@iconify/react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type {
  AdminCreateOrderItemDto,
  AdminUpdateOrderStatusDto,
  OrderSource,
} from "../../@types/admin.type";
import type { PrintTechnique } from "../../@types/quoteRequest.type";
import { OrderStatuses } from "../../@types/enums.type";
import { useToast } from "../../context/toastContext";
import {
  useAdminOrder,
  useAdminOrders,
  useCreateManualOrder,
  useDeleteAdminOrderFile,
  useUpdateAdminOrderPayment,
  useUpdateAdminOrderDetails,
  useUpdateAdminOrderStatus,
  useUploadAdminOrderFiles,
} from "../../hooks/useAdmin";
import { useDebounce } from "../../hooks/useDebounce";
import { formatPrice } from "../../utils/formatPrice";
import { formatPrintTechnique } from "../../lib/quoteStatus";
import { quoteRequestService } from "../../services/quoteRequestService";
import { adminService } from "../../services/adminService";
import ZaloIcon from "../../components/common/ZaloIcon";
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

const orderFilterOptions = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "production", label: "Đang sản xuất" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "returns", label: "Hoàn hàng / hoàn tiền" },
] as const;
const PAGE_SIZE = 10;

type OrderDetailTab = "overview" | "details" | "status" | "shipping";

const shippingStatuses = new Set<AdminUpdateOrderStatusDto["status"]>([
  OrderStatuses.Shipping,
  OrderStatuses.HandoverToCarrier,
  OrderStatuses.InTransit,
  OrderStatuses.OutForDelivery,
  OrderStatuses.Delivered,
  OrderStatuses.DeliveryFailed,
  OrderStatuses.Completed,
  OrderStatuses.ReturnRequested,
  OrderStatuses.ReturnApproved,
  OrderStatuses.ReturnRejected,
  OrderStatuses.Returned,
  OrderStatuses.Refunded,
]);

const validTransitions: Partial<Record<AdminUpdateOrderStatusDto["status"], AdminUpdateOrderStatusDto["status"][]>> = {
  Pending: [OrderStatuses.Pending, OrderStatuses.Processing, OrderStatuses.OrderPlaced, OrderStatuses.SellerConfirmed, OrderStatuses.Cancelled],
  Processing: [OrderStatuses.Processing, OrderStatuses.SellerConfirmed, OrderStatuses.Packing, OrderStatuses.HandoverToCarrier, OrderStatuses.Shipping, OrderStatuses.Cancelled],
  Shipping: [OrderStatuses.Shipping, OrderStatuses.InTransit, OrderStatuses.OutForDelivery, OrderStatuses.Delivered, OrderStatuses.DeliveryFailed, OrderStatuses.Completed],
  OrderPlaced: [OrderStatuses.OrderPlaced, OrderStatuses.SellerConfirmed, OrderStatuses.Cancelled],
  SellerConfirmed: [OrderStatuses.SellerConfirmed, OrderStatuses.InProduction, OrderStatuses.Packing, OrderStatuses.Cancelled],
  InProduction: [OrderStatuses.InProduction, OrderStatuses.Packing, OrderStatuses.HandoverToCarrier, OrderStatuses.Shipping, OrderStatuses.Cancelled],
  Packing: [OrderStatuses.Packing, OrderStatuses.HandoverToCarrier, OrderStatuses.Cancelled],
  HandoverToCarrier: [OrderStatuses.HandoverToCarrier, OrderStatuses.InTransit, OrderStatuses.DeliveryFailed],
  InTransit: [OrderStatuses.InTransit, OrderStatuses.OutForDelivery, OrderStatuses.DeliveryFailed],
  OutForDelivery: [OrderStatuses.OutForDelivery, OrderStatuses.Delivered, OrderStatuses.DeliveryFailed],
  DeliveryFailed: [OrderStatuses.DeliveryFailed, OrderStatuses.OutForDelivery, OrderStatuses.Returned, OrderStatuses.Cancelled],
  PaymentSucceeded: [OrderStatuses.PaymentSucceeded, OrderStatuses.SellerConfirmed, OrderStatuses.Completed],
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
  if (source === "Rfq") return "Từ báo giá";
  if (source === "ManualZalo") return "Zalo / Nhập tay";
  if (source === "ManualMessenger") return "Messenger / Nhập tay";
  if (source === "ManualHotline") return "Hotline / Nhập tay";
  if (source === "Other") return "Khác";
  return "Website";
}

function orderSourceTone(source?: string | null) {
  if (source === "Rfq") return "bg-indigo-100 text-indigo-800";
  if (source === "ManualZalo") return "bg-blue-50 text-[#0068ff] border border-blue-200 font-semibold";
  if (source === "ManualMessenger") return "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold";
  return "bg-slate-100 text-slate-700";
}

export default function AdminOrdersPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [draftStatus, setDraftStatus] = useState<AdminUpdateOrderStatusDto["status"]>(OrderStatuses.Pending);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<OrderDetailTab>("overview");

  const { widths, totalWidth, startResize } = useResizableColumns([
    56, 120, 150, 150, 125, 145, 130, 130, 130, 150, 90,
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
  const updateDetailsMutation = useUpdateAdminOrderDetails();
  const uploadOrderFilesMutation = useUploadAdminOrderFiles();
  const deleteOrderFileMutation = useDeleteAdminOrderFile();
  const createManualOrderMutation = useCreateManualOrder();
  const orderDetail = orderDetailQuery.data;
  const orders = ordersQuery.data?.items ?? [];
  const currentOrderStatus = orderDetail?.status as AdminUpdateOrderStatusDto["status"] | undefined;
  const availableStatusTransitions = currentOrderStatus
    ? (validTransitions[currentOrderStatus] ?? []).filter((item) => item !== currentOrderStatus)
    : [];

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualReceiverName, setManualReceiverName] = useState("");
  const [manualCustomerEmail, setManualCustomerEmail] = useState("");
  const [manualReceiverPhone, setManualReceiverPhone] = useState("");
  const [manualAddressLine, setManualAddressLine] = useState("");
  const [manualSource, setManualSource] = useState<OrderSource>("ManualZalo");
  const [manualShippingFee, setManualShippingFee] = useState("0");
  const [manualNote, setManualNote] = useState("");
  const [manualIsPaid, setManualIsPaid] = useState(false);
  const [manualFiles, setManualFiles] = useState<File[]>([]);
  const [manualItems, setManualItems] = useState<AdminCreateOrderItemDto[]>([
    { productName: "", variantSize: "", variantColor: "", material: "", quantity: 10, unitPrice: 120000 },
  ]);
  const [editReceiverName, setEditReceiverName] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editReceiverPhone, setEditReceiverPhone] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editShippingFee, setEditShippingFee] = useState("0");
  const [editItems, setEditItems] = useState<AdminCreateOrderItemDto[]>([]);

  useEffect(() => {
    const orderId = new URLSearchParams(location.search).get("orderId");
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedOrderId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (manualModalOpen) setManualModalOpen(false);
      else setSelectedOrderId(undefined);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [manualModalOpen, selectedOrderId]);

  const stats = useMemo(() => {
    return {
      pending: orders.filter((item) => item.status === "Pending").length,
      shipping: orders.filter((item) => item.status === "Shipping").length,
      completed: orders.filter((item) => item.status === "Completed").length,
    };
  }, [orders]);

  useEffect(() => {
    if (!orderDetail) return;
    const currentStatus = orderDetail.status as AdminUpdateOrderStatusDto["status"];
    setDraftStatus(validTransitions[currentStatus]?.find((item) => item !== currentStatus) ?? currentStatus);
    setTrackingNumber(orderDetail.shipping?.trackingNumber ?? "");
    setCarrierName(orderDetail.shipping?.carrierName ?? "");
    setCurrentLocation(orderDetail.shipping?.currentLocation ?? "");
    setEstimatedDelivery(toDateTimeInputValue(orderDetail.shipping?.estimatedDelivery));
    setStatusNote("");
    setFormError(null);
    setEditReceiverName(orderDetail.receiverName);
    setEditCustomerEmail(orderDetail.customerEmail ?? "");
    setEditReceiverPhone(orderDetail.receiverPhone);
    setEditAddressLine(orderDetail.addressLine);
    setEditNote(orderDetail.note ?? "");
    setEditShippingFee(String(orderDetail.shippingFee));
    setEditItems(orderDetail.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      variantSize: item.variantSize,
      variantColor: item.variantColor,
      material: item.material,
      quantity: item.quantity,
      unitPrice: item.price,
    })));
  }, [orderDetail]);

  const handleUpdateStatus = async (
    nextStatus: AdminUpdateOrderStatusDto["status"] = draftStatus
  ) => {
    if (!selectedOrderId || !orderDetail) {
      setFormError("Cần chọn một đơn hàng hợp lệ.");
      return;
    }

    const currentStatus = orderDetail.status as AdminUpdateOrderStatusDto["status"];
    if (!validTransitions[currentStatus]?.includes(nextStatus)) {
      setFormError(
        `Không thể chuyển trạng thái từ ${formatOrderStatusLabel(currentStatus)} sang ${formatOrderStatusLabel(nextStatus)}.`
      );
      return;
    }

    setFormError(null);

    try {
      await updateStatusMutation.mutateAsync({
        orderId: selectedOrderId,
        dto: {
          status: nextStatus,
          trackingNumber: trackingNumber.trim() || null,
          carrierName: carrierName.trim() || null,
          currentLocation: currentLocation.trim() || null,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
          note: statusNote.trim() || null,
        },
      });
      showToast("Đã cập nhật trạng thái đơn hàng", "success");
    } catch (error) {
      await orderDetailQuery.refetch();
      setFormError((error as Error).message || "Không thể cập nhật trạng thái đơn hàng.");
    }
  };

  const handleCreateManualOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const validItems = manualItems.filter((item) => item.productName.trim() && item.quantity > 0);
    if (!manualReceiverName.trim() || !manualCustomerEmail.trim()) {
      showToast("Vui lòng nhập tên và email khách hàng", "warning");
      return;
    }
    if (!validItems.length) {
      showToast("Cần ít nhất 1 dòng sản phẩm hợp lệ", "warning");
      return;
    }

    try {
      const created = await createManualOrderMutation.mutateAsync({
        receiverName: manualReceiverName.trim(),
        customerEmail: manualCustomerEmail.trim(),
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
          material: item.material?.trim() || null,
        })),
      });
      if (manualFiles.length > 0) {
        await uploadOrderFilesMutation.mutateAsync({ orderId: created.id, files: manualFiles });
      }
      setManualModalOpen(false);
      setDetailTab("overview");
      setSelectedOrderId(created.id);
      setManualReceiverName("");
      setManualCustomerEmail("");
      setManualReceiverPhone("");
      setManualAddressLine("");
      setManualNote("");
      setManualFiles([]);
      setManualItems([
        { productName: "", variantSize: "", variantColor: "", material: "", quantity: 10, unitPrice: 120000 },
      ]);
      showToast("Đã tạo đơn hàng thủ công thành công", "success");
    } catch (error) {
      showToast((error as Error).message || "Không thể tạo đơn hàng", "error");
    }
  };

  const handleUpdateDetails = async () => {
    if (!orderDetail || !editReceiverName.trim() || editItems.length === 0) return;
    try {
      await updateDetailsMutation.mutateAsync({
        orderId: orderDetail.id,
        dto: {
          receiverName: editReceiverName.trim(),
          customerEmail: editCustomerEmail.trim() || null,
          receiverPhone: editReceiverPhone.trim(),
          addressLine: editAddressLine.trim(),
          note: editNote.trim() || null,
          shippingFee: Number(editShippingFee) || 0,
          items: editItems,
        },
      });
      showToast("Đã cập nhật chi tiết đơn hàng", "success");
    } catch (error) {
      showToast((error as Error).message || "Không thể cập nhật đơn hàng", "error");
    }
  };

  const handleUploadOrderFiles = async (files: File[]) => {
    if (!orderDetail || files.length === 0) return;
    try {
      await uploadOrderFilesMutation.mutateAsync({ orderId: orderDetail.id, files });
      showToast(`Đã tải lên ${files.length} tệp`, "success");
    } catch (error) {
      showToast((error as Error).message || "Không thể tải tệp lên", "error");
    }
  };

  const handleDeleteOrderFile = async (fileName: string, originalName: string) => {
    if (!orderDetail || !window.confirm(`Xóa tệp “${originalName}”?`)) return;
    try {
      await deleteOrderFileMutation.mutateAsync({ orderId: orderDetail.id, fileName });
      showToast("Đã xóa tệp khỏi đơn hàng", "success");
    } catch (error) {
      showToast((error as Error).message || "Không thể xóa tệp", "error");
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
        <AdminPrimaryButton
          type="button"
          onClick={() => setManualModalOpen(true)}
          className="bg-[#0068ff] hover:bg-[#0057d9] text-white"
        >
          <ZaloIcon size={18} className="mr-1.5" />
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

      <div>
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
                setStatus(event.target.value);
              }}
              className="w-full rounded-lg border border-sky-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 sm:w-auto"
            >
              <option value="">Tất cả trạng thái</option>
              {orderFilterOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto px-2 pt-2 sm:px-4">
            <table
              className="w-full table-fixed border-collapse font-inter text-sm font-normal"
              style={{ minWidth: totalWidth }}
            >
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
                  <ResizableTh align="center" onResizeStart={startResize(8)}>
                    Nguồn đơn
                  </ResizableTh>
                  <ResizableTh align="center" onResizeStart={startResize(9)}>
                    Trạng thái
                  </ResizableTh>
                  <ResizableTh align="center" showDivider={false}>Thao tác</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const stt = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => {
                        setDetailTab("overview");
                        setSelectedOrderId(order.id);
                      }}
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
                        <AdminBadge className={[orderSourceTone(order.source), "max-w-full truncate"].join(" ")}>
                          {formatOrderSourceLabel(order.source)}
                        </AdminBadge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <AdminBadge className={[statusTone(order.status), "max-w-full truncate"].join(" ")}>
                          {formatOrderStatusLabel(order.status)}
                        </AdminBadge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTab("overview");
                            setSelectedOrderId(order.id);
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Xem
                        </button>
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

        <div
          className={`fixed inset-0 z-40 transition-[visibility] duration-300 ${
            selectedOrderId ? "visible" : "invisible"
          }`}
        >
          <button
            type="button"
            aria-label="Đóng chi tiết đơn hàng"
            onClick={() => setSelectedOrderId(undefined)}
            className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${
              selectedOrderId ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết đơn hàng"
            className={`absolute inset-y-0 right-0 w-full max-w-5xl transform bg-slate-50 font-inter antialiased transition-transform duration-300 ease-out ${
              selectedOrderId ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {selectedOrderId ? (
              <AdminPanel className="flex h-full flex-col overflow-hidden !rounded-none border-y-0 border-r-0 !shadow-none">
            <AdminPanelHeader
              title={orderDetail?.orderCode || "Chi tiết đơn hàng"}
              subtitle={orderDetail
                ? `${orderDetail.customerName || "Khách lẻ"} · Tạo ${formatAdminDateTime(orderDetail.created)}`
                : "Đang tải thông tin đơn hàng"}
              action={
                <>
                  {orderDetail ? (
                    <AdminBadge className={statusTone(orderDetail.status)}>
                      {formatOrderStatusLabel(orderDetail.status)}
                    </AdminBadge>
                  ) : null}
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setSelectedOrderId(undefined)}
                    aria-label="Đóng chi tiết đơn hàng"
                    className="rounded-lg p-2 text-black transition hover:bg-emerald-50"
                  >
                    <Icon icon="mdi:close" width={22} />
                  </button>
                </>
              }
            />

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 pb-6 pt-5 text-black sm:px-6">
            {orderDetailQuery.isLoading ? (
              <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
            ) : orderDetail ? (
              <div className="space-y-5">
                <div
                  role="tablist"
                  aria-label="Các phần chi tiết đơn hàng"
                  className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-slate-50 py-1"
                >
                  {([
                    ["overview", "Tổng quan"],
                    ["details", "Thông tin & sản phẩm"],
                    ["status", "Trạng thái"],
                    ...(shippingStatuses.has(orderDetail.status) ? [["shipping", "Vận chuyển"]] : []),
                  ] as Array<[OrderDetailTab, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={detailTab === value}
                      onClick={() => {
                        setDetailTab(value);
                        setFormError(null);
                        if (value === "status") {
                          setDraftStatus(availableStatusTransitions[0] ?? orderDetail.status);
                        }
                      }}
                      className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold transition ${
                        detailTab === value
                          ? "border-emerald-500 bg-emerald-500 text-black"
                          : "border-slate-200 bg-white text-black hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {detailTab === "overview" ? (
                <>
                <section className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50">
                  <div className="flex flex-wrap items-start justify-between gap-4 bg-emerald-50 px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black">Thông tin đơn hàng</p>
                      <p className="mt-1 truncate text-xl font-bold text-black">{orderDetail.orderCode || orderDetail.id}</p>
                      <p className="mt-1 text-sm text-black">{orderDetail.customerName || "Khách lẻ"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminBadge className="border border-emerald-200 bg-emerald-100 text-black">
                        {formatOrderSourceLabel(orderDetail.source)}
                      </AdminBadge>
                      {orderDetail.quoteRequestId ? <AdminBadge className="border border-emerald-200 bg-emerald-100 text-black">Đơn từ báo giá</AdminBadge> : null}
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryValue label="Tổng tiền" value={formatPrice(orderDetail.total)} topBorderClass="border-t-emerald-500" />
                  <SummaryValue label="Tạm tính" value={formatPrice(orderDetail.subtotal)} topBorderClass="border-t-sky-500" />
                  <SummaryValue label="Phí vận chuyển" value={formatPrice(orderDetail.shippingFee)} topBorderClass="border-t-amber-500" />
                  <SummaryValue label="Thanh toán" value={formatPaymentStatusLabel(orderDetail.paymentStatus)} topBorderClass="border-t-violet-500" />
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <div className="border-b border-slate-100 pb-3">
                      <p className="text-sm font-semibold text-black">Thông tin nhận hàng</p>
                      <p className="mt-1 text-base font-semibold text-black">{orderDetail.receiverName || "Chưa cập nhật"}</p>
                    </div>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-black">Số điện thoại</dt>
                        <dd className="mt-1 font-medium text-black">{orderDetail.receiverPhone || "Chưa cập nhật"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-black">Email</dt>
                        <dd className="mt-1 break-all font-medium text-black">{orderDetail.customerEmail || "Chưa cập nhật"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-black">Địa chỉ giao hàng</dt>
                        <dd className="mt-1 leading-6 text-black">{orderDetail.addressLine || "Chưa cập nhật"}</dd>
                      </div>
                      {orderDetail.note ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-black">Ghi chú</dt>
                          <dd className="mt-1 rounded-lg bg-slate-100 px-3 py-2 leading-6 text-black">{orderDetail.note}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold text-black">Thanh toán</p>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
                      <span className="text-sm text-black">Trạng thái hiện tại</span>
                      <AdminBadge className={statusTone(orderDetail.paymentStatus, "payment")}>
                        {formatPaymentStatusLabel(orderDetail.paymentStatus)}
                      </AdminBadge>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-black">Cập nhật lần cuối {formatAdminDateTime(orderDetail.updated)}</p>
                    <div className="mt-4">
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
                      className="w-full justify-center !border-emerald-500 px-3 py-2 text-xs !text-black hover:!bg-emerald-50"
                    >
                      {orderDetail.paymentStatus === "Paid"
                        ? "Chuyển sang Chờ thanh toán"
                        : "Đánh dấu Đã thanh toán"}
                    </AdminSecondaryButton>
                  </div>
                  </section>
                </div>
                </>
                ) : null}

                {detailTab === "details" ? (
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-black">
                    Chỉnh sửa thông tin và sản phẩm
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input value={editReceiverName} onChange={(e) => setEditReceiverName(e.target.value)} placeholder="Tên khách hàng *" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input type="email" value={editCustomerEmail} onChange={(e) => setEditCustomerEmail(e.target.value)} placeholder="Email khách hàng" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input value={editReceiverPhone} onChange={(e) => setEditReceiverPhone(e.target.value)} placeholder="Số điện thoại" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input type="number" min={0} value={editShippingFee} onChange={(e) => setEditShippingFee(e.target.value)} placeholder="Phí vận chuyển" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input value={editAddressLine} onChange={(e) => setEditAddressLine(e.target.value)} placeholder="Địa chỉ giao hàng" className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                    <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Ghi chú đơn hàng" rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-black">Cỡ áo và số lượng</p>
                      <button type="button" onClick={() => setEditItems((items) => [...items, { productName: "Áo custom", variantSize: "", variantColor: "", material: "", quantity: 1, unitPrice: 0 }])} className="rounded border border-emerald-400 bg-emerald-50 px-2 py-1 text-xs font-semibold text-black">+ Thêm dòng</button>
                    </div>
                    <div className="overflow-x-auto pb-1">
                      <table className="w-full min-w-[720px] border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-slate-600">
                            <th className="px-1 py-2 font-medium">Sản phẩm</th>
                            <th className="w-20 px-1 py-2 text-center font-medium">Size</th>
                            <th className="w-24 px-1 py-2 text-center font-medium">Màu</th>
                            <th className="w-28 px-1 py-2 text-center font-medium">Chất liệu</th>
                            <th className="w-20 px-1 py-2 text-center font-medium">SL</th>
                            <th className="w-28 px-1 py-2 text-right font-medium">Đơn giá</th>
                            <th className="w-8" aria-label="Thao tác" />
                          </tr>
                        </thead>
                        <tbody>
                        {editItems.map((item, index) => (
                          <tr key={index} className="border-b border-slate-100 last:border-0">
                            <td className="px-1 py-2"><input value={item.productName} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, productName: e.target.value } : row))} placeholder="Sản phẩm" className="w-full rounded border px-2 py-1.5 text-xs" /></td>
                            <td className="px-1 py-2"><input value={item.variantSize ?? ""} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, variantSize: e.target.value } : row))} placeholder="Size" className="w-full rounded border px-2 py-1.5 text-center text-xs" /></td>
                            <td className="px-1 py-2"><input value={item.variantColor ?? ""} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, variantColor: e.target.value } : row))} placeholder="Màu sắc" maxLength={50} className="w-full rounded border px-2 py-1.5 text-center text-xs" /></td>
                            <td className="px-1 py-2"><input value={item.material ?? ""} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, material: e.target.value } : row))} placeholder="Chất liệu" maxLength={100} className="w-full rounded border px-2 py-1.5 text-center text-xs" /></td>
                            <td className="px-1 py-2"><input type="number" min={1} value={item.quantity} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, quantity: Math.max(1, Number(e.target.value) || 1) } : row))} placeholder="SL" className="w-full rounded border px-2 py-1.5 text-center text-xs" /></td>
                            <td className="px-1 py-2"><input type="number" min={0} value={item.unitPrice} onChange={(e) => setEditItems((items) => items.map((row, i) => i === index ? { ...row, unitPrice: Math.max(0, Number(e.target.value) || 0) } : row))} placeholder="Đơn giá" className="w-full rounded border px-2 py-1.5 text-right text-xs" /></td>
                            <td className="px-1 py-2 text-center"><button type="button" aria-label={`Xóa ${item.productName || "dòng sản phẩm"}`} disabled={editItems.length === 1} onClick={() => setEditItems((items) => items.filter((_, i) => i !== index))} className="text-black disabled:opacity-30"><Icon icon="mdi:trash-can-outline" width={17} /></button></td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <AdminPrimaryButton type="button" disabled={updateDetailsMutation.isPending} onClick={() => void handleUpdateDetails()} className="mt-4 w-full !bg-emerald-500 !bg-none !text-black !shadow-none hover:!bg-emerald-600">
                    {updateDetailsMutation.isPending ? "Đang lưu..." : "Lưu chi tiết đơn hàng"}
                  </AdminPrimaryButton>
                </section>
                ) : null}

                {detailTab === "details" ? (
                <>
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-black">Quản lý tệp đơn hàng</p>
                      <p className="mt-1 text-xs text-slate-600">Mẫu thiết kế, bảng chia size và tài liệu sản xuất.</p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-black">
                      {(orderDetail.customFiles ?? []).length} tệp
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(orderDetail.customFiles ?? []).length ? (orderDetail.customFiles ?? []).map((file) => (
                      <div key={file.fileName} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <span className="min-w-12 rounded border border-emerald-200 bg-white px-2 py-1 text-center text-[10px] font-bold uppercase text-black">
                          {file.originalName.split(".").pop() || "FILE"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-black" title={file.originalName}>{file.originalName}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{formatOrderFileSize(file.sizeBytes)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPreviewOrderFile(file.contentType) ? (
                            <button type="button" onClick={() => void adminService.previewOrderFile(orderDetail.id, file.fileName)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:border-emerald-400 hover:bg-emerald-50">
                              Xem
                            </button>
                          ) : null}
                          <button type="button" onClick={() => void adminService.downloadOrderFile(orderDetail.id, file.fileName, file.originalName)} className="rounded-md border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-100">
                            Tải xuống
                          </button>
                          <button type="button" disabled={deleteOrderFileMutation.isPending} onClick={() => void handleDeleteOrderFile(file.fileName, file.originalName)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 disabled:opacity-50">
                            Xóa
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-600">
                        Chưa có tệp nào trong đơn hàng.
                      </div>
                    )}
                  </div>

                  <label className={`mt-4 block cursor-pointer rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-5 py-5 text-center transition hover:bg-emerald-50 ${uploadOrderFilesMutation.isPending ? "pointer-events-none opacity-60" : ""}`}>
                    <span className="block text-sm font-semibold text-black">
                      {uploadOrderFilesMutation.isPending ? "Đang tải tệp lên..." : "Chọn tệp để tải lên"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">Tối đa 5 tệp mỗi lần, mỗi tệp không quá 10MB</span>
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.xlsx,.xls,.docx,.doc"
                      className="sr-only"
                      disabled={uploadOrderFilesMutation.isPending}
                      onChange={(event) => {
                        void handleUploadOrderFiles(Array.from(event.target.files ?? []));
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <p className="mt-2 text-center text-[11px] text-slate-500">PNG, JPG, SVG, PDF, AI, Excel và Word</p>
                </section>

                {orderDetail.rfqDetails ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-sm font-semibold text-black">
                      Thông số kỹ thuật RFQ · {orderDetail.rfqDetails.quoteCode}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Chất liệu" value={orderDetail.rfqDetails.material || "--"} />
                      <InfoCard label="Màu sắc" value={orderDetail.rfqDetails.colorSelection || "--"} />
                      <InfoCard
                        label="Kỹ thuật in"
                        value={formatPrintTechnique(orderDetail.rfqDetails.printTechnique as PrintTechnique)}
                      />
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold text-black">Chia cỡ</p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-sm text-black">
                          {Object.entries(orderDetail.rfqDetails.sizeBreakdown ?? {}).map(([size, quantity]) => (
                            <span key={size} className="rounded bg-slate-100 px-2 py-0.5">
                              {size}: {quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {orderDetail.rfqDetails.logoFiles.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {orderDetail.rfqDetails.logoFiles.map((file) => (
                          <button
                            key={file.fileName}
                            type="button"
                            onClick={() =>
                              void quoteRequestService.downloadLogo(
                                orderDetail.quoteRequestId!,
                                file.fileName,
                                file.originalName
                              )
                            }
                            className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-100"
                          >
                            {file.originalName}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                </>
                ) : null}

                {detailTab === "shipping" && shippingStatuses.has(orderDetail.status) ? (
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-black">Vận chuyển</p>
                  <div className="mt-3 grid gap-3 text-sm text-black sm:grid-cols-2">
                    <InfoCard label="Đơn vị" value={orderDetail.shipping?.carrierName || "Chưa cập nhật"} />
                    <InfoCard label="Mã vận đơn" value={orderDetail.shipping?.trackingNumber || "Chưa cập nhật"} />
                    <InfoCard label="Vị trí" value={orderDetail.shipping?.currentLocation || "Chưa cập nhật"} />
                    <InfoCard label="Dự kiến" value={formatAdminDateTime(orderDetail.shipping?.estimatedDelivery)} />
                  </div>
                  <div className="mt-5 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">Mã vận đơn</span>
                      <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500" placeholder="VD: GHN123456789" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black">Đơn vị vận chuyển</span>
                        <input value={carrierName} onChange={(event) => setCarrierName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500" placeholder="GHN, GHTK, Viettel Post..." />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-black">Dự kiến giao</span>
                        <input type="datetime-local" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">Vị trí hiện tại</span>
                      <input value={currentLocation} onChange={(event) => setCurrentLocation(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500" placeholder="Kho Hồ Chí Minh, đang giao tại Quận 1..." />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-black">Ghi chú vận chuyển</span>
                      <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500" placeholder="Thông tin sẽ hiển thị trong lịch trình đơn hàng của khách hàng" />
                    </label>
                  </div>
                  {formError ? <div className="mt-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-black">{formError}</div> : null}
                  <AdminPrimaryButton type="button" onClick={() => void handleUpdateStatus(orderDetail.status)} disabled={updateStatusMutation.isPending} className="mt-4 w-full !bg-emerald-500 !bg-none !text-black !shadow-none hover:!bg-emerald-600">
                    {updateStatusMutation.isPending ? "Đang lưu..." : "Lưu thông tin vận chuyển"}
                  </AdminPrimaryButton>
                </div>
                ) : null}

                {detailTab === "status" ? (
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-black">Chuyển trạng thái</p>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-slate-50 p-4 text-center">
                    <div>
                      <p className="text-[11px] text-black">Hiện tại</p>
                      <p className="mt-1 text-sm font-semibold text-black">{formatOrderStatusLabel(orderDetail.status)}</p>
                    </div>
                    <span className="text-black">→</span>
                    <div>
                      <p className="text-[11px] text-black">Tiếp theo</p>
                      <p className="mt-1 text-sm font-semibold text-black">
                        {availableStatusTransitions.length ? formatOrderStatusLabel(draftStatus) : "Đã kết thúc"}
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-black">Chọn trạng thái tiếp theo</span>
                    <select
                      value={draftStatus}
                      disabled={!availableStatusTransitions.length}
                      onChange={(event) => {
                        setDraftStatus(event.target.value as AdminUpdateOrderStatusDto["status"]);
                        setFormError(null);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-emerald-500"
                    >
                      {availableStatusTransitions.map((item) => (
                          <option key={item} value={item}>
                            {formatOrderStatusLabel(item)}
                          </option>
                        ))}
                    </select>
                  </label>

                  {formError ? (
                    <div className="mt-4 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-black">
                      {formError}
                    </div>
                  ) : null}

                  <AdminPrimaryButton
                    type="button"
                    onClick={() => void handleUpdateStatus()}
                    disabled={updateStatusMutation.isPending || !availableStatusTransitions.length}
                    className="mt-4 w-full !bg-emerald-500 !bg-none !text-black !shadow-none hover:!bg-emerald-600"
                  >
                    {updateStatusMutation.isPending ? "Đang cập nhật..." : "Lưu trạng thái"}
                  </AdminPrimaryButton>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-black">Lịch sử xử lý</p>
                  <div className="mt-4 space-y-4">
                    {(orderDetail.statusHistory ?? []).length ? [...orderDetail.statusHistory].reverse().map((entry, index) => (
                      <div key={`${entry.status}-${entry.created}-${index}`} className="relative border-l-2 border-emerald-200 pl-4">
                        <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-black">{entry.title || formatOrderStatusLabel(entry.status)}</p>
                          <time className="text-[11px] text-black">{formatAdminDateTime(entry.created)}</time>
                        </div>
                        {entry.description || entry.note ? <p className="mt-1 text-xs leading-5 text-black">{entry.description || entry.note}</p> : null}
                      </div>
                    )) : <p className="text-sm text-black">Chưa có lịch sử cập nhật.</p>}
                  </div>
                </section>
                </div>
                ) : null}

                {detailTab === "overview" || detailTab === "details" ? (
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-black">Sản phẩm trong đơn</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[620px] table-fixed border-collapse font-inter text-xs font-normal">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-black">
                          <th className="w-36 whitespace-nowrap py-2 pr-2 font-medium">Sản phẩm</th>
                          <th className="w-24 whitespace-nowrap px-2 py-2 font-medium">Mã SP</th>
                          <th className="w-16 whitespace-nowrap px-2 py-2 text-center font-medium">Cỡ</th>
                          <th className="w-16 whitespace-nowrap px-2 py-2 text-center font-medium">Màu</th>
                          <th className="w-24 whitespace-nowrap px-2 py-2 text-center font-medium">Chất liệu</th>
                          <th className="w-12 whitespace-nowrap px-2 py-2 text-center font-medium">SL</th>
                          <th className="w-24 whitespace-nowrap py-2 pl-2 text-right font-medium">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(orderDetail.items ?? []).map((item, index) => (
                          <tr key={`${item.productId}-${index}`} className="border-b border-slate-100 last:border-b-0">
                            <td className="truncate whitespace-nowrap py-2.5 pr-2 font-medium text-black" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 font-normal text-black" title={item.variantSku || "--"}>
                              {item.variantSku || "--"}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 text-center font-normal text-black">
                              {item.variantSize || "-"}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 text-center font-normal text-black">
                              {item.variantColor || "-"}
                            </td>
                            <td className="truncate whitespace-nowrap px-2 py-2.5 text-center font-normal text-black" title={item.material || "-"}>
                              {item.material || "-"}
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5 text-center font-normal text-black">
                              {item.quantity}
                            </td>
                            <td className="truncate whitespace-nowrap py-2.5 pl-2 text-right font-medium text-black">
                              {formatPrice(item.total ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                ) : null}
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
            ) : null}
          </aside>
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

            <div className="grid gap-3 sm:grid-cols-2">
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
                <label className="mb-1 block text-xs font-semibold text-slate-700">Email khách hàng *</label>
                <input
                  type="email"
                  value={manualCustomerEmail}
                  onChange={(e) => setManualCustomerEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Số điện thoại</label>
                <input
                  value={manualReceiverPhone}
                  onChange={(e) => setManualReceiverPhone(e.target.value)}
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
                  <option value="ManualMessenger">Messenger / Nhập tay</option>
                  <option value="Storefront">Storefront</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Địa chỉ giao hàng</label>
              <input
                value={manualAddressLine}
                onChange={(e) => setManualAddressLine(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Ảnh mẫu và file chia size</label>
              <input
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.xlsx,.xls,.docx,.doc"
                onChange={(event) => setManualFiles(Array.from(event.target.files ?? []))}
                className="block w-full rounded-lg border border-dashed border-blue-200 bg-blue-50/40 px-3 py-3 text-xs text-slate-600"
              />
              {manualFiles.length > 0 ? <p className="mt-1 text-xs text-slate-500">Đã chọn {manualFiles.length} file</p> : null}
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
                      { productName: "", variantSize: "", variantColor: "", material: "", quantity: 10, unitPrice: 120000 },
                    ])
                  }
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  + Thêm dòng
                </button>
              </div>
              <div className="overflow-x-auto pb-1">
                <div className="min-w-[560px] space-y-2">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1.4fr_65px_90px_110px_70px_100px_auto] gap-2 items-center">
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
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-center"
                      />
                      <input
                        value={item.variantColor ?? ""}
                        onChange={(e) =>
                          setManualItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, variantColor: e.target.value } : row))
                          )
                        }
                        placeholder="Màu sắc"
                        maxLength={50}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-center"
                      />
                      <input
                        value={item.material ?? ""}
                        onChange={(e) =>
                          setManualItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, material: e.target.value } : row))
                          )
                        }
                        placeholder="Chất liệu"
                        maxLength={100}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-center"
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
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-center"
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
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-right"
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
              </div>
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
      <p className="text-[11px] font-semibold text-black">{label}</p>
      <p className="mt-2 truncate text-base font-semibold text-black" title={value}>{value}</p>
    </div>
  );
}

function formatOrderFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreviewOrderFile(contentType: string) {
  return contentType.startsWith("image/") || contentType === "application/pdf";
}

function SummaryValue({
  label,
  value,
  topBorderClass,
}: {
  label: string;
  value: string;
  topBorderClass: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-slate-200 border-t-4 bg-white px-5 py-4 ${topBorderClass}`}>
      <p className="text-[11px] font-semibold text-black">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-black" title={value}>
        {value}
      </p>
    </div>
  );
}
