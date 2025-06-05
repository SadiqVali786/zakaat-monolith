import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { UserRole } from "@prisma/client";
import { DifferentMessageStatus } from "@/lib/types";
import { pusherServer } from "@/lib/pusher";
import { DifferentTypesOfWebSocketEvent } from "@/types/ws-messages-events.type";

export const messageRouter = createTRPCRouter({
  getRoomIds: protectedProcedure.query(async ({ ctx, input, signal }) => {
    const rooms = await ctx.db.room.findMany({
      where: { participantIds: { has: ctx.session.user.id } },
      select: { id: true },
    });
    const roomIds = rooms.map((room) => room.id);
    return roomIds;
  }),

  getRooms: protectedProcedure.query(async ({ ctx, input, signal }) => {
    const rawRooms = await ctx.db.room.findMany({
      where: { participantIds: { has: ctx.session.user.id } },
      select: {
        id: true,
        chats: {
          select: {
            id: true,
            content: true,
            sentAt: true,
            status: true,
            senderId: true,
          },
        },
        participants: {
          where: {
            role:
              ctx.session.user.role === UserRole.APPLICANT
                ? UserRole.DONOR
                : UserRole.APPLICANT,
          },
          select: {
            id: true,
            name: true,
            image: true,
            selfie: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        _count: {
          select: {
            chats: { where: { status: DifferentMessageStatus.Received } },
          },
        },
      },
    });

    const rooms = rawRooms.map((room) => ({
      roomId: room.id,
      roomName: room.participants[0]?.name ?? "",
      image: room.participants[0]?.selfie ?? room.participants[0]?.image ?? "",
      unreadMessages: room._count.chats,
      messages: room.chats.map((chat) => ({
        ...chat,
        status: chat.status as DifferentMessageStatus,
      })),
      participant: {
        id: room.participants[0]?.id ?? "",
        isOnline: room.participants[0]?.isOnline ?? false,
        lastSeen: room.participants[0]?.lastSeen,
        isTyping: false,
      },
    }));

    return rooms;
  }),

  sendChatMessage: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        event: z.literal(DifferentTypesOfWebSocketEvent.Chating),
        payload: z.object({
          roomId: z.string(),
          content: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input: { channel, event, payload }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      const newMessage = await ctx.db.message.create({
        data: {
          roomId: payload.roomId,
          senderId: ctx.session.user.id,
          content: payload.content,
        },
      });
      const response = await pusherServer.trigger(channel, event, {
        roomId: payload.roomId,
        userId: ctx.session.user.id,
        messageId: newMessage.id,
        content: payload.content,
      });
      return newMessage;
    }),

  createNewRoom: protectedProcedure
    .input(z.object({ applicantId: z.string() }))
    .mutation(async ({ ctx, input: { applicantId }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      const applicant = await ctx.db.user.findUnique({
        where: { id: applicantId },
      });
      if (!applicant) return;
      const newRoom = await ctx.db.room.create({
        data: { participantIds: [ctx.session.user.id, applicantId] },
      });

      const temp = {
        roomId: newRoom.id,
        roomName: applicant.name,
        image: applicant.selfie ?? applicant.image,
        unreadMessages: 0,
        messages: [],
        participant: {
          id: applicantId,
          isOnline: applicant.isOnline,
          lastSeen: applicant.lastSeen,
          isTyping: false,
        },
      };
      await pusherServer.trigger(
        "Create-Room",
        DifferentTypesOfWebSocketEvent.CreateRoom,
        temp,
      );
      return temp;
    }),

  sendMessageRecieved: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        event: z.literal(DifferentTypesOfWebSocketEvent.Received),
        payload: z.object({ roomId: z.string(), messageId: z.string() }),
      }),
    )
    .mutation(async ({ ctx, input: { channel, event, payload }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      const updatedMessage = await ctx.db.message.update({
        where: { id: payload.messageId },
        data: { status: DifferentMessageStatus.Received },
      });
      await pusherServer.trigger(channel, event, {
        roomId: payload.roomId,
        messageId: payload.messageId,
        userId: ctx.session.user.id,
      });
      return updatedMessage;
    }),

  sendMessageSeen: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        event: z.literal(DifferentTypesOfWebSocketEvent.Seen),
        payload: z.object({ roomId: z.string(), userId: z.string() }),
      }),
    )
    .mutation(async ({ ctx, input: { channel, event, payload }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      const updatedMessages = await ctx.db.message.updateMany({
        where: {
          roomId: payload.roomId,
          senderId: { not: ctx.session.user.id },
        },
        data: { status: DifferentMessageStatus.Seen },
      });
      await pusherServer.trigger(channel, event, {
        roomId: payload.roomId,
        userId: ctx.session.user.id,
      });
      return { roomId: payload.roomId, userId: payload.userId };
    }),

  sendUserOffline: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        event: z.literal(DifferentTypesOfWebSocketEvent.UserOffline),
        payload: z.object({ roomId: z.string() }),
      }),
    )
    .mutation(async ({ ctx, input: { channel, event, payload }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      await pusherServer.trigger(channel, event, {
        roomId: payload.roomId,
        userId: ctx.session.user.id,
      });
    }),

  sendUserOnline: protectedProcedure
    .input(
      z.object({
        channel: z.string(),
        event: z.literal(DifferentTypesOfWebSocketEvent.UserOnline),
        payload: z.object({ roomId: z.string() }),
      }),
    )
    .mutation(async ({ ctx, input: { channel, event, payload }, signal }) => {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { lastSeen: new Date(), isOnline: true },
      });
      await pusherServer.trigger(channel, event, {
        roomId: payload.roomId,
        userId: ctx.session.user.id,
      });
    }),
});
