"use client";

import { PlaceholdersAndVanishInput } from "@/components/aceternityui/placeholders-and-vanish-input";
import { useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useChatStore } from "@/store/chat-store";
import { DifferentTypesOfWebSocketEvent } from "@/types/ws-messages-events.type";

export function MessageBar() {
  const { data: session } = useSession();
  const { currentRoomId } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();
  const sendMessageMutation = api.message.sendChatMessage.useMutation({
    onSuccess: async () => {
      await utils.message.getRooms.invalidate();
    },
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100); // Small delay to ensure DOM updates
  }, []);

  scrollToBottom();

  const handleSendMessage = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const content = e.currentTarget.querySelector("input")?.value; // Get the value of the input
      if (!content || content.trim() === "" || !session?.user.id) return;
      sendMessageMutation.mutate({
        channel: currentRoomId!,
        event: DifferentTypesOfWebSocketEvent.Chating,
        payload: { roomId: currentRoomId!, content: content.trim() },
      });
    },
    [session?.user.id, currentRoomId, sendMessageMutation],
  );

  return (
    <>
      <PlaceholdersAndVanishInput
        placeholders={["What's on your mind? Let them know."]}
        onChange={() => ({})}
        onSubmit={handleSendMessage}
      />
      <div ref={messagesEndRef} />
    </>
  );
}
