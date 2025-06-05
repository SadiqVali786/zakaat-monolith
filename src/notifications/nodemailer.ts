import { env } from "@/env";
import nodemailer, { type TransportOptions } from "nodemailer";

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT ?? 587,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
} as TransportOptions);

export const sendEmailWithHTML = async (
  to: string,
  subject: string,
  html: string,
) => {
  await transporter.sendMail({ from: env.EMAIL_USER, to, subject, html });
};
