import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../lib/routes";

type PolicyTab = "delivery" | "returns" | "privacy";

export default function PoliciesPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<PolicyTab>("delivery");

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("return")) {
      setActiveTab("returns");
    } else if (path.includes("privacy")) {
      setActiveTab("privacy");
    } else {
      setActiveTab("delivery");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800">
      {/* Student project badge bar */}
      <div className="bg-amber-100/80 border-b border-amber-200 py-2.5 px-4 text-center text-xs text-amber-900 font-medium">
        <span className="font-bold">Student project – E-Business, Hanoi University</span> | Tất cả quy trình và chính sách dưới đây được mô phỏng theo tiêu chuẩn thương mại điện tử thực tế.
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0068ff]">HauShop Custom Apparel</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Chính Sách &amp; Cam Kết Dịch Vụ
          </h1>
          <p className="mt-3 text-sm text-slate-600 max-w-2xl mx-auto">
            HauShop áp dụng quy trình tiêu chuẩn dành riêng cho các đơn đặt may, in áo lớp, áo câu lạc bộ và đồng phục tập thể.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="mb-8 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("delivery")}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "delivery"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="lucide:truck" width={18} />
            Vận chuyển &amp; Sản xuất
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "returns"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="lucide:shield-check" width={18} />
            Đổi trả &amp; Bảo hành
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "privacy"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon icon="lucide:lock" width={18} />
            Bảo mật thiết kế &amp; Dữ liệu
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
          {activeTab === "delivery" && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0068ff]">
                    <Icon icon="lucide:truck" width={20} />
                  </span>
                  Chính Sách Vận Chuyển &amp; Quy Trình Sản Xuất Áo Custom
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Quy trình từ lúc chốt yêu cầu báo giá (RFQ) đến khi nhận áo tận tay đại diện tập thể.
                </p>
              </div>

              {/* Timeline quy trình */}
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0068ff]">Giai đoạn 1 (24 - 48h)</div>
                  <h3 className="mt-1 font-bold text-slate-900">Duyệt Mockup 2D &amp; Chốt Size</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Sau khi tiếp nhận yêu cầu báo giá và file logo, chuyên viên thiết kế lên bản vẽ mockup 2D miễn phí và đối soát bảng size thành viên với người đại diện.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Giai đoạn 2 (3 - 5 ngày)</div>
                  <h3 className="mt-1 font-bold text-slate-900">Cắt May &amp; In/Thêu Kỹ Thuật</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Xưởng tiến hành dệt nhuộm, cắt vải theo số lượng và áp dụng công nghệ in đã chọn (In lụa, In DTF, In decal nhiệt hoặc thêu vi tính độ nét cao).
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Giai đoạn 3 (1 - 3 ngày)</div>
                  <h3 className="mt-1 font-bold text-slate-900">KCS, Đóng Túi &amp; Giao Tận Nơi</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Kiểm duyệt chất lượng từng chiếc (KCS), gấp gọn, bọc túi zip riêng và gửi hỏa tốc qua bưu điện/chành xe kèm danh sách size dán ngoài thùng.
                  </p>
                </div>
              </div>

              {/* Chi tiết biểu phí & cam kết */}
              <div className="space-y-4 text-sm text-slate-700">
                <h3 className="text-base font-bold text-slate-900">Chính sách cước vận chuyển:</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-slate-900">Miễn phí giao hàng toàn quốc (Freeship 100%)</strong> cho tất cả các đơn đặt từ <strong>20 áo trở lên</strong>.
                  </li>
                  <li>
                    Với đơn dưới 20 áo (10 – 19 áo), cước vận chuyển hỗ trợ đồng giá 30.000 VNĐ cho nội thành Hà Nội/TP.HCM và 45.000 VNĐ cho các tỉnh thành khác.
                  </li>
                  <li>
                    <strong className="text-slate-900">Hỗ trợ đơn hỏa tốc sự kiện:</strong> Nhận đơn gấp cho hội trại, ngày hội trường, giải bóng đá CLB với thời gian hoàn thiện thần tốc từ 2 – 3 ngày (có phụ phí hỗ trợ ca tăng ca xưởng).
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "returns" && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Icon icon="lucide:shield-check" width={20} />
                  </span>
                  Chính Sách Bảo Hành &amp; Đổi Trả Áo Custom
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Cam kết bảo vệ quyền lợi tập thể trước mọi sai sót kỹ thuật từ phía xưởng sản xuất.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Đặc thù sản phẩm may/in theo yêu cầu:</p>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  Vì áo lớp/áo CLB được in logo và sản xuất riêng theo danh sách size của từng tập thể, HauShop áp dụng chính sách <strong>bảo hành may lại 1-1 hoặc hoàn tiền</strong> đối với mọi lỗi xuất phát từ phía xưởng.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icon icon="lucide:check-circle" className="text-emerald-600" width={18} />
                    Trường hợp được đổi may mới 100% miễn phí
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                    <li>Hình in bị bong tróc, nứt gãy hoặc phai màu trong vòng 30 ngày sử dụng đúng hướng dẫn giặt.</li>
                    <li>Hình in/vị trí in sai lệch so với bản vẽ Mockup 2D đã được đại diện lớp ký duyệt.</li>
                    <li>Sản phẩm bị rách, sứt chỉ, ố bẩn hoặc sai định lượng vải đã cam kết trong báo giá.</li>
                    <li>Giao thiếu số lượng áo hoặc sai kích thước theo bảng size đã chốt.</li>
                  </ul>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icon icon="lucide:alert-circle" className="text-amber-600" width={18} />
                    Quy trình xử lý khiếu nại nhanh trong 24h
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-decimal pl-4">
                    <li>Đại diện nhóm chụp ảnh/video chi tiết sản phẩm lỗi và mã đơn báo giá gửi qua Zalo Hotline hoặc mục Chat trên website.</li>
                    <li>Bộ phận KCS đối soát file gốc và phản hồi phương án xử lý trong vòng <strong>24 giờ</strong>.</li>
                    <li>Tiến hành in bù/may bù áo mới hỏa tốc trong 2 – 3 ngày và giao tận nơi hoàn toàn miễn phí.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon icon="lucide:lock" width={20} />
                  </span>
                  Chính Sách Bảo Mật Dữ Liệu &amp; Sở Hữu Thiết Kế
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Cam kết bảo vệ tuyệt đối hình ảnh bản quyền của tập thể và dữ liệu người dùng.
                </p>
              </div>

              <div className="space-y-5 text-sm text-slate-700">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icon icon="lucide:palette" className="text-indigo-600" width={18} />
                    Bảo mật mẫu thiết kế &amp; Logo độc quyền
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Mọi logo, slogan, linh vật, hình vẽ do CLB hoặc tập thể lớp gửi lên qua hệ thống tải file đều thuộc quyền sở hữu trí tuệ của tập thể đó. HauShop cam kết <strong>không chia sẻ, thương mại hóa hoặc in cho bất kỳ khách hàng nào khác</strong> khi chưa có văn bản đồng ý từ người đại diện.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icon icon="lucide:user-check" className="text-slate-800" width={18} />
                    Bảo mật danh sách thành viên &amp; Số điện thoại
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Danh sách tên thành viên, số đo chiều cao/cân nặng và số điện thoại liên hệ chỉ được dùng cho mục đích dệt may, chia túi size và chuyển phát đơn hàng. Hệ thống cam kết không cung cấp danh bạ khách hàng cho bên thứ ba hoặc các dịch vụ quảng cáo phiền toái.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-xs text-amber-900">
                  <h4 className="font-bold uppercase tracking-wider text-amber-800">Cam kết đạo đức học thuật (Academic Project Disclaimer)</h4>
                  <p className="mt-1 leading-relaxed">
                    Website HauShop là đồ án môn học <strong>Thương mại điện tử (E-Business) - Khoa CNTT, Đại học Hà Nội (HANU)</strong>. Mọi dữ liệu thu thập từ các bài kiểm thử người dùng (Testers) đều được ẩn danh bằng mã hóa (T1, T2...) theo đúng quy định bảo vệ người tham gia thử nghiệm của nhà trường.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action bottom banner */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-xl bg-slate-900 p-6 text-white sm:flex-row">
            <div>
              <p className="text-base font-bold">Cần tư vấn thêm về mẫu áo &amp; chính sách xưởng?</p>
              <p className="text-xs text-slate-400 mt-1">Đội ngũ hỗ trợ giải đáp trực tiếp 7 ngày/tuần</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={ROUTES.QUOTES}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition shadow-xs"
              >
                <Icon icon="lucide:file-text" width={16} />
                Gửi yêu cầu báo giá
              </Link>
              <Link
                to="/contact-us"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition"
              >
                Liên hệ xưởng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
