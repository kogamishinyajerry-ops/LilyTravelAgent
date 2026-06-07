import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ToastContainer } from "@/components/toast-container";

export const metadata: Metadata = {
  title: "Lily Travel Agent",
  description: "Local AI travel roadbook agent for beautiful itinerary demos.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
