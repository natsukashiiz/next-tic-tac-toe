import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/contexts/SessionContext";
import { WebSocketProvider } from "@/contexts/WebSocketProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tic Tac Toe Game 🎮",
  description: "A fun Tic Tac Toe game",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-center" expand={true} closeButton />
        <SessionProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
