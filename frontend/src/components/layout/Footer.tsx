import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";
import { useShopContact } from "../../hooks/useShopContact";
import { ROUTES } from "../../lib/routes";
import { buildTelUrl, buildZaloUrl } from "../../services/shopContactService";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: contact } = useShopContact();

  const zaloUrl = buildZaloUrl(contact?.zaloPhone);
  const telUrl = buildTelUrl(contact?.hotline);

  const quickLinks = [
    { title: "Hồ sơ của tôi", to: ROUTES.PROFILE },
    { title: "Đăng nhập / Đăng ký", to: ROUTES.SIGN_IN },
    { title: "Yêu cầu báo giá", to: ROUTES.QUOTES },
    { title: "Yêu thích", to: ROUTES.WISHLIST },
    { title: "Sản phẩm", to: ROUTES.SHOP },
  ];

  const policyLinks = [
    { title: "Về HauShop", to: "/about-us" },
    { title: "Liên hệ & Tư vấn", to: "/contact-us" },
    { title: "Mẫu áo Custom", to: ROUTES.SHOP },
    { title: "Chat trực tuyến", to: "/?chat=support" },
  ];

  return (
    <footer className="bg-black text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12 pb-12 border-b border-white/40">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-black mb-4 tracking-[0.14em]">HAUSHOP</h3>
              <h4 className="text-xl font-semibold mb-3">Đặt áo Custom theo yêu cầu</h4>
              <p className="text-sm text-white/75 leading-relaxed">
                Nhận thiết kế mockup miễn phí và báo giá tận xưởng cho áo lớp, áo CLB và đồng phục nhóm.
              </p>
            </div>

            <Link
              to={ROUTES.QUOTES}
              className="inline-flex items-center gap-2 rounded border border-white/60 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white hover:text-black"
            >
              <Icon icon="lucide:file-text" width={18} />
              Nhận báo giá ngay
            </Link>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-6">Liên hệ xưởng</h4>
            <div className="space-y-3 text-sm text-white/85">
              <p>Hanoi University Studio</p>
              {contact?.email && (
                <a href={`mailto:${contact.email}`} className="block hover:text-white transition-colors">
                  {contact.email}
                </a>
              )}
              {contact?.hotline && telUrl && (
                <a href={telUrl} className="block hover:text-white transition-colors">
                  Hotline: {contact.hotline}
                </a>
              )}
              {contact?.workingHours && (
                <p className="text-xs text-white/60">{contact.workingHours}</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-6">Tài khoản &amp; Báo giá</h4>
            <nav className="space-y-3.5 text-sm">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  to={link.to}
                  className="block text-white/85 hover:text-white transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-xl font-semibold mb-6">Liên kết nhanh</h4>
            <nav className="space-y-3.5 text-sm">
              {policyLinks.map((link) => (
                <Link
                  key={link.title}
                  to={link.to}
                  className="block text-white/85 hover:text-white transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-5">
            <div>
              <h4 className="text-xl font-semibold mb-3">Tư vấn trực tiếp</h4>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                Trao đổi chất liệu vải, kỹ thuật in/thêu và nhận báo giá chi tiết qua Zalo hoặc Chat nội bộ.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {zaloUrl && (
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0068ff] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-110"
                >
                  Zalo Tư vấn
                </a>
              )}
              {contact?.messengerLink && (
                <a
                  href={contact.messengerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <Icon icon="mdi:facebook-messenger" width={16} />
                  Messenger
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center text-white/60 text-sm">
          <span>Copyright HauShop {currentYear}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
