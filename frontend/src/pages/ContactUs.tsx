import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import { ROUTES } from '../lib/routes';
import contactStudioImage from '../assets/images/contact-studio.jpg';
import { useShopContact } from '../hooks/useShopContact';
import {
  DEFAULT_SHOP_FACEBOOK_URL,
  DEFAULT_SHOP_HOTLINE,
  DEFAULT_SHOP_MESSENGER_URL,
  DEFAULT_SHOP_ZALO_PHONE,
  buildShopZaloUrl,
  buildTelUrl,
} from '../services/shopContactService';

const TOPIC_PRESETS = [
  'Đặt áo lớp / áo nhóm custom',
  'Tư vấn size & chất liệu vải',
  'Yêu cầu báo giá theo số lượng',
  'Đổi trả & bảo hành hình in',
] as const;

const FAQ_ITEMS = [
  {
    q: 'Thời gian xử lý và giao áo custom mất bao lâu?',
    a: 'Các mẫu có sẵn được xử lý trong 24h và giao toàn quốc trong 2–4 ngày. Đơn đặt in tùy chỉnh tên lớp/logo số lượng lớn mất thêm 2–3 ngày sản xuất.',
  },
  {
    q: 'Có hỗ trợ đổi size hoặc bảo hành hình in không?',
    a: 'HauShop hỗ trợ đổi size hoặc hoàn trả trong 7 ngày nếu sản phẩm còn nguyên tem mác, chưa qua giặt ủi hoặc phát sinh lỗi in ấn từ xưởng.',
  },
  {
    q: 'Tôi có thể xem trước mẫu thiết kế trước khi đặt số lượng lớn?',
    a: 'Có. Bạn chỉ cần để lại yêu cầu và thông tin liên hệ ở biểu mẫu bên cạnh, đội ngũ thiết kế sẽ gửi mockup phối màu miễn phí trước khi chốt đơn.',
  },
] as const;

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000);
    } catch (error) {
      logger.error('Failed to copy contact text', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));

      setSuccess(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

      setTimeout(() => setSuccess(false), 4000);
    } catch (error) {
      logger.error('Error submitting form', error);
    } finally {
      setLoading(false);
    }
  };

  const { data: contact } = useShopContact();
  const hotline = contact?.hotline || DEFAULT_SHOP_HOTLINE;
  const zaloPhone = contact?.zaloPhone || DEFAULT_SHOP_ZALO_PHONE;
  const email = contact?.email || 'contact@haushop.vn';
  const messengerUrl = contact?.messengerLink || DEFAULT_SHOP_MESSENGER_URL;
  const facebookUrl = contact?.facebookLink || DEFAULT_SHOP_FACEBOOK_URL;

  const contactChannels = [
    {
      key: 'phone',
      icon: 'lucide:phone',
      title: 'Hotline tư vấn',
      content: hotline,
      note: 'Hỗ trợ nhanh đơn gấp & đặt áo nhóm',
      href: buildTelUrl(hotline) || `tel:${hotline.replace(/\D/g, '')}`,
    },
    {
      key: 'zalo',
      icon: 'lucide:message-circle',
      title: 'Zalo tư vấn',
      content: zaloPhone,
      note: 'Trao đổi mẫu mockup & chất liệu vải',
      href: buildShopZaloUrl(zaloPhone),
    },
    {
      key: 'messenger',
      icon: 'mdi:facebook-messenger',
      title: 'Chat Messenger',
      content: 'm.me/61596220172115',
      note: 'Nhắn tin trực tiếp qua Facebook Messenger',
      href: messengerUrl,
    },
    {
      key: 'facebook',
      icon: 'mdi:facebook',
      title: 'Fanpage Facebook',
      content: 'HauShop Fanpage',
      note: 'Cập nhật mẫu áo & hoạt động xưởng',
      href: facebookUrl,
    },
    {
      key: 'email',
      icon: 'lucide:mail',
      title: 'Email thiết kế',
      content: email,
      note: 'Gửi file logo, mockup & yêu cầu chi tiết',
      href: `mailto:${email}`,
    },
    {
      key: 'address',
      icon: 'lucide:map-pin',
      title: 'Điểm nhận & tư vấn',
      content: 'HanuUniversity',
      note: 'Làm việc theo lịch hẹn trước',
      href: 'https://maps.google.com/?q=Hanoi+University',
    },
  ];

  const supportPillars = [
    {
      icon: 'lucide:shirt',
      title: 'Tư vấn áo custom',
      description: 'Hỗ trợ chọn phom Áo Có Cổ, Áo Cổ Tròn, Áo Hoodie, bảng size và phối màu in theo nhóm.',
    },
    {
      icon: 'lucide:package-check',
      title: 'Báo giá tận xưởng',
      description: 'Cập nhật nhanh tiến độ báo giá theo số lượng, chất liệu vải và kỹ thuật in/thêu.',
    },
    {
      icon: 'lucide:shield-check',
      title: 'Đổi trả & bảo hành',
      description: 'Xử lý minh bạch các trường hợp đổi size, lỗi vải hoặc sai sót hình in trong 7 ngày.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-primeColor">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-container items-center justify-between px-4 py-3.5 sm:px-6 lg:px-10">
          <nav className="flex items-center gap-2 text-sm font-bodyFont text-lightText">
            <Link to={ROUTES.HOME} className="transition-colors hover:text-red-500">
              Home
            </Link>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-primeColor">Contact</span>
          </nav>

          <span className="hidden items-center gap-2 text-xs font-medium text-lightText sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Đang hoạt động • Phản hồi trong ngày
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-[#fff7f5]/80 via-white to-white">
        <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            {/* Left copy + quick contact cards */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-500">
                  HauShop Contact & Custom Studio
                </p>

                <h1 className="mt-4 font-titleFont text-4xl font-bold leading-[1.12] tracking-tight text-primeColor sm:text-5xl">
                  Kết nối trực tiếp với
                  <span className="mt-1 block text-red-500">đội ngũ HauShop.</span>
                </h1>

                <p className="mt-5 max-w-2xl font-bodyFont text-base leading-relaxed text-lightText">
                  Cần tư vấn chọn mẫu Áo Có Cổ, Áo Cổ Tròn, Áo Hoodie custom cho lớp, CLB hay nhận
                  báo giá theo số lượng? Chọn kênh liên hệ bên dưới hoặc gửi lời nhắn trực tiếp cho chúng tôi.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {contactChannels.map((item) => {
                  const isExternal = item.href.startsWith('http');
                  const isCopied = copiedKey === item.key;

                  return (
                    <div
                      key={item.key}
                      className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white">
                            <Icon icon={item.icon} className="text-lg" />
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleCopy(item.key, item.content)}
                            title={`Sao chép ${item.title}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-lightText transition-colors hover:border-red-300 hover:text-red-500"
                          >
                            <Icon icon={isCopied ? 'lucide:check' : 'lucide:copy'} className="text-xs" />
                            {isCopied ? 'Đã chép' : 'Copy'}
                          </button>
                        </div>

                        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-lightText">
                          {item.title}
                        </p>
                        <a
                          href={item.href}
                          target={isExternal ? '_blank' : undefined}
                          rel={isExternal ? 'noreferrer' : undefined}
                          className="mt-1 block truncate font-titleFont text-sm font-bold text-primeColor transition-colors hover:text-red-500"
                          title={item.content}
                        >
                          {item.content}
                        </a>
                      </div>

                      <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-lightText">
                        {item.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right studio showcase image card */}
            <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-gray-200/80 bg-[#f7f5f2] shadow-sm lg:min-h-full">
              <img
                src={contactStudioImage}
                alt="HauShop Custom Studio — Áo Có Cổ, Áo Cổ Tròn và Áo Hoodie Custom"
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

              <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/90 px-4 py-3 backdrop-blur-md">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500">
                    HauShop Studio
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-primeColor">
                    Áo Có Cổ • Cổ Tròn • Hoodie Custom
                  </p>
                </div>

                <Link
                  to={ROUTES.SHOP}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Xem mẫu áo
                  <Icon icon="lucide:arrow-right" className="text-sm" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form + Studio Details */}
      <section className="bg-[#f7f5f2] py-14 sm:py-16">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Contact Form */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7 lg:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                    Biểu mẫu liên hệ
                  </p>
                  <h2 className="mt-2 font-titleFont text-2xl font-bold text-primeColor sm:text-3xl">
                    Gửi lời nhắn cho HauShop
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-medium text-red-500">
                  <Icon icon="lucide:clock" />
                  Trả lời qua Email / SĐT
                </span>
              </div>

              {success && (
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700 animate-fade-in">
                  <Icon icon="lucide:check-circle-2" className="shrink-0 text-xl" />
                  <span>Cảm ơn bạn! HauShop đã ghi nhận lời nhắn và sẽ liên hệ lại sớm nhất.</span>
                </div>
              )}

              {/* Quick topic chips */}
              <div className="mt-6">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-lightText">
                  Chọn nhanh chủ đề
                </p>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_PRESETS.map((topic) => {
                    const active = formData.subject === topic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, subject: topic }))}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-gray-200 bg-[#f7f5f2] text-primeColor hover:border-red-300 hover:bg-red-50 hover:text-red-500'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primeColor">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-primeColor placeholder:text-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primeColor">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="name@example.com"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-primeColor placeholder:text-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primeColor">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="09xx xxx xxx"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-primeColor placeholder:text-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primeColor">
                      Chủ đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Chọn ở trên hoặc nhập chủ đề"
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-primeColor placeholder:text-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primeColor">
                    Nội dung chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Chia sẻ mẫu áo bạn quan tâm, số lượng dự kiến, chất liệu hoặc yêu cầu in/thêu..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm text-primeColor placeholder:text-gray-400 outline-none transition-all focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-lightText">
                    Nếu bạn đã gửi yêu cầu báo giá, vui lòng kèm mã RFQ để tư vấn viên tra cứu nhanh hơn.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-500 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {loading ? (
                      <>
                        <Icon icon="lucide:loader-circle" className="animate-spin text-lg" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        Gửi yêu cầu
                        <Icon icon="lucide:send-horizontal" className="text-base" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right column: Studio info + FAQ */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Location & Working hours card */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                      Điểm liên hệ trực tiếp
                    </p>
                    <h3 className="mt-2 font-titleFont text-xl font-bold text-primeColor">
                      HauShop Studio — HanuUniversity
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                    <Icon icon="lucide:map-pinned" className="text-xl" />
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-xl bg-[#f7f5f2] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lightText">Thứ 2 – Thứ 6</span>
                    <span className="font-semibold text-primeColor">08:00 – 22:00</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-gray-200/70 pt-3">
                    <span className="text-lightText">Thứ 7 – Chủ nhật</span>
                    <span className="font-semibold text-primeColor">09:00 – 21:00</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="https://maps.google.com/?q=Hanoi+University"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500 bg-red-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-red-600 hover:bg-red-600"
                  >
                    <Icon icon="lucide:navigation" className="text-sm" />
                    Mở bản đồ
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopy('studio-email', 'haucter2k5@gmail.com')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-primeColor transition-colors hover:border-red-400 hover:text-red-500"
                  >
                    <Icon icon={copiedKey === 'studio-email' ? 'lucide:check' : 'lucide:mail'} />
                    {copiedKey === 'studio-email' ? 'Đã chép email' : 'Chép Email'}
                  </button>
                </div>
              </div>

              {/* Interactive FAQ Accordion */}
              <div className="flex-1 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                  Câu hỏi thường gặp
                </p>
                <h3 className="mt-2 font-titleFont text-xl font-bold text-primeColor">
                  Giải đáp nhanh trước khi gửi
                </h3>

                <div className="mt-5 divide-y divide-gray-100">
                  {FAQ_ITEMS.map((item, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div key={item.q} className="py-3.5 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => setOpenFaq((curr) => (curr === idx ? null : idx))}
                          className="flex w-full items-start justify-between gap-3 text-left"
                        >
                          <span className="text-sm font-semibold text-primeColor transition-colors hover:text-red-500">
                            {item.q}
                          </span>
                          <Icon
                            icon="lucide:chevron-down"
                            className={`mt-0.5 shrink-0 text-lightText transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-red-500' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <p className="mt-2.5 text-xs leading-relaxed text-lightText">
                            {item.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support Pillars */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {supportPillars.map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-gray-200/80 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors group-hover:bg-red-500 group-hover:text-white">
                  <Icon icon={item.icon} className="text-2xl" />
                </div>
                <h3 className="mt-4 font-titleFont text-lg font-bold text-primeColor">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-lightText">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;
