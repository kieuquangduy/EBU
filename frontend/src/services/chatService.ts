import type {
  ChatMessageDto,
  ChatRoomDto,
  StartSupportChatDto,
  SupportAvailabilityDto,
} from "../@types/chat.type";
import { http } from "../lib/http";

export const chatService = {
  async startSupportChat(input?: string | StartSupportChatDto): Promise<ChatRoomDto> {
    const payload: StartSupportChatDto =
      typeof input === "string" || input === undefined ? { subject: input } : input;
    return http.post<ChatRoomDto>("/chat/support/start", payload);
  },

  async startAiChat(): Promise<ChatRoomDto> {
    return http.post<ChatRoomDto>("/chat/ai/start");
  },

  async getSupportAvailability(signal?: AbortSignal): Promise<SupportAvailabilityDto> {
    return http.get<SupportAvailabilityDto>("/chat/support/availability", { signal });
  },

  async getRooms(): Promise<ChatRoomDto[]> {
    return http.get<ChatRoomDto[]>("/chat/rooms");
  },

  async getMessages(roomId: string, take = 50): Promise<ChatMessageDto[]> {
    return http.get<ChatMessageDto[]>(`/chat/rooms/${roomId}/messages`, {
      params: { take },
    });
  },

  async markAsRead(roomId: string): Promise<void> {
    await http.post(`/chat/rooms/${roomId}/read`);
  },
};
