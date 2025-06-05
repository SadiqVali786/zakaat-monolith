/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import Link from "next/link";
import { BiCheckDouble } from "react-icons/bi";
import { useSession } from "next-auth/react";
import { DifferentMessageStatus } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { APP_PATHS } from "@/config/path.config";
import { api } from "@/trpc/react";
import { UserRole } from "@prisma/client";
import { useEffect } from "react";

const DonorMessagesPage = () => {
  const router = useRouter();

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user.role !== UserRole.DONOR) {
      if (session?.user.role === UserRole.APPLICANT)
        router.push(APP_PATHS.APPLICANT_DASHBOARD_MESSAGES);
      else if (session?.user.role === UserRole.VERIFIER)
        router.push(APP_PATHS.VERIFIER_DASHBOARD_SEARCH_APPLICANT);
      else router.push(APP_PATHS.HOME);
    }
  }, [status]);

  const rooms = api.message.getRooms.useQuery();

  return (
    <div className="flex h-full flex-col">
      {rooms.data?.map((room) => (
        <Link
          key={room.roomId}
          href={`/dashboard/donor/messages/${room.roomId}`}
          className="border-neutral-11 mb-4 flex w-full items-center justify-center gap-4 border-b px-4 pb-4"
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={room.image ?? ""} />
            <AvatarFallback>{room.roomName?.charAt(0) ?? ""}</AvatarFallback>
          </Avatar>
          <div className="flex w-full justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {room.participant.isOnline ? (
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                ) : (
                  <div className="bg-neutral-7 h-3 w-3 rounded-full" />
                )}
                <h1 className="text-lg font-bold">{room.roomName}</h1>
              </div>

              <div className="flex items-center gap-2">
                {room.messages.at(-1)?.senderId === session?.user.id && (
                  <>
                    {room.messages.at(-1)?.status ===
                    DifferentMessageStatus.Received ? (
                      <BiCheckDouble className="text-neutral-7 h-6 w-6" />
                    ) : room.messages.at(-1)?.status ===
                      DifferentMessageStatus.Seen ? (
                      <BiCheckDouble className="text-brand-blue h-6 w-6" />
                    ) : room.messages.at(-1)?.status ===
                      DifferentMessageStatus.Sent ? (
                      <Check className="text-neutral-7 h-4 w-4" />
                    ) : null}
                  </>
                )}
                <p className="text-neutral-7 text-sm">
                  {room.messages.at(-1)?.content}
                </p>
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-blue-50">
                {formatRelativeDate(
                  new Date(room.messages.at(-1)?.sentAt ?? new Date()),
                )}
              </p>
              {room.messages.at(-1)?.senderId !== session?.user.id &&
                room.unreadMessages > 0 && (
                  <p className="bg-brand-blue mx-auto mt-1 w-fit rounded-full px-2 py-0.5 text-center text-sm text-blue-50">
                    {room.unreadMessages}
                  </p>
                )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default DonorMessagesPage;
