/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { razorpay } from "@/lib/razorpay";
import { env } from "@/env";

export const paymentRouter = createTRPCRouter({
  createUPIPaymentLink: protectedProcedure
    .input(
      z.object({
        applicantId: z.string(),
        amount: z.number(),
        upiId: z.string(),
        donorId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx, signal }) => {
      const { amount, upiId, applicantId, donorId } = input;
      const reference = `${Date.now()}_${donorId}`;

      const paymentLinkData = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        accept_partial: false,
        description: `Donation to ${upiId}`,
        reference_id: reference,
        callback_url: `${env.NEXT_PUBLIC_BASE_URL}/razorpay-payment-status`,
        callback_method: "get",
        customer: {
          name: "Donor", // Required field
        },
        notes: {
          donorId,
          applicantId,
        },
        options: {
          checkout: {
            name: "Donation Payment",
            prefill: {
              method: "upi",
            },
          },
          upi: {
            vpa: upiId,
            flow: "collect",
          },
        },
      };

      const paymentLink = await new Promise<any>((resolve, reject) => {
        razorpay.paymentLink.create(paymentLinkData, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const transaction = await ctx.db.razorpayTransaction.create({
        data: {
          referenceId: reference,
          paymentLinkId: paymentLink.id,
          paymentLinkUrl: paymentLink.short_url,
          amount,
          currency: "INR",
          upiId,
          donorId,
          applicantId,
          paymentDescription: `Donation to ${upiId}`,
          status: "PENDING",
          metadata: {
            created_at: new Date(),
            platform: "razorpay",
            payment_type: "upi",
          },
        },
      });

      return {
        referenceId: transaction.referenceId,
        paymentLinkId: transaction.paymentLinkId,
        paymentLinkUrl: transaction.paymentLinkUrl,
        amount: transaction.amount,
        currency: transaction.currency,
        upiId: transaction.upiId,
      };
    }),
});
