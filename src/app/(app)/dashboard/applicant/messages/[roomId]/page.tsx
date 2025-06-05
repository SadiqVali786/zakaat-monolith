/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-floating-promises */
"use client";

import { api } from "@/trpc/react";
import { MessageBar } from "./_components/message-bar";
import { MessageContainer } from "./_components/message-container";
import { useChatStore } from "@/store/chat-store";
import { useEffect } from "react";
import { DifferentTypesOfWebSocketEvent } from "@/types/ws-messages-events.type";
import { useSession } from "next-auth/react";

export default function DonorMessagesRoomPage() {
  const store = useChatStore();
  const { data: session } = useSession();
  const messages = api.message.getRooms
    .useQuery()
    .data?.find((room) => room.roomId === store.currentRoomId)?.messages;
  const sendMessageSeenMutation = api.message.sendMessageSeen.useMutation();

  useEffect(() => {
    const initializeMessages = async () => {
      if (!store.currentRoomId || !session?.user.id) return;
      sendMessageSeenMutation.mutate({
        channel: store.currentRoomId,
        event: DifferentTypesOfWebSocketEvent.Seen,
        payload: { roomId: store.currentRoomId, userId: session?.user.id },
      });
    };
    initializeMessages();
  }, [store.currentRoomId, session?.user.id]);

  // render date in between the messages if the date is different from the previous message
  const newMessages = messages?.map((message, index) => {
    if (index === 0) {
      return { ...message, newDate: new Date(message.sentAt).toDateString() };
    }
    if (
      new Date(message.sentAt).getDate() !==
      new Date(messages[index - 1]!.sentAt).getDate()
    ) {
      return { ...message, newDate: new Date(message.sentAt).toDateString() };
    }
    return { ...message, newDate: null };
  });

  return (
    <div className="mb-8 flex h-full w-full flex-col gap-y-8 px-4">
      <MessageContainer messages={newMessages} />
      <MessageBar />
    </div>
  );
}
