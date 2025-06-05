import "@/styles/globals.css";

import { DM_Sans } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";
import { InitWebSocketsConnection } from "@/components/hook-components/init-web-sockets-connection";
import { Toaster } from "@/components/ui/sonner";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "Zakaat",
  description:
    "Zakaat distribution web & mobile app for deserving, verified poor individuals in your locality and among relatives, neighbours who can't directly ask for help due to dignity.",
  icons: {
    icon: [
      { url: "/logo/logo.png", rel: "icon" },
      { url: "/logo/logo.png", sizes: "32x32", type: "image/png", rel: "icon" },
      { url: "/logo/logo.png", sizes: "16x16", type: "image/png", rel: "icon" },
    ],
    apple: [{ url: "/logo/logo.png", rel: "apple-touch-icon" }],
  },
};

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-brand-dark mx-auto min-h-screen max-w-[90rem] overflow-x-hidden antialiased",
          dmSans.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <SessionProvider>
              <InitWebSocketsConnection />
              {children}
            </SessionProvider>
            <Toaster position="top-center" richColors expand={true} />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
