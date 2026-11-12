import type { ProductDto, ProductSummaryDto } from "../@types/product.type";
import { buildZaloUrl } from "../services/shopContactService";

type PriceSource = Pick<
  ProductSummaryDto | ProductDto,
  "price" | "basePrice" | "originalPrice" | "discountPercent" | "minVariantPrice"
>;

export interface ProductDisplayPricing {
  basePrice: number;
  originalPrice: number | null;
  discountPercent: number | null;
}

export function resolveProductPricing(product: PriceSource, variantPrice?: number | null): ProductDisplayPricing {
  const basePrice =
    variantPrice != null && variantPrice > 0
      ? variantPrice
      : product.basePrice != null && product.basePrice > 0
        ? product.basePrice
        : product.minVariantPrice != null && product.minVariantPrice > 0
          ? product.minVariantPrice
          : product.price;

  const originalCandidate =
    product.originalPrice != null && product.originalPrice > basePrice
      ? product.originalPrice
      : product.price > basePrice
        ? product.price
        : null;

  const discountPercent =
    product.discountPercent != null && product.discountPercent > 0
      ? product.discountPercent
      : originalCandidate
        ? Math.round(((originalCandidate - basePrice) / originalCandidate) * 100)
        : null;

  return {
    basePrice,
    originalPrice: originalCandidate,
    discountPercent,
  };
}

export async function copyTextQuietly(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function openZaloProductConsult(options: {
  zaloPhone?: string | null;
  productName: string;
  productUrl: string;
}): Promise<{ opened: boolean; copied: boolean }> {
  const zaloUrl = buildZaloUrl(options.zaloPhone);
  if (!zaloUrl) return { opened: false, copied: false };

  const copied = await copyTextQuietly(`Tư vấn mẫu áo: ${options.productName} - ${options.productUrl}`);
  window.open(zaloUrl, "_blank", "noopener,noreferrer");
  return { opened: true, copied };
}

