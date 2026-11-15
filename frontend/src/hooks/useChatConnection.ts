import * as signalR from "@microsoft/signalr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdminPresenceDto,
  ChatMessageDto,
  MessagesReadEventDto,
  SendChatMessageDto,
} from "../@types/chat.type";
import { SIGNALR_HUB_URL } from "../lib/env";

export function useChatConnection({
  enabled,
  onMessage,
  onRoomUpdated,
  onMessagesRead,
  onAdminPresenceChanged,
}: {
  enabled: boolean;
  onMessage?: (message: ChatMessageDto) => void;
  onRoomUpdated?: (roomId: string) => void;
  onMessagesRead?: (event: MessagesReadEventDto) => void;
  onAdminPresenceChanged?: (event: AdminPresenceDto) => void;
}) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const onMessageRef = useRef<typeof onMessage>(onMessage);
  const onRoomUpdatedRef = useRef<typeof onRoomUpdated>(onRoomUpdated);
  const onMessagesReadRef = useRef<typeof onMessagesRead>(onMessagesRead);
  const onAdminPresenceChangedRef =
    useRef<typeof onAdminPresenceChanged>(onAdminPresenceChanged);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected">("idle");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onRoomUpdatedRef.current = onRoomUpdated;
  }, [onRoomUpdated]);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  useEffect(() => {
    onAdminPresenceChangedRef.current = onAdminPresenceChanged;
  }, [onAdminPresenceChanged]);

  const connection = useMemo(() => {
    if (!enabled) return null;

    return new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        withCredentials: true,
        accessTokenFactory: () => localStorage.getItem("_at") || "",
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();
  }, [enabled]);

  useEffect(() => {
    if (!connection) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    connectionRef.current = connection;

    connection.on("ReceiveMessage", (message: ChatMessageDto) => onMessageRef.current?.(message));
    connection.on("RoomUpdated", (roomId: string) => onRoomUpdatedRef.current?.(roomId));
    connection.on("MessagesRead", (payload: MessagesReadEventDto) => onMessagesReadRef.current?.(payload));
    connection.on("AdminPresenceChanged", (payload: AdminPresenceDto) =>
      onAdminPresenceChangedRef.current?.(payload)
    );
    connection.onreconnecting(() => setStatus("connecting"));
    connection.onreconnected(() => setStatus("connected"));
    connection.onclose(() => setStatus("disconnected"));

    const start = async () => {
      try {
        setStatus("connecting");
        await connection.start();
        if (!cancelled) setStatus("connected");
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    };

    void start();

    return () => {
      cancelled = true;
      connection.off("ReceiveMessage");
      connection.off("RoomUpdated");
      connection.off("MessagesRead");
      connection.off("AdminPresenceChanged");
      void connection.stop();
      if (connectionRef.current === connection) {
        connectionRef.current = null;
      }
    };
  }, [connection]);

  const joinRoom = useCallback(async (roomId: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("JoinRoom", roomId);
  }, []);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("LeaveRoom", roomId);
  }, []);

  const sendMessage = useCallback(async (dto: SendChatMessageDto) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Chat connection is not ready.");
    }
    await connectionRef.current.invoke("SendMessage", {
      chatRoomId: dto.chatRoomId,
      message: dto.message,
      messageType: dto.messageType ?? "Text",
      attachmentUrls: dto.attachmentUrls ?? [],
      productId: dto.productId ?? null,
    });
  }, []);

  const sendAiMessage = useCallback(async (dto: SendChatMessageDto) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Chat connection is not ready.");
    }
    await connectionRef.current.invoke("SendAiMessage", {
      chatRoomId: dto.chatRoomId,
      message: dto.message,
      messageType: dto.messageType ?? "Text",
    });
  }, []);

  const markAsRead = useCallback(async (roomId: string) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) return;
    await connectionRef.current.invoke("MarkAsRead", roomId);
  }, []);

  return { status, joinRoom, leaveRoom, sendMessage, sendAiMessage, markAsRead };
}
