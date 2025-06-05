import crypto from "crypto";
import { env } from "@/env";
import { db } from "@/server/db";
import {
  ApplicationStatus,
  UserRole,
  type PaymentStatus,
} from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

// Helper function to map Razorpay status to our PaymentStatus enum
function mapRazorpayStatus(razorpayStatus: string): PaymentStatus {
  switch (razorpayStatus.toLowerCase()) {
    case "success":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "created":
    case "initiated":
    case "pending":
      return "PENDING";
    default:
      return "PENDING";
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json({ msg: "Missing signature" }, { status: 400 });
    }

    const bodyBuffer = await req.text();
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyBuffer)
      .digest("hex");

    const isValid = expectedSignature === signature;

    if (!isValid) {
      return NextResponse.json({ msg: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyBuffer);
    const paymentLinkId = event?.payload?.payment_link?.entity?.id;

    if (paymentLinkId) {
      const razorpayStatus = event?.payload?.payment_link?.entity?.status;
      const status = mapRazorpayStatus(razorpayStatus);
      const { donorId, applicantId } =
        event?.payload?.payment_link?.entity?.notes ?? {};

      if (donorId && applicantId) {
        await db.$transaction(async (tx) => {
          await tx.application.update({
            where: { authorId: applicantId },
            data: {
              donorUserId: donorId,
              status: ApplicationStatus.DONATED,
            },
          });
          await tx.razorpayTransaction.update({
            where: { paymentLinkId },
            data: {
              status,
              updatedAt: new Date(),
            },
          });
          await tx.user.update({
            where: { id: applicantId },
            data: {
              role: UserRole.APPLICANT,
            },
          });
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { msg: "Webhook processing failed" },
      { status: 500 },
    );
  }
};
