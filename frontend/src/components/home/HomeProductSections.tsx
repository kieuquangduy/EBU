import { Link } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";
import { useWishlistIds } from "../../hooks/useWishlist";
import ProductCard from "../product/ProductCard";
import ProductCardSkeleton from "../product/Productcardskeleton";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import type { ProductQueryDto } from "../../@types/product.type";
import { CUSTOM_CATEGORY_IDS } from "../../lib/catalog";
import { ROUTES, routeTo } from "../../lib/routes";
import customTileImage from "../../assets/images/products/áo cổ tròn/ts coll.png";
import poloTileImage from "../../assets/images/products/áo có cổ/1.png";
import tshirtTileImage from "../../assets/images/products/áo cổ tròn/ts01.png";
import hoodieTileImage from "../../assets/images/products/áo hoodie/hd01.png";

const categoryTiles = [
  {
    title: "Áo Custom",
    label: "37 mẫu thiết kế theo yêu cầu",
    href: ROUTES.SHOP,
    image: customTileImage,
  },
  {
    title: "Áo Có Cổ",
    label: "Polo cá sấu custom — 15 mẫu",
    href: routeTo.shopCategory(CUSTOM_CATEGORY_IDS.POLO),
    image: poloTileImage,
  },
  {
    title: "Áo Cổ Tròn",
    label: "Thun cotton oversize — 12 mẫu",
    href: routeTo.shopCategory(CUSTOM_CATEGORY_IDS.TSHIRT),
    image: tshirtTileImage,
  },
  {
    title: "Áo Hoodie",
    label: "Nỉ bông boxy — 10 mẫu",
    href: routeTo.shopCategory(CUSTOM_CATEGORY_IDS.HOODIE),
    image: hoodieTileImage,
  },
];

type ProductRailProps = {
  title: string;
  href: string;
  query: ProductQueryDto;
  tone?: "light" | "soft";
};

function ProductRail({ title, href, query, tone = "light" }: ProductRailProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  const { data: wishlistIds = [] } = useWishlistIds({ enabled: visible });
  const { items, isLoading, isError } = useProducts({
    isActive: true,
    sortBy: "created",
    sortOrder: "desc",
    pageSize: 4,
    includeTotal: false,
    ...query,
  }, {
    enabled: visible,
  });

  return (
    <section className={tone === "soft" ? "bg-[#f7f5f2]" : "bg-white"}>
      <div
        ref={ref}
        className={`max-w-container mx-auto px-4 py-16 transition-all duration-700 sm:px-6 lg:px-10 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="section-title">{title}</h2>
          </div>

          <Link
            to={href}
            className="group flex w-fit items-center gap-1.5 border-b border-primeColor pb-0.5 font-bodyFont text-sm font-medium transition-colors duration-200 hover:border-red-500 hover:text-red-500"
          >
            Xem thêm
            <svg
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {isError ? (
          <div className="border border-red-100 bg-red-50 px-4 py-6 text-center text-sm text-red-500">
            Không thể tải danh sách sản phẩm.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))
              : items.map((product, index) => (
                  <div
                    key={product.id}
                    className={`transition-all duration-700 ${
                      visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                    }`}
                    style={{ transitionDelay: `${index * 70}ms` }}
                  >
                    <ProductCard
                      product={product}
                      initialWished={wishlistIds.includes(product.id)}
                    />
                  </div>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomeProductSections() {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <>
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-10">
        <div
          ref={ref}
          className={`max-w-container mx-auto transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
              <h2 className="section-title">Danh mục nổi bật</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categoryTiles.map((tile, index) => (
              <Link
                key={tile.title}
                to={tile.href}
                className={`group relative min-h-[360px] overflow-hidden bg-primeColor transition-all duration-700 hover:-translate-y-1 ${
                  visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <img
                  src={tile.image}
                  alt={tile.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                    {tile.label}
                  </p>
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="font-titleFont text-2xl font-bold">{tile.title}</h3>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primeColor transition-transform duration-300 group-hover:translate-x-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail
        title="Áo Có Cổ Custom"
        href={routeTo.shopCategory(CUSTOM_CATEGORY_IDS.POLO)}
        query={{ categoryId: CUSTOM_CATEGORY_IDS.POLO }}
      />

      <ProductRail
        title="Áo Cổ Tròn Custom"
        href={routeTo.shopCategory(CUSTOM_CATEGORY_IDS.TSHIRT)}
        query={{ categoryId: CUSTOM_CATEGORY_IDS.TSHIRT }}
        tone="soft"
      />

      <ProductRail
        title="Áo Hoodie Custom"
        href={routeTo.shopCategory(CUSTOM_CATEGORY_IDS.HOODIE)}
        query={{ categoryId: CUSTOM_CATEGORY_IDS.HOODIE }}
      />
    </>
  );
}
