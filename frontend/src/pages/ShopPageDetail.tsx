import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import QuoteRequestModal from "../components/quote/QuoteRequestModal";
import { useProductBySlug } from "../hooks/useProduct";
import { useShopContact } from "../hooks/useShopContact";
import { useToast } from "../context/toastContext";
import { formatPrice } from "../utils/formatPrice";
import type { ProductVariantSummaryDto } from "../@types/product.type";
import { useAuth } from "../hooks/useAuth";
import {
  createReviewApi,
  getProductReviewsApi,
  type ReviewDto,
} from "../services/reviewService";
import { queryKeys } from "../lib/queryKeys";
import { logger } from "../lib/logger";
import { openZaloProductConsult, resolveProductPricing } from "../lib/productRfq";
import { ROUTES, routeTo } from "../lib/routes";

const RFQ_HIGHLIGHTS = [
  { icon: "lucide:shield-check", text: "Thiết kế miễn phí logo độc đáo, đẳng cấp" },
  { icon: "lucide:sparkles", text: "Chất liệu cao cấp, giá tận xưởng" },
  { icon: "lucide:palette", text: "Màu sắc đa dạng, nhiều lựa chọn màu sắc" },
  { icon: "lucide:truck", text: "Giao hàng toàn quốc miễn phí" },
] as const;

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { product, isLoading, isError, error } = useProductBySlug(slug);
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const { data: shopContact } = useShopContact();

  const [selectedVariant, setSelectedVariant] =
    useState<ProductVariantSummaryDto | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    if (!product) return;

    const activeVariants = product.variants.filter((v) => v.isActive);
    setSelectedVariant(activeVariants.length === 1 ? activeVariants[0] : null);
  }, [product]);

  useEffect(() => {
    if (searchParams.get("rfq") === "1" && product) {
      setQuoteModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("rfq");
      setSearchParams(next, { replace: true });
    }
  }, [product, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="max-w-container mx-auto px-10 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="aspect-square bg-gray-100 animate-skeleton rounded-sm" />
          <div className="space-y-5">
            <div className="h-8 bg-gray-100 rounded w-2/3 animate-skeleton" />
            <div className="h-5 bg-gray-100 rounded w-1/3 animate-skeleton" />
            <div className="h-10 bg-gray-100 rounded w-1/4 animate-skeleton" />
            <div className="h-24 bg-gray-100 rounded animate-skeleton" />
            <div className="h-12 bg-gray-100 rounded animate-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-bodyFont">
          {error ?? "Không tìm thấy sản phẩm"}
        </p>
        <button
          onClick={() => navigate(ROUTES.SHOP)}
          className="btn-outline px-8 py-3 text-sm"
        >
          ← Quay lại Shop
        </button>
      </div>
    );
  }

  const activeVariants = product.variants.filter((v) => v.isActive);
  const hasVariants = activeVariants.length > 0;
  const currentVariant = selectedVariant ?? activeVariants[0] ?? null;
  const { basePrice, originalPrice, discountPercent } = resolveProductPricing(
    product,
    selectedVariant?.price ?? null
  );
  const minOrderQty =
    product.minOrderQuantity && product.minOrderQuantity > 1 ? product.minOrderQuantity : 1;
  const priceNote =
    product.priceNote?.trim() ||
    "Giá sản phẩm có thể thay đổi theo chất liệu, số lượng và kỹ thuật in. Vui lòng liên hệ hoặc nhấn Nhận báo giá để được tư vấn và nhận giá chính thức.";

  const handleRequestQuote = () => {
    setQuoteModalOpen(true);
  };

  const handleZaloConsult = async () => {
    const productUrl = `${window.location.origin}${routeTo.product(product.slug)}`;
    const result = await openZaloProductConsult({
      zaloPhone: shopContact?.zaloPhone,
      productName: product.name,
      productUrl,
    });

    if (!result.opened) {
      showToast("Số Zalo đang cập nhật, bạn vui lòng Chat với shop để được tư vấn.", "info");
      navigate("?chat=support", { replace: true });
      return;
    }

    if (result.copied) {
      showToast("Đã sao chép tên sản phẩm — đang mở Zalo tư vấn", "info");
    }
  };

  const handleChatWithShop = () => {
    navigate(`?chat=support&productId=${encodeURIComponent(product.id)}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#f7f5f2] border-b border-gray-100 py-4 px-10">
        <nav className="max-w-container mx-auto flex items-center gap-2 text-sm text-lightText font-bodyFont">
          <Link to="/" className="hover:text-red-500 transition-colors">
            Home
          </Link>
          <span className="text-gray-300">/</span>
          <Link to={ROUTES.SHOP} className="hover:text-red-500 transition-colors">
            Shop
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-primeColor truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>
      </div>

      <div className="max-w-container mx-auto px-10 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="aspect-square bg-[#f7f5f2] flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                width="120"
                height="150"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="0.6"
              >
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
              </svg>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {product.brand && (
                <span className="text-[10px] tracking-[2px] uppercase font-semibold bg-primeColor text-white px-2.5 py-1 font-bodyFont">
                  {product.brand.name}
                </span>
              )}

              {product.categories.map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] tracking-[1.5px] uppercase text-lightText font-bodyFont"
                >
                  {c.name}
                </span>
              ))}
            </div>

            <h1 className="font-titleFont text-3xl font-bold leading-tight mb-2">
              {product.name}
            </h1>

            <p className="text-xs text-lightText font-bodyFont mb-4">
              SKU: {currentVariant?.sku ?? product.sku}
            </p>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.averageRating)
                        ? "text-warning"
                        : "text-gray-200"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <span className="text-sm text-lightText font-bodyFont">
                {product.reviewCount > 0
                  ? `${product.averageRating.toFixed(1)} (${product.reviewCount} đánh giá)`
                  : "(Chưa có đánh giá)"}
              </span>
              {minOrderQty > 1 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm font-medium text-[#1d4ed8] font-bodyFont">
                    Đặt tối thiểu {minOrderQty} áo
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <span className="text-base text-slate-600 font-bodyFont">Giá từ:</span>
              {originalPrice && (
                <span className="text-base text-lightText line-through font-bodyFont">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="font-titleFont text-3xl font-bold text-[#1d4ed8]">
                {formatPrice(basePrice)}
              </span>
              {discountPercent && (
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  -{discountPercent}%
                </span>
              )}
            </div>

            <div className="mb-5 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {RFQ_HIGHLIGHTS.map((item) => (
                <div key={item.text} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1d4ed8]">
                    <Icon icon={item.icon} width={16} />
                  </span>
                  <span className="font-bodyFont">{item.text}</span>
                </div>
              ))}
            </div>

            {(product.availableMaterials?.length || product.availablePrintTechniques?.length) ? (
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.availableMaterials && product.availableMaterials.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Chất liệu hỗ trợ
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.availableMaterials.map((material) => (
                        <span
                          key={material}
                          className="rounded-md bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-primeColor"
                        >
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.availablePrintTechniques && product.availablePrintTechniques.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Kỹ thuật in / thêu
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.availablePrintTechniques.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-primeColor"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {hasVariants && (
              <div className="mb-5">
                <p className="text-xs tracking-[1.5px] uppercase font-semibold mb-2.5 font-titleFont text-slate-600">
                  Mẫu / Phiên bản tham khảo
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-1.5 text-xs font-bodyFont border rounded-lg transition-all duration-200
                        ${
                          v.id === selectedVariant?.id ||
                          (activeVariants.length === 1 && v.id === currentVariant?.id)
                            ? "border-[#1d4ed8] text-[#1d4ed8] bg-blue-50 font-semibold"
                            : "border-gray-200 hover:border-primeColor text-slate-700"
                        }`}
                    >
                      {v.sku}
                      <span className="ml-1.5 text-[11px] text-lightText">
                        {formatPrice(v.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-[#eff6ff] px-4 py-3 text-sm leading-relaxed text-slate-700">
              <Icon icon="lucide:info" width={18} className="mt-0.5 shrink-0 text-[#1d4ed8]" />
              <p>
                <span className="font-semibold text-primeColor">Lưu ý: </span>
                {priceNote}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={handleRequestQuote}
                className="flex items-center justify-center gap-2 rounded-lg py-3.5 px-5
                  text-sm font-semibold font-bodyFont text-white
                  bg-[#1d4ed8] hover:bg-[#1e40af] transition-all duration-200 shadow-sm"
              >
                <Icon icon="lucide:clipboard-list" width={18} />
                Nhận báo giá
              </button>

              <button
                type="button"
                onClick={handleZaloConsult}
                className="flex items-center justify-center gap-2 rounded-lg py-3.5 px-5
                  text-sm font-semibold font-bodyFont text-[#1d4ed8]
                  border border-[#1d4ed8] bg-white hover:bg-blue-50 transition-all duration-200"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0068ff] text-[9px] font-bold text-white">
                  Zalo
                </span>
                Tư vấn qua Zalo
              </button>
            </div>

            <button
              type="button"
              onClick={handleChatWithShop}
              className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 px-5 text-sm font-semibold font-bodyFont text-primeColor transition hover:border-primeColor hover:bg-gray-50"
            >
              <Icon icon="mdi:chat-processing-outline" width={18} />
              Chat với admin / người bán
            </button>

            {product.description && (
              <div className="border-t border-gray-100 pt-6">
                <p className="text-xs tracking-[2px] uppercase font-semibold mb-3 font-titleFont">
                  Mô tả
                </p>
                <p className="text-sm text-lightText font-bodyFont leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 mt-6 pt-5 space-y-1.5">
              {product.brand && (
                <p className="text-xs font-bodyFont text-lightText">
                  Thương hiệu:{" "}
                  <span className="text-primeColor font-medium">{product.brand.name}</span>
                </p>
              )}

              {product.categories.length > 0 && (
                <p className="text-xs font-bodyFont text-lightText">
                  Danh mục:{" "}
                  <span className="text-primeColor font-medium">
                    {product.categories.map((c) => c.name).join(", ")}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        <ReviewSection
          productId={product.id}
          isAuthenticated={isAuthenticated}
          onRequireLogin={() => {
            showToast("Vui lòng đăng nhập để đánh giá sản phẩm", "warning");
            navigate(ROUTES.SIGN_IN);
          }}
        />
      </div>

      <QuoteRequestModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        product={product}
      />
    </div>
  );
}

function ReviewSection({
  productId,
  isAuthenticated,
  onRequireLogin,
}: {
  productId: string;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.product(productId, 1, 20),
    queryFn: () => getProductReviewsApi(productId, 1, 20),
    staleTime: 60 * 1000,
  });

  const reviews = reviewsQuery.data?.items ?? [];

  const reviewMutation = useMutation({
    mutationFn: createReviewApi,
    onSuccess: async () => {
      setRating(5);
      setContent("");
      showToast("Đã gửi đánh giá của bạn", "success");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.product(productId, 1, 20),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        productId,
        rating,
        content: content.trim() || undefined,
      });
    } catch (error: unknown) {
      logger.error("Create review failed", error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Không thể gửi đánh giá";
      showToast(message ?? "Không thể gửi đánh giá", "error");
    }
  };

  return (
    <section className="mt-14 border-t border-gray-100 pt-10">
      <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
        <div>
          <p className="text-xs tracking-[2px] uppercase font-semibold mb-3 font-titleFont">
            Đánh giá sản phẩm
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Số sao
              </label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`h-9 w-9 transition-colors ${
                        value <= rating ? "text-warning" : "text-gray-300"
                      }`}
                      aria-label={`${value} sao`}
                    >
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nội dung
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={2000}
                rows={5}
                className="w-full resize-none border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-red-400"
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
              />
              <p className="mt-1 text-xs text-gray-400">{content.length}/2000</p>
            </div>

            <button
              type="submit"
              disabled={reviewMutation.isPending}
              className="w-full bg-primeColor px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        </div>

        <div>
          {reviewsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse border border-gray-100 bg-gray-50" />
              ))}
            </div>
          ) : reviewsQuery.isError ? (
            <div className="border border-red-100 bg-red-50 px-5 py-8 text-center text-sm text-red-500">
              Không thể tải đánh giá.
            </div>
          ) : reviews.length === 0 ? (
            <div className="border border-gray-100 bg-gray-50 px-5 py-8 text-center text-sm text-gray-500">
              Chưa có đánh giá nào cho sản phẩm này.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: ReviewDto) => (
                <article key={review.id} className="border border-gray-100 bg-white p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {review.userAvatar ? (
                          <img
                            src={review.userAvatar}
                            alt={review.userName}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          review.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.userName}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.created).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <svg
                          key={index}
                          className={`h-4 w-4 ${
                            index < review.rating ? "text-warning" : "text-gray-200"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>

                  {review.content && (
                    <p className="text-sm leading-6 text-gray-600">{review.content}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
