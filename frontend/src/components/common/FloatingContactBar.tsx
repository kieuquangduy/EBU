import { Icon } from "@iconify/react";
import { useShopContact } from "../../hooks/useShopContact";
import { buildTelUrl, buildZaloUrl } from "../../services/shopContactService";

export default function FloatingContactBar() {
  const { data: contact } = useShopContact();

  if (!contact) return null;

  const telUrl = buildTelUrl(contact.hotline);
  const zaloUrl = buildZaloUrl(contact.zaloPhone);
  const mailUrl = contact.email?.trim() ? `mailto:${contact.email.trim()}` : null;
  const messengerUrl = contact.messengerLink?.trim() || null;

  if (!telUrl && !zaloUrl && !mailUrl && !messengerUrl) {
    return null;
  }

  return (
    <aside
      aria-label="Kênh liên hệ nhanh"
      className="fixed right-3 top-1/2 z-[75] flex -translate-y-1/2 flex-col gap-2.5 sm:right-5"
    >
      {telUrl && (
        <a
          href={telUrl}
          title={`Gọi hotline ${contact.hotline}`}
          aria-label={`Gọi hotline ${contact.hotline}`}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lg transition hover:scale-105 hover:brightness-105 sm:h-12 sm:w-12"
        >
          <Icon icon="mdi:phone" width={22} />
          <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 sm:block">
            Hotline: {contact.hotline}
          </span>
        </a>
      )}

      {zaloUrl && (
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Tư vấn qua Zalo"
          aria-label="Tư vấn qua Zalo"
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-[#0068ff] text-white shadow-lg transition hover:scale-105 hover:brightness-105 sm:h-12 sm:w-12"
        >
          <span className="text-[11px] font-extrabold tracking-tight">Zalo</span>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 sm:block">
            Tư vấn qua Zalo
          </span>
        </a>
      )}

      {mailUrl && (
        <a
          href={mailUrl}
          title={`Gửi email tới ${contact.email}`}
          aria-label={`Gửi email tới ${contact.email}`}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-[#f59e0b] text-white shadow-lg transition hover:scale-105 hover:brightness-105 sm:h-12 sm:w-12"
        >
          <Icon icon="mdi:email-outline" width={22} />
          <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 sm:block">
            {contact.email}
          </span>
        </a>
      )}

      {messengerUrl && (
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Nhắn tin qua Messenger"
          aria-label="Nhắn tin qua Messenger"
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#00b2ff] via-[#006aff] to-[#a033ff] text-white shadow-lg transition hover:scale-105 hover:brightness-105 sm:h-12 sm:w-12"
        >
          <Icon icon="mdi:facebook-messenger" width={22} />
          <span className="pointer-events-none absolute right-full mr-2.5 hidden whitespace-nowrap rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100 sm:block">
            Messenger
          </span>
        </a>
      )}
    </aside>
  );
}

