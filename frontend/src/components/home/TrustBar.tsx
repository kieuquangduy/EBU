import { useScrollReveal } from "../../hooks/useScrollReveal";
import ZaloIcon from "../common/ZaloIcon";

const items = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#EF233C" strokeWidth="1.5" className="w-6 h-6">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Thiết kế mockup miễn phí",
    sub: "Lên mẫu phối màu, vị trí logo CLB/lớp trước khi sản xuất.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#EF233C" strokeWidth="1.5" className="w-6 h-6">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
    title: "Giá tận xưởng minh bạch",
    sub: "Báo giá tối ưu theo chất liệu vải, số lượng và kỹ thuật in.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#EF233C" strokeWidth="1.5" className="w-6 h-6">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "Giao hàng toàn quốc",
    sub: "Đóng gói chuẩn, giao đúng tiến độ cho nhóm lớp & tập thể.",
  },
  {
    icon: <ZaloIcon size={24} variant="blue" />,
    title: "Tư vấn 1-1 qua Zalo & Chat",
    sub: "Đội ngũ phản hồi nhanh, hỗ trợ chọn size & chất liệu.",
  },
];

const TrustBar = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="bg-[#f7f5f2] py-12 px-10">
      <div
        ref={ref}
        className="max-w-container mx-auto grid grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={`text-center px-4 py-7 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="w-11 h-11 mx-auto mb-3.5 flex items-center justify-center">
              {item.icon}
            </div>
            <p className="text-sm font-semibold font-titleFont mb-1.5">{item.title}</p>
            <p className="text-xs text-lightText font-bodyFont leading-relaxed">{item.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustBar;
