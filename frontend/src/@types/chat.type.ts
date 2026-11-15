export type ChatMessageType = "Text" | "Image" | "System";

export interface ChatAttachmentDto {
  url: string;
  name: string;
  contentType?: string | null;
  sizeBytes?: number | null;
}

export interface ChatProductCardDto {
  productId: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  basePrice: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  minOrderQuantity: number;
}

export interface ChatMessageDto {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderRole: string;
  message: string;
  messageType: ChatMessageType;
  attachments?: ChatAttachmentDto[] | null;
  productCard?: ChatProductCardDto | null;
  isRead: boolean;
  readAt: string | null;
  created: string;
}

export interface ChatRoomDto {
  id: string;
  name: string;
  type: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string | null;
  customerPhone?: string | null;
  customerIsOnline?: boolean;
  customerLastSeen?: string | null;
  assignedToId?: string | null;
  productId?: string | null;
  productName?: string | null;
  productSlug?: string | null;
  quoteRequestId?: string | null;
  quoteCode?: string | null;
  status: string;
  priority: string;
  unreadCount: number;
  lastMessage?: ChatMessageDto | null;
  created: string;
  closedAt?: string | null;
}

export interface StartSupportChatDto {
  subject?: string;
  productId?: string | null;
  quoteRequestId?: string | null;
  initialMessage?: string | null;
}

export interface SendChatMessageDto {
  chatRoomId: string;
  message: string;
  messageType?: ChatMessageType;
  attachments?: ChatAttachmentDto[];
}

export interface MessagesReadEventDto {
  chatRoomId: string;
  readerId: string;
}

export interface AdminPresenceDto {
  isAdminOnline: boolean;
  onlineAdminCount: number;
}

export interface SupportAvailabilityDto extends AdminPresenceDto {
  unreadCount: number;
  workingHours?: string | null;
}
