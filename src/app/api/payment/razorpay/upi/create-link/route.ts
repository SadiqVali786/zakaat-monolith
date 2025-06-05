/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "@/env";
import { razorpay } from "@/lib/razorpay";
import { db } from "@/server/db";
import { NextResponse, type NextRequest } from "next/server";

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
export interface CreatePaymentLinkRequest {
  applicantId: string;
  amount: number;
  upiId: string;
  donorId: string;
}

export interface PaymentLinkResponse {
  reference_id: string;
  payment_link_id: string;
  payment_link_url: string;
  amount: number;
  currency: string;
  upi_id: string;
}

interface PaymentLinkPayload {
  amount: number;
  currency: string;
  accept_partial: boolean;
  description: string;
  reference_id: string;
  callback_url: string;
  callback_method: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes: {
    [key: string]: string;
  };
  options: {
    checkout: {
      name: string;
      prefill?: {
        method: string;
      };
    };
    upi?: {
      vpa: string;
      flow: string;
    };
  };
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { amount, upiId, applicantId, donorId }: CreatePaymentLinkRequest =
      body;
    const reference = `${Date.now()}_${donorId}`;

    const paymentLinkData: PaymentLinkPayload = {
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
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });

    // Create transaction record in database
    const transaction = await db.razorpayTransaction.create({
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

    return NextResponse.json({
      referenceId: transaction.referenceId,
      paymentLinkId: transaction.paymentLinkId,
      paymentLinkUrl: transaction.paymentLinkUrl,
      amount: transaction.amount,
      currency: transaction.currency,
      upiId: transaction.upiId,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { msg: "UPI Link Creation failed" },
      { status: 500 },
    );
  }
};
