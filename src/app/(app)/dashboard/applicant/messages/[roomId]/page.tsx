/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { MessageBar } from "./_components/message-bar";
import { MessageContainer } from "./_components/message-container";
import { useChatStore } from "@/store/chat-store";
import { useEffect } from "react";
import { getMessagesOfRoom } from "@/actions/message.actions";
import { api } from "@/trpc/react";

export default function DonorMessagesRoomPage() {
  const store = useChatStore();
  const messages = api
    .useUtils()
    .message.getMessagesOfRoom.getData({ roomId: store.currentRoomId! })
    ?.find((room) => room.roomId === store.currentRoomId)?.messages;

  useEffect(() => {
    const initializeMessages = async () => {
      if (!store.currentRoomId) return;
      // const messages = await getMessagesOfRoom(store.currentRoomId);
      const messages = api.message.getMessagesOfRoom.useQuery({
        roomId: store.currentRoomId,
      });
      store.resetUnreadMessages();
    };
    initializeMessages();
  }, [store.currentRoomId]);

  useEffect(() => {
    store.sendMessageSeenStatus();
  }, []);

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
