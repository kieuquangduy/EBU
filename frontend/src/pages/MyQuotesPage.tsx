import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QuoteRequestModal from "../components/quote/QuoteRequestModal";
import { useToast } from "../context/toastContext";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { useProductBySlug } from "../hooks/useProduct";
import { useMyQuotes } from "../hooks/useQuoteRequests";
import { useShopContact } from "../hooks/useShopContact";
import { openZaloProductConsult, resolveProductPricing } from "../lib/productRfq";
import ZaloIcon from "../components/common/ZaloIcon";
import {
  USER_STATUS_TABS,
  type UserStatusGroup,
  formatPrintTechnique,
  getUserStatusBadge,
} from "../lib/quoteStatus";
import { ROUTES, routeTo } from "../lib/routes";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { formatPrice } from "../utils/formatPrice";

const PAGE_SIZE = 10;

export default function MyQuotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productSlug = searchParams.get("product") ?? undefined;
  const { isAuthenticated } = useAuth();
  const { product, isLoading: loadingProduct } = useProductBySlug(productSlug);
  const { data: contact } = useShopContact();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [statusGroupFilter, setStatusGroupFilter] = useState<UserStatusGroup>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const quotesQuery = useMyQuotes({
    statusGroup: statusGroupFilter,
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    if (productSlug && product) {
      setModalOpen(true);
    }
  }, [productSlug, product]);

  const handleOpenZalo = async () => {
    const productName = product?.name ?? "Đặt áo custom HauShop";
    const productUrl = product
      ? `${window.location.origin}${routeTo.product(product.slug)}`
      : window.location.href;
    const result = await openZaloProductConsult({
      zaloPhone: contact?.zaloPhone,
      productName,
      productUrl,
    });

    if (!result.opened) {
      showToast("Số Zalo đang cập nhật, bạn có thể chat trực tiếp với shop bên góc phải.", "info");
      return;
    }

    if (result.copied) {
      showToast("Đã sao chép thông tin mẫu áo — đang mở Zalo", "info");
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (productSlug) {
      const next = new URLSearchParams(searchParams);
      next.delete("product");
      setSearchParams(next, { replace: true });
    }
  };

  const items = quotesQuery.data?.items ?? [];
  const totalPages = Math.max(1, quotesQuery.data?.totalPages ?? 1);

  return (
    <section className="min-h-[75vh] bg-[#fbfbfb] py-8 sm:py-10 px-4 sm:px-6 lg:px-10 font-titleFont">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Banner */}
        <div className="rounded-md border border-gray-200 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primeColor">
                Yêu cầu báo giá của bạn
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-lightText leading-relaxed">
                Theo dõi tiến độ phản hồi giá và sản xuất áo custom từ xưởng may HauShop.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={ROUTES.SHOP}
                className="inline-flex items-center gap-2 rounded-md bg-primeColor px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-black"
              >
                <Icon icon="lucide:store" width={16} />
                Khám phá mẫu áo
              </Link>
              <button
                type="button"
                onClick={handleOpenZalo}
                className="inline-flex items-center gap-2 rounded-md bg-[#0068ff] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#0057d9]"
              >
                <ZaloIcon size={18} />
                Tư vấn qua Zalo
              </button>
            </div>
          </div>

          {/* Trường hợp người dùng click "Nhận báo giá" từ trang sản phẩm cụ thể */}
          {productSlug && (
            <div className="mt-5 rounded-md border border-gray-200 bg-gray-50/70 p-4">
              {loadingProduct ? (
                <div className="h-14 animate-pulse rounded bg-gray-200/70" />
              ) : product ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-14 w-14 rounded-md object-cover border border-gray-200 shadow-xs"
                      />
                    )}
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        Mẫu áo đang chọn
                      </p>
                      <p className="font-semibold text-primeColor text-sm">{product.name}</p>
                      <p className="text-xs font-bold text-red-500">
                        Giá tham khảo từ {formatPrice(resolveProductPricing(product).basePrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="rounded-md bg-primeColor px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition"
                    >
                      Gửi báo giá mẫu này
                    </button>
                    <Link
                      to={routeTo.product(product.slug)}
                      className="text-xs font-medium text-slate-600 hover:text-primeColor hover:underline"
                    >
                      Xem chi tiết áo →
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!FEATURE_FLAGS.ENABLE_QUOTE_TRACKING ? (
          <div className="rounded-md border border-gray-200 bg-white p-8 text-center shadow-xs">
            <Icon icon="lucide:clock" width={36} className="mx-auto text-amber-500" />
            <h2 className="mt-3 text-base sm:text-lg font-bold text-primeColor">
              Tính năng theo dõi tiến độ báo giá trực tuyến
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-lightText leading-relaxed">
              Hệ thống hiện tại tiếp nhận yêu cầu báo giá của bạn qua biểu mẫu và tư vấn viên xưởng sẽ chủ động liên hệ lại trực tiếp qua Số điện thoại / Email. Tính năng tra cứu tiến độ và cập nhật trạng thái đơn trực tuyến đang được bổ sung trong đợt nâng cấp tiếp theo (Round 2).
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to={ROUTES.SHOP}
                className="rounded-md bg-primeColor px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-black transition"
              >
                Khám phá mẫu áo khác
              </Link>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-md border border-gray-200 bg-white p-8 text-center shadow-xs">
            <Icon icon="lucide:lock" width={32} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-base sm:text-lg font-bold text-primeColor">
              Đăng nhập để theo dõi lịch sử báo giá
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm text-lightText">
              Đăng nhập tài khoản để xem mức giá chính thức xưởng đã gửi và cập nhật tiến độ sản xuất đơn hàng.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to={ROUTES.SIGN_IN}
                className="rounded-md bg-primeColor px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-black transition"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.SHOP}
                className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-primeColor hover:bg-gray-50 transition"
              >
                Khám phá mẫu áo
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-gray-200 bg-white shadow-xs">
            {/* Filter Tabs & Search */}
            <div className="flex flex-col gap-3.5 border-b border-gray-200 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between bg-white">
              <div className="flex flex-wrap gap-1.5">
                {USER_STATUS_TABS.map((tab) => {
                  const active = statusGroupFilter === tab.value;
                  return (
                    <button
                      key={tab.value || "all"}
                      type="button"
                      onClick={() => {
                        setStatusGroupFilter(tab.value);
                        setPage(1);
                      }}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-primeColor text-white shadow-xs"
                          : "bg-gray-100 text-slate-600 hover:bg-gray-200 hover:text-primeColor"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Icon
                  icon="mdi:magnify"
                  width={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm mã báo giá, mẫu áo..."
                  className="w-full rounded-md border border-gray-300 py-1.5 pl-9 pr-3 text-xs sm:text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
                />
              </div>
            </div>

            {/* List Content */}
            {quotesQuery.isLoading ? (
              <div className="space-y-3 p-5 sm:p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-md bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <Icon icon="mdi:file-document-outline" width={40} className="mx-auto text-slate-300" />
                <p className="mt-3 font-bold text-primeColor text-sm sm:text-base">
                  Chưa có yêu cầu báo giá nào
                </p>
                <p className="mt-1 text-xs sm:text-sm text-lightText max-w-sm mx-auto">
                  Hãy chọn một mẫu áo bạn ưng ý trong cửa hàng để gửi yêu cầu báo giá và nhận bản mockup 2D miễn phí.
                </p>
                <div className="mt-5">
                  <Link
                    to={ROUTES.SHOP}
                    className="inline-flex items-center gap-2 rounded-md bg-primeColor px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-black transition"
                  >
                    <Icon icon="lucide:store" width={16} />
                    Xem danh mục sản phẩm
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const badge = getUserStatusBadge(item.status);
                  return (
                    <Link
                      key={item.id}
                      to={routeTo.quote(item.id)}
                      className="flex flex-col gap-3 p-4 sm:p-5 transition hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productName ?? item.quoteCode}
                            className="h-14 w-14 shrink-0 rounded-md border border-gray-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-100 text-slate-400">
                            <Icon icon="lucide:shirt" width={22} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs sm:text-sm font-bold text-primeColor">
                              {item.quoteCode}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-primeColor">
                            {item.productName ?? "Đặt may áo custom theo yêu cầu"}
                          </p>
                          <p className="mt-0.5 text-[11px] sm:text-xs text-lightText">
                            Số lượng: <strong>{item.quantity} áo</strong>
                            {item.quotedPrice != null && item.printTechnique ? (
                              <> · Kỹ thuật: {formatPrintTechnique(item.printTechnique)}</>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:text-right border-t border-gray-100 sm:border-t-0 pt-2 sm:pt-0">
                        <div>
                          {item.quotedPrice != null ? (
                            <p className="text-xs sm:text-sm font-bold text-red-500">
                              Giá báo: {formatPrice(item.quotedPrice)}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-slate-500">
                              Đang chờ xưởng tính giá
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <Icon icon="mdi:chevron-right" width={20} className="text-slate-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Trang {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <QuoteRequestModal
        open={modalOpen}
        onClose={handleCloseModal}
        product={product ?? null}
      />
    </section>
  );
}
