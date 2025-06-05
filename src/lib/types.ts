import type WebSocket from "ws";
import type {
  WebSocketsServerMessagesSchema,
  WebSocketsServerResponsesSchema,
  WebRTCSignallingServerMessagesSchema,
  WorkerMessagesSchema,
  WorkerResponsesSchema,
} from "./validators";
import type { z } from "zod";

export enum UserRole {
  Admin = "ADMIN",
  Verifier = "VERIFIER",
  Donor = "DONOR",
  Applicant = "APPLICANT",
}

export enum ApplicationStatus {
  Created = "CREATED",
  Donated = "DONATED",
  Verified = "VERIFIED",
  Bookmarked = "BOOKMARKED",
}

export enum UserStatus {
  Online = "ONLINE",
  Offline = "OFFLINE",
}

export enum UserActivity {
  Typing = "TYPING",
  Chatting = "CHATTING",
  OnboardingEmail = "ONBOARDING_EMAIL",
}

export enum DifferentMessageStatus {
  Received = "RECEIVED",
  Seen = "SEEN",
  Sent = "SENT",
}

export enum DifferentRoomMessages {
  JoinRooms = "JOIN_ROOMS",
  // LeaveRooms = "LEAVE_ROOMS",
  CreateRoom = "CREATE_ROOM",
}

export enum DifferentWebRTCSignallingServerMessages {
  Consent = "CONSENT",
  Permission = "PERMISSION",
  Busy = "BUSY",
  Error = "ERROR",
}

export type Client = {
  userId: string;
  name: string;
  email: string;
  image: string;
  role: UserRole;
};

export type ExtendedWebSocket = WebSocket & {
  userId: string;
  email: string;
  role: UserRole;
  image: string;
  name: string;
};

export type TokenPayloadType = {
  id: string;
  name: string;
  email: string;
  image: string;
  role: UserRole;
  exp: number;
  iat: number;
};

export type WorkerMessages = z.infer<typeof WorkerMessagesSchema>;
export type WorkerResponses = z.infer<typeof WorkerResponsesSchema>;

export type WebRTCSignallingServerMessages = z.infer<
  typeof WebRTCSignallingServerMessagesSchema
>;

export type WebSocketsServerMessages = z.infer<
  typeof WebSocketsServerMessagesSchema
>;
export type WebSocketsServerResponses = z.infer<
  typeof WebSocketsServerResponsesSchema
>;
