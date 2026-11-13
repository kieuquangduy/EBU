import type { ShopContactDto } from "../@types/shopContact.type";
import { http } from "../lib/http";

export const shopContactService = {
  getPublic(signal?: AbortSignal): Promise<ShopContactDto> {
    return http.get<ShopContactDto>("/shop-contact", { signal });
  },
};

export const DEFAULT_SHOP_ZALO_PHONE = "0963538795";
export const DEFAULT_SHOP_HOTLINE = "0963 538 795";
export const DEFAULT_SHOP_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61596220172115";
export const DEFAULT_SHOP_MESSENGER_URL = "https://m.me/61596220172115";

export function normalizePhoneDigits(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function resolveShopZaloPhone(phone?: string | null): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits || digits === "0900000000") return DEFAULT_SHOP_ZALO_PHONE;
  return digits;
}

export function resolveShopMessengerUrl(messengerLink?: string | null): string {
  const trimmed = (messengerLink ?? "").trim();
  return trimmed || DEFAULT_SHOP_MESSENGER_URL;
}

export function resolveShopFacebookUrl(facebookLink?: string | null): string {
  const trimmed = (facebookLink ?? "").trim();
  return trimmed || DEFAULT_SHOP_FACEBOOK_URL;
}

export function buildZaloUrl(zaloPhone?: string | null): string | null {
  const digits = normalizePhoneDigits(zaloPhone);
  return digits ? `https://zalo.me/${digits}` : null;
}

export function buildShopZaloUrl(zaloPhone?: string | null): string {
  return `https://zalo.me/${resolveShopZaloPhone(zaloPhone)}`;
}

export function buildTelUrl(phone?: string | null): string | null {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

