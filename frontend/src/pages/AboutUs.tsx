import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import aboutStudioImage from "../assets/images/about-studio.jpg";

type FeatureItem = {
  icon: string;
  title: string;
  description: string;
};

type StatItem = {
  number: string;
  label: string;
  icon: string;
};

type ValueItem = {
  icon: string;
  title: string;
  description: string;
};

type TeamMember = {
  name: string;
  role: string;
  initials: string;
  bio: string;
};

const stats: StatItem[] = [
  { number: "15K+", label: "Áo custom hoàn thiện", icon: "lucide:shirt" },
  { number: "37+", label: "Phôi áo & mẫu thiết kế", icon: "lucide:layers" },
  { number: "48h", label: "Lên mẫu & duyệt nhanh", icon: "lucide:clock" },
  { number: "98%", label: "Khách quay lại đặt thêm", icon: "lucide:sparkles" },
];

const values: ValueItem[] = [
  {
    icon: "lucide:scissors",
    title: "Form & vải chọn lọc",
    description:
      "Chú trọng định lượng vải cotton, cá sấu và nỉ bông đứng form, thoáng khí và bền màu sau nhiều lần giặt.",
  },
  {
    icon: "lucide:palette",
    title: "Chuẩn màu in & thêu",
    description:
      "Kiểm duyệt file thiết kế trước khi sản xuất giúp hình in sắc nét, đường thêu gọn và đúng nhận diện.",
  },
  {
    icon: "lucide:heart-handshake",
    title: "Đồng hành linh hoạt",
    description:
      "Nhận từ đơn cá nhân, nhóm lớp đến đồng phục doanh nghiệp với tư vấn rõ ràng và báo giá minh bạch.",
  },
];

const features: FeatureItem[] = [
  {
    icon: "lucide:badge-check",
    title: "Kiểm tra kỹ từng đơn",
    description: "Rà soát kích thước, chất liệu và vị trí hình in trước khi đóng gói giao đi.",
  },
  {
    icon: "lucide:truck",
    title: "Giao hàng đúng hẹn",
    description: "Theo dõi tiến độ minh bạch và giao nhanh toàn quốc cho đơn lẻ lẫn đơn số lượng.",
  },
  {
    icon: "lucide:shield-check",
    title: "Bảo hành in thêu rõ ràng",
    description: "Hỗ trợ xử lý và đổi trả nhanh nếu sản phẩm lỗi kỹ thuật hoặc sai quy cách.",
  },
  {
    icon: "lucide:message-circle-heart",
    title: "Tư vấn 7 ngày/tuần",
    description: "Đội ngũ luôn sẵn sàng gợi ý phối màu, chọn size và chất liệu phù hợp ngân sách.",
  },
];

const team: TeamMember[] = [
  {
    name: "Đỗ Minh Sơn",
    role: "Leader & Full-stack Developer",
    initials: "MS",
    bio: "Định hướng sản phẩm, kiến trúc hệ thống và tối ưu trải nghiệm đặt áo trực tuyến trên HauShop.",
  },
  {
    name: "Đỗ Anh Khoa",
    role: "Developer & Quality Tester",
    initials: "AK",
    bio: "Phát triển tính năng, kiểm thử quy trình đặt hàng và đảm bảo hệ thống vận hành ổn định.",
  },
  {
    name: "Lê Thành Đạt",
    role: "Developer & UI Designer",
    initials: "TĐ",
    bio: "Thiết kế giao diện sáng sủa, trực quan giúp khách hàng chọn mẫu áo và đặt mua nhanh gọn.",
  },
];

const AboutUs = () => {
  return (
    <div className="bg-white text-primeColor">
      <section className="border-b border-gray-100 bg-gradient-to-b from-[#fff7f5] via-white to-white">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
          <div className="mb-4 flex items-center gap-2 text-xs text-lightText">
            <Link to="/" className="transition-colors hover:text-primeColor">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="font-medium text-primeColor">Về chúng tôi</span>
          </div>

          <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-12">
            <div className="lg:col-span-7">

              <h1 className="mt-1 font-titleFont text-2xl font-bold leading-tight text-primeColor sm:text-4xl">
                May &amp; in áo custom{" "}
                <span className="text-red-500">chỉnh chu từ phôi vải đến từng chi tiết</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-lightText sm:text-[15px]">
                HauShop tập trung vào ba dòng áo thiết yếu: <strong className="font-medium text-primeColor">Áo Có Cổ</strong>,{" "}
                <strong className="font-medium text-primeColor">Áo Cổ Tròn</strong> và{" "}
                <strong className="font-medium text-primeColor">Áo Hoodie</strong> — dễ mặc hằng ngày, dễ tùy biến theo dấu ấn riêng của cá nhân, đội nhóm và doanh nghiệp.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600"
                >
                  Khám phá mẫu áo
                  <Icon icon="lucide:arrow-right" className="text-base" />
                </Link>

                <Link
                  to="/contact-us"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-primeColor transition-colors hover:border-red-300 hover:text-red-500"
                >
                  Liên hệ tư vấn
                  <Icon icon="lucide:phone-call" className="text-base" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-sm transition-colors hover:border-red-200"
                  >
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                      <Icon icon={stat.icon} className="text-base" />
                    </div>
                    <div className="font-titleFont text-lg font-bold text-primeColor sm:text-xl">
                      {stat.number}
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-lightText">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm">
                <div className="relative overflow-hidden rounded-xl bg-[#f7f5f2]">
                  <img
                    src={aboutStudioImage}
                    alt="Không gian studio và kệ áo custom HauShop"
                    className="aspect-[4/3] w-full object-cover object-center"
                  />

                  <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/95 px-3.5 py-2.5 shadow-md backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                        <Icon icon="lucide:shield-check" className="text-base" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-lightText">Tiêu chuẩn HauShop</p>
                        <p className="text-xs font-semibold text-primeColor">
                          Kiểm vải &amp; duyệt mẫu trước khi in
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                      <Icon icon="lucide:star" className="text-xs" />
                      4.9/5 đánh giá
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
            <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-500">
              Câu chuyện HauShop
            </span>

            <h2 className="mt-3 font-titleFont text-xl font-bold text-primeColor sm:text-2xl">
              Trải nghiệm chọn áo custom gọn gàng, minh bạch và dễ đặt
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-lightText">
              Thay vì mất nhiều thời gian trao đổi rời rạc giữa khâu chọn phôi áo, chất liệu vải và báo giá số lượng, HauShop gom gọn mọi thông tin trên một nền tảng thống nhất.
            </p>

            <p className="mt-2.5 text-sm leading-relaxed text-lightText">
              Mỗi sản phẩm đều hiển thị mức giá tham khảo tận xưởng cùng các tùy chọn chất liệu và kỹ thuật in/thêu để bạn dễ dàng gửi yêu cầu báo giá cho nhóm lớp, CLB hoặc doanh nghiệp.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <div className="rounded-xl bg-[#f7f5f2] px-3.5 py-2.5">
                <p className="text-xs font-semibold text-primeColor">3 danh mục chủ lực</p>
                <p className="mt-0.5 text-xs text-lightText">Áo Có Cổ, Cổ Tròn, Hoodie</p>
              </div>
              <div className="rounded-xl bg-[#f7f5f2] px-3.5 py-2.5">
                <p className="text-xs font-semibold text-primeColor">Báo giá &amp; tư vấn nhanh</p>
                <p className="mt-0.5 text-xs text-lightText">Cập nhật tiến độ báo giá tức thì</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="flex items-start gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-colors hover:border-red-200"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <Icon icon={value.icon} className="text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-primeColor sm:text-[15px]">
                    {value.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-lightText sm:text-sm">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-[#fafaf9]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-titleFont text-xl font-bold text-primeColor sm:text-2xl">
                Tại sao chọn HauShop?
              </h2>
              <p className="mt-1 text-sm text-lightText">
                Quy trình gọn nhẹ giúp đơn áo của bạn đi từ ý tưởng tới tay người mặc nhanh chóng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <Icon icon={feature.icon} className="text-lg" />
                </div>
                <h3 className="text-sm font-semibold text-primeColor">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-lightText sm:text-[13px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-red-100 bg-[#fff7f5] p-5 shadow-sm sm:p-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-red-500">
              <Icon icon="lucide:target" className="text-sm" />
              Sứ mệnh
            </div>
            <h2 className="mt-3 font-titleFont text-lg font-bold text-primeColor sm:text-xl">
              Biến ý tưởng áo riêng thành sản phẩm bền đẹp, dễ tiếp cận
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-lightText">
              Giúp khách hàng cá nhân và đội nhóm dễ dàng sở hữu những chiếc áo vừa vặn, chất liệu thoải mái cùng dịch vụ hỗ trợ rõ ràng ở từng bước.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-primeColor">
              <Icon icon="lucide:compass" className="text-sm text-red-500" />
              Tầm nhìn
            </div>
            <h2 className="mt-3 font-titleFont text-lg font-bold text-primeColor sm:text-xl">
              Nền tảng áo custom hiện đại được tin chọn lâu dài
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-lightText">
              Liên tục nâng cấp chất lượng phôi áo, chuẩn hóa công nghệ đặt hàng và mở rộng khả năng tùy biến để mỗi lần quay lại HauShop đều tiện lợi hơn.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-[#fafaf9]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-14">
          <div className="mb-5">
            <h2 className="font-titleFont text-xl font-bold text-primeColor sm:text-2xl">
              Đội ngũ phát triển
            </h2>
            <p className="mt-1 text-sm text-lightText">
              Những thành viên trực tiếp xây dựng và hoàn thiện trải nghiệm mua sắm tại HauShop.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-colors hover:border-red-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 font-titleFont text-sm font-bold text-red-500">
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-primeColor sm:text-[15px]">
                      {member.name}
                    </h3>
                    <p className="truncate text-xs font-medium text-red-500">{member.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-lightText sm:text-[13px]">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
