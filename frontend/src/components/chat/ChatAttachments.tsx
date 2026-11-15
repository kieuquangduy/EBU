import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import type { ChatAttachmentDto } from "../../@types/chat.type";
import { formatChatFileSize } from "../../lib/chatAttachments";
import { chatService } from "../../services/chatService";

function ChatAttachment({ attachment, mine }: { attachment: ChatAttachmentDto; mine: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = attachment.contentType?.startsWith("image/") ?? false;

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let objectUrl: string | null = null;

    void chatService.getAttachmentBlob(attachment.url).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url, isImage]);

  const download = async () => {
    const blob = await chatService.getAttachmentBlob(attachment.url);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (isImage && previewUrl) {
    return (
      <button type="button" onClick={() => void download()} className="block overflow-hidden rounded-xl">
        <img
          src={previewUrl}
          alt={attachment.name}
          className="max-h-56 w-full min-w-40 object-cover transition hover:opacity-90"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      className={`flex w-full min-w-48 items-center gap-2 rounded-xl p-2 text-left transition ${
        mine ? "bg-white/15 hover:bg-white/25" : "bg-slate-100 hover:bg-slate-200"
      }`}
    >
      <Icon icon={isImage ? "mdi:image-outline" : "mdi:file-document-outline"} width={24} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{attachment.name}</span>
        <span className={`block text-[10px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
          {formatChatFileSize(attachment.sizeBytes) || "Tệp đính kèm"}
        </span>
      </span>
      <Icon icon="mdi:download" width={18} />
    </button>
  );
}

export function ChatAttachmentList({
  attachments,
  mine,
}: {
  attachments?: ChatAttachmentDto[] | null;
  mine: boolean;
}) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {attachments.map((attachment) => (
        <ChatAttachment key={attachment.url} attachment={attachment} mine={mine} />
      ))}
    </div>
  );
}
