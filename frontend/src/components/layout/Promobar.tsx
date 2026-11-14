import { Icon } from "@iconify/react";

const PromoBar = () => (
  <aside
    aria-label="Student project disclaimer"
    className="bg-slate-900 text-white text-center py-2 px-3 text-xs tracking-normal border-b border-slate-800"
  >
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] sm:text-xs">
      <div className="flex items-center gap-1.5 font-medium text-amber-300">
        <Icon icon="lucide:graduation-cap" width={15} />
        <span>
          <strong className="font-bold underline decoration-amber-400/60">
            Student project – E-Business, Hanoi University
          </strong>{" "}
          <span className="text-white/80">(Dự án học thuật thử nghiệm · Không bán thương mại)</span>
        </span>
      </div>
      <div className="text-white/70 hidden md:flex items-center gap-1.5">
        <Icon icon="lucide:sparkles" width={13} className="text-warning" />
        <span>Miễn phí mockup 2D &amp; Báo giá trong 15 phút</span>
      </div>
    </div>
  </aside>
);

export default PromoBar;
