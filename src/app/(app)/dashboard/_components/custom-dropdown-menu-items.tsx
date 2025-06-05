/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { APP_PATHS } from "@/config/path.config";
import { useCallback } from "react";
import { toast } from "sonner";
import axios from "axios";
import { api } from "@/trpc/react";
import { DifferentTypesOfWebSocketEvent } from "@/types/ws-messages-events.type";
import { pusherClient, pusherServer } from "@/lib/pusher";
import { useDonorLocationStore } from "@/store/location-store";

type Props = {
  isItBookmark: boolean;
  applicantId: string;
  amount: number;
  upiId: string;
  applicationId: string;
};

type PaymentLinkResponse = {
  amount: number;
  currency: string;
  paymentLinkId: string;
  paymentLinkUrl: string;
  referenceId: string;
  upiId: string;
};
export const CustomDropdownMenuItems = ({
  isItBookmark,
  applicantId,
  amount,
  upiId,
  applicationId,
}: Props) => {
  const router = useRouter();
  const store = useDonorLocationStore();

  const unbookmarkMutation = api.application.unbookmark.useMutation({
    onSuccess: async () => {
      await api
        .useUtils()
        .application.infiniteApplicationsScrollFeed.invalidate({
          latitude: `${store.latitude}`,
          longitude: `${store.longitude}`,
        });
      await api.useUtils().application.infiniteApplicationsScrollFeed.refetch();
    },
  });

  const bookmarkMutation = api.application.bookmark.useMutation({
    onSuccess: async () => {
      await api
        .useUtils()
        .application.infiniteApplicationsScrollFeed.invalidate({
          latitude: `${store.latitude}`,
          longitude: `${store.longitude}`,
        });
      await api.useUtils().application.infiniteApplicationsScrollFeed.refetch();
    },
  });

  const { data: session, status } = useSession();

  const handlePayment = useCallback(async () => {
    try {
      if (status !== "authenticated") return;
      toast.loading("Creating payment link...");

      const response = (
        await axios.post(`/api/payment/razorpay/upi/create-link`, {
          applicantId,
          amount,
          upiId,
          donorId: session.user.id,
        })
      ).data as unknown as PaymentLinkResponse;

      toast.dismiss();
      toast.success("Payment link created successfully!");

      // Store reference ID for status checking
      localStorage.setItem("lastPaymentReference", response.paymentLinkUrl);

      // Open payment link in new window
      window.open(response.paymentLinkUrl, "_blank");
    } catch (error) {
      toast.dismiss();
      toast.error((error as Error)?.message || "Payment link creation failed");
    }
  }, [applicantId, amount, upiId, status]);

  const rooms = api.message.getRooms.useQuery();
  const createNewRoomMutation = api.message.createNewRoom.useMutation({
    onSuccess: async (newRoom) => {
      pusherClient.subscribe(newRoom!.roomId);
      await pusherServer.trigger(
        newRoom!.roomId,
        DifferentTypesOfWebSocketEvent.CreateRoom,
        JSON.stringify(newRoom),
      );
      await api.useUtils().message.getRooms.invalidate();
      router.push(`${APP_PATHS.DONOR_DASHBOARD_MESSAGES}/${newRoom?.roomId}`);
    },
  });

  if (!session) return null;

  return (
    <>
      <DropdownMenuItem
        className="hover:!bg-brand-dark"
        onClick={handlePayment}
      >
        Donate
      </DropdownMenuItem>
      <DropdownMenuItem
        className="hover:!bg-brand-dark"
        onClick={async () => {
          const room = rooms.data?.find(
            (room) => room.participant.id === applicantId,
          );
          if (room) {
            router.push(`${APP_PATHS.DONOR_DASHBOARD_MESSAGES}/${room.roomId}`);
          } else {
            createNewRoomMutation.mutate({ applicantId });
          }
        }}
      >
        Chat
      </DropdownMenuItem>
      <DropdownMenuItem
        className="hover:!bg-brand-dark"
        onClick={() =>
          isItBookmark
            ? unbookmarkMutation.mutate({ applicationId })
            : bookmarkMutation.mutate({ applicationId })
        }
      >
        {isItBookmark ? "Unbookmark" : "Bookmark"}
      </DropdownMenuItem>
    </>
  );
};
