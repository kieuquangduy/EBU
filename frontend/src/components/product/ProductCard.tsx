import { memo, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useToast } from "../../context/toastContext";
import { formatPrice } from "../../utils/formatPrice";
import type { ProductSummaryDto } from "../../@types/product.type";
import { useAuth } from "../../hooks/useAuth";
import { useShopContact } from "../../hooks/useShopContact";
import { useToggleWishlist } from "../../hooks/useWishlist";
import { queryKeys } from "../../lib/queryKeys";
import { logger } from "../../lib/logger";
import { openZaloProductConsult, resolveProductPricing } from "../../lib/productRfq";
import { ROUTES, routeTo } from "../../lib/routes";

interface Props {
  product: ProductSummaryDto;
  initialWished?: boolean;
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className={`w-3.5 h-3.5 ${filled ? "text-warning" : "text-gray-300"}`}
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

function ProductCard({ product: p, initialWished }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const { data: shopContact } = useShopContact();
  const toggleWishlist = useToggleWishlist();

  const [localWished, setLocalWished] = useState<boolean | null>(null);

  const { basePrice, originalPrice, discountPercent } = resolveProductPricing(p);
  const wishlistIds = user?.id
    ? queryClient.getQueryData<string[]>(queryKeys.wishlist.ids(user.id))
    : null;
  const wished = localWished ?? initialWished ?? wishlistIds?.includes(p.id) ?? false;

  useEffect(() => {
    setLocalWished(null);
  }, [initialWished, p.id, user?.id]);

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`${routeTo.product(p.slug)}?rfq=1`);
  };

  const handleZalo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}${routeTo.product(p.slug)}`;
    const result = await openZaloProductConsult({
      zaloPhone: shopContact?.zaloPhone,
      productName: p.name,
      productUrl,
    });

    if (!result.opened) {
      showToast("Số Zalo đang cập nhật, chuyển sang chat với shop", "info");
      navigate(`${routeTo.product(p.slug)}?chat=support`);
      return;
    }

    if (result.copied) {
      showToast("Đã sao chép tên mẫu áo — đang mở Zalo", "info");
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast("Vui lòng đăng nhập để dùng wishlist", "warning");
      navigate(ROUTES.SIGN_IN);
      return;
    }

    if (toggleWishlist.isPending) return;

    try {
      const nextWished = await toggleWishlist.mutateAsync({ productId: p.id, wished });
      setLocalWished(nextWished);
      showToast(nextWished ? "Đã thêm vào yêu thích" : "Đã xóa khỏi yêu thích", "success");
    } catch (error) {
      logger.error("Wishlist failed", error);
      showToast("Không thể cập nhật wishlist", "error");
    }
  };

  return (
    <div
      onClick={() => navigate(routeTo.product(p.slug))}
      className="group relative bg-white border border-gray-200 cursor-pointer
                 transition-all duration-350
                 hover:-translate-y-2.5 hover:shadow-cardHover hover:border-transparent"
    >
      <div className="relative overflow-hidden bg-[#f7f5f2]" style={{ height: 320 }}>
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              width="90"
              height="110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(0,0,0,0.1)"
              strokeWidth="0.8"
            >
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
            </svg>
          </div>
        )}

        {p.categories[0] && (
          <span className="absolute top-3.5 left-3.5 bg-primeColor text-white text-[10px] px-3 py-1 tracking-widest font-semibold z-10">
            {p.categories[0].name.toUpperCase()}
          </span>
        )}

        <button
          onClick={handleWishlist}
          disabled={toggleWishlist.isPending}
          className="absolute top-3.5 right-3.5 w-9 h-9 bg-white border border-gray-200 rounded-full
                     flex items-center justify-center z-10
                     opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0
                     transition-all duration-300 hover:bg-red-500 hover:border-red-500
                     disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={wished ? "Xóa khỏi wishlist" : "Thêm vào wishlist"}
        >
          <svg
            className={`w-4 h-4 transition-all ${
              wished ? "fill-red-500 stroke-red-500" : "fill-none stroke-gray-500"
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        <div
          className="absolute bottom-0 inset-x-0 bg-primeColor/85 text-white text-xs
                        tracking-widest py-3 text-center font-medium z-10
                        opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0
                        transition-all duration-300"
        >
          XEM CHI TIẾT &amp; BÁO GIÁ
        </div>
      </div>

      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] tracking-[1.5px] uppercase text-lightText mb-1.5 font-bodyFont truncate">
          {p.brandName ?? p.categories[0]?.name ?? "HAUSHOP CUSTOM"}
        </p>

        <h3 className="font-titleFont text-[17px] font-semibold leading-snug mb-2 truncate">
          {p.name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} filled={i < Math.round(p.averageRating || 5)} />
          ))}
          <span className="text-xs text-lightText font-bodyFont ml-1">
            ({p.reviewCount || 0})
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-xs text-lightText font-bodyFont">Giá từ</span>
            <span className="text-[19px] font-bold text-[#1d4ed8] font-titleFont">
              {formatPrice(basePrice)}
            </span>
            {originalPrice && (
              <span className="text-xs text-lightText line-through font-bodyFont">
                {formatPrice(originalPrice)}
              </span>
            )}
            {discountPercent && (
              <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{discountPercent}%
              </span>
            )}
          </div>

          {p.minOrderQuantity != null && p.minOrderQuantity > 1 && (
            <span className="shrink-0 text-[10px] bg-blue-50 text-[#1d4ed8] px-2 py-0.5 font-semibold font-bodyFont">
              Từ {p.minOrderQuantity} áo
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleRequestQuote}
            className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold
                       font-bodyFont tracking-[0.4px] text-white bg-[#1d4ed8] hover:bg-[#1e40af] transition-all duration-200"
          >
            <Icon icon="lucide:clipboard-list" width={15} />
            Nhận báo giá
          </button>

          <button
            type="button"
            onClick={handleZalo}
            className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold
                       font-bodyFont tracking-[0.4px] text-[#0068ff] border border-[#0068ff] bg-white
                       transition-all duration-200 hover:bg-blue-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0068ff] text-[8px] font-bold text-white">
              Z
            </span>
            Tư vấn Zalo
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
