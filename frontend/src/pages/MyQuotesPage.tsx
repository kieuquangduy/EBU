import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { QuoteStatus } from "../@types/quoteRequest.type";
import QuoteRequestModal from "../components/quote/QuoteRequestModal";
import { useToast } from "../context/toastContext";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { useProductBySlug } from "../hooks/useProduct";
import { useMyQuotes } from "../hooks/useQuoteRequests";
import { useShopContact } from "../hooks/useShopContact";
import { openZaloProductConsult, resolveProductPricing } from "../lib/productRfq";
import {
  QUOTE_STATUS_META,
  formatPrintTechnique,
  formatQuoteStatus,
} from "../lib/quoteStatus";
import { ROUTES, routeTo } from "../lib/routes";
import { formatPrice } from "../utils/formatPrice";

const PAGE_SIZE = 10;

const STATUS_TABS: ReadonlyArray<{ value: QuoteStatus | ""; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "Pending", label: "Chờ xử lý" },
  { value: "Contacted", label: "Đã liên hệ" },
  { value: "Quoted", label: "Đã báo giá" },
  { value: "Accepted", label: "Đã chốt" },
  { value: "InProduction", label: "Đang sản xuất" },
  { value: "Completed", label: "Hoàn tất" },
  { value: "Cancelled", label: "Đã hủy" },
];

export default function MyQuotesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productSlug = searchParams.get("product") ?? undefined;
  const { isAuthenticated } = useAuth();
  const { product, isLoading: loadingProduct } = useProductBySlug(productSlug);
  const { data: contact } = useShopContact();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const quotesQuery = useMyQuotes({
    status: statusFilter,
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
    <section className="min-h-[75vh] bg-[#fafafa] py-10 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                Request For Quotation
              </p>
              <h1 className="mt-1.5 font-titleFont text-2xl sm:text-3xl font-bold text-primeColor">
                Yêu cầu báo giá &amp; Thiết kế áo Custom
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-lightText leading-relaxed">
                Gửi yêu cầu để nhận mockup logo miễn phí và báo giá tận xưởng theo chất liệu, số lượng và kỹ thuật in/thêu.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af]"
              >
                <Icon icon="lucide:clipboard-list" width={18} />
                Tạo yêu cầu báo giá
              </button>
              <button
                type="button"
                onClick={handleOpenZalo}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0068ff] bg-white px-4 py-3 text-sm font-semibold text-[#0068ff] transition hover:bg-blue-50"
              >
                Tư vấn qua Zalo
              </button>
            </div>
          </div>

          {productSlug && (
            <div className="mt-6 rounded-xl border border-blue-100 bg-[#eff6ff] p-4">
              {loadingProduct ? (
                <div className="h-16 animate-pulse rounded bg-blue-100/70" />
              ) : product ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg object-cover border border-white shadow-sm"
                      />
                    )}
                    <div>
                      <p className="text-xs text-lightText">Mẫu áo đang chọn</p>
                      <p className="font-semibold text-primeColor">{product.name}</p>
                      <p className="text-sm font-bold text-[#1d4ed8]">
                        Giá từ {formatPrice(resolveProductPricing(product).basePrice)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={routeTo.product(product.slug)}
                    className="text-xs font-semibold text-[#1d4ed8] hover:underline"
                  >
                    Xem lại sản phẩm →
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {!isAuthenticated ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Icon icon="lucide:lock" width={34} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-lg font-semibold text-primeColor">
              Đăng nhập để theo dõi lịch sử báo giá
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-lightText">
              Bạn vẫn có thể nhấn &ldquo;Tạo yêu cầu báo giá&rdquo; ở trên không cần tài khoản, hoặc đăng nhập để xem báo giá chính thức và tiến độ sản xuất.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to={ROUTES.SIGN_IN}
                className="rounded-lg bg-primeColor px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.SHOP}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-primeColor hover:bg-gray-50"
              >
                Khám phá mẫu áo
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value || "all"}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === tab.value
                        ? "bg-[#1d4ed8] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                  placeholder="Tìm mã RFQ hoặc mẫu áo..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1d4ed8]"
                />
              </div>
            </div>

            {quotesQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <Icon icon="lucide:file-text" width={36} className="mx-auto text-slate-300" />
                <p className="mt-3 font-semibold text-primeColor">Chưa có yêu cầu báo giá nào</p>
                <p className="mt-1 text-sm text-lightText">
                  Hãy chọn một mẫu áo trong cửa hàng hoặc gửi yêu cầu custom mới ngay.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-4 rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
                >
                  Gửi yêu cầu đầu tiên
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const meta = QUOTE_STATUS_META[item.status];
                  return (
                    <Link
                      key={item.id}
                      to={routeTo.quote(item.id)}
                      className="flex flex-col gap-3 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productName ?? item.quoteCode}
                            className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-slate-100 text-slate-400">
                            <Icon icon="lucide:shirt" width={24} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-[#1d4ed8]">
                              {item.quoteCode}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                            >
                              {formatQuoteStatus(item.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-primeColor">
                            {item.productName ?? "Đặt may / in áo custom theo yêu cầu"}
                          </p>
                          <p className="mt-0.5 text-xs text-lightText">
                            Số lượng: <strong>{item.quantity}</strong> · Kỹ thuật:{" "}
                            {formatPrintTechnique(item.printTechnique)}
                            {item.material ? ` · ${item.material}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:text-right">
                        <div>
                          {item.quotedPrice != null ? (
                            <p className="text-sm font-bold text-emerald-700">
                              Báo giá: {formatPrice(item.quotedPrice)}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-slate-500">Đang chờ báo giá</p>
                          )}
                          <p className="text-xs text-slate-400">
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5 text-sm">
                <span className="text-slate-500">
                  Trang {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
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
