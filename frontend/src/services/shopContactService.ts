import type { ShopContactDto } from "../@types/shopContact.type";
import { http } from "../lib/http";

export const shopContactService = {
  getPublic(signal?: AbortSignal): Promise<ShopContactDto> {
    return http.get<ShopContactDto>("/shop-contact", { signal });
  },
};

export function normalizePhoneDigits(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function buildZaloUrl(zaloPhone?: string | null): string | null {
  const digits = normalizePhoneDigits(zaloPhone);
  return digits ? `https://zalo.me/${digits}` : null;
}

export function buildTelUrl(phone?: string | null): string | null {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

