/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher";
import { APP_PATHS } from "@/config/path.config";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DifferentTypesOfWebSocketEvent } from "@/types/ws-messages-events.type";
import { useSession } from "next-auth/react";

export const useWebSocket = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const roomIds = api.message.getRoomIds.useQuery();
  const sendUserOfflineMutation = api.message.sendUserOffline.useMutation({
    onSuccess: async () => {
      utils.message.getRooms.invalidate();
    },
  });
  const sendUserOnlineMutation = api.message.sendUserOnline.useMutation({
    onSuccess: async () => {
      utils.message.getRooms.invalidate();
    },
  });
  const sendMessageRecievedMutation =
    api.message.sendMessageRecieved.useMutation({
      onSuccess: async (updatedMessage) => {
        utils.message.getRooms.invalidate();
      },
    });
  const sendMessageSeenMutation = api.message.sendMessageSeen.useMutation({
    onSuccess: async (hi) => {
      utils.message.getRooms.invalidate();
    },
  });
  const utils = api.useUtils();

  const params = useParams<{ roomId: string }>();

  useEffect(() => {
    if (!roomIds.data || status !== "authenticated") return;
    const connect = async () => {
      roomIds.data?.forEach((roomId) => {
        const channel = pusherClient.subscribe(roomId);
        channel.bind(
          DifferentTypesOfWebSocketEvent.Chating,
          (payload: {
            roomId: string;
            userId: string;
            messageId: string;
            content: string;
          }) => {
            if (payload.userId === session?.user.id) return;
            if (params.roomId === roomId) {
              sendMessageSeenMutation.mutate({
                channel: roomId,
                event: DifferentTypesOfWebSocketEvent.Seen,
                payload: { roomId: payload.roomId, userId: payload.userId },
              });
            } else {
              sendMessageRecievedMutation.mutate({
                channel: roomId,
                event: DifferentTypesOfWebSocketEvent.Received,
                payload: {
                  roomId: payload.roomId,
                  messageId: payload.messageId,
                },
              });
            }
          },
        );
        channel.bind(
          DifferentTypesOfWebSocketEvent.Received,
          (payload: { roomId: string; messageId: string; userId: string }) => {
            if (payload.userId === session?.user.id) return;
            utils.message.getRooms.invalidate();
          },
        );
        channel.bind(
          DifferentTypesOfWebSocketEvent.Seen,
          (payload: { roomId: string; userId: string }) => {
            if (payload.userId === session?.user.id) return;
            utils.message.getRooms.invalidate();
          },
        );
        channel.bind(
          DifferentTypesOfWebSocketEvent.UserOnline,
          (payload: { roomId: string; userId: string }) => {
            if (payload.userId === session?.user.id) return;
            utils.message.getRooms.invalidate();
          },
        );
        channel.bind(
          DifferentTypesOfWebSocketEvent.UserOffline,
          (payload: { roomId: string; userId: string }) => {
            if (payload.userId === session?.user.id) return;
            utils.message.getRooms.invalidate();
          },
        );
        sendUserOnlineMutation.mutate({
          channel: roomId,
          event: DifferentTypesOfWebSocketEvent.UserOnline,
          payload: { roomId },
        });
      });

      const channel = pusherClient.subscribe("Create-Room");
      channel.bind(
        DifferentTypesOfWebSocketEvent.CreateRoom,
        (payload: {
          roomId: string;
          roomName: string;
          image: string;
          unreadMessages: number;
          messages: never[];
          participant: {
            id: string;
            isOnline: boolean;
            lastSeen: Date | null;
            isTyping: boolean;
          };
        }) => {
          if (payload.participant.id !== session?.user.id) return;
          utils.message.getRooms.invalidate();
          pusherClient.subscribe(payload.roomId);
          router.push(`${APP_PATHS.APPLICANT_DASHBOARD_MESSAGES}`);
        },
      );
    };

    connect();

    return () => {
      roomIds.data?.forEach((roomId) => {
        sendUserOfflineMutation.mutate({
          channel: roomId,
          event: DifferentTypesOfWebSocketEvent.UserOffline,
          payload: { roomId },
        });
        pusherClient.unsubscribe(roomId);
      });
    };
  }, [roomIds.data, session?.user.id, params.roomId, status]);
};
