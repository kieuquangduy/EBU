const items = [
  "Thiết kế mockup miễn phí",
  "Chất liệu cao cấp, giá tận xưởng",
  "Đa dạng kỹ thuật in & thêu",
  "Báo giá minh bạch theo số lượng",
  "Tư vấn 1-1 qua Zalo & Chat",
  "Giao hàng toàn quốc đúng hẹn",
];

const MarqueeBar = () => (
  <div className="overflow-hidden border-t border-b border-gray-200 py-3 bg-white">
    <div className="flex whitespace-nowrap animate-marquee">
      {[...items, ...items].map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-3.5 px-7 text-xs tracking-[2.5px] uppercase
                      text-lightText font-bodyFont"
        >
          <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
          {item}
        </span>
      ))}
    </div>
  </div>
);

export default MarqueeBar;
