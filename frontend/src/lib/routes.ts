export const ROUTES = {
  HOME: "/",
  SIGN_IN: "/signin",
  SIGN_UP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  SHOP: "/shop",
  QUOTES: "/quotes",
  REVIEWS: "/reviews",
  NOTIFICATIONS: "/notifications",
  PROFILE: "/profile",
  ADMIN: "/admin",
  WISHLIST: "/wishlist",
  POLICIES: "/policies",
  POLICIES_DELIVERY: "/policies/delivery",
  POLICIES_RETURNS: "/policies/returns",
  POLICIES_PRIVACY: "/policies/privacy",
} as const;

export const routeTo = {
  product: (slug: string) => `${ROUTES.SHOP}/${slug}`,
  shopSearch: (search: string) =>
    search ? `${ROUTES.SHOP}?search=${encodeURIComponent(search)}` : ROUTES.SHOP,
  shopCategory: (categoryId: string) =>
    categoryId ? `${ROUTES.SHOP}?categoryId=${encodeURIComponent(categoryId)}` : ROUTES.SHOP,
  quote: (quoteId: string) => `${ROUTES.QUOTES}/${encodeURIComponent(quoteId)}`,
  requestQuote: (productSlug?: string) =>
    productSlug ? `${ROUTES.QUOTES}?product=${encodeURIComponent(productSlug)}` : ROUTES.QUOTES,
  adminSection: (section: string) => `${ROUTES.ADMIN}/${section}`,
  adminOrder: (orderId: string) => `${ROUTES.ADMIN}/orders?orderId=${encodeURIComponent(orderId)}`,
} as const;
