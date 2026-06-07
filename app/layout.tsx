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
        {/* Skip link — keyboard users hit Tab on page load to surface it
            and jump to #main-content (set in components/dream-roadbook.tsx
            and components/travel-agent-app.tsx). Visually hidden until
            focused, see .skip-link in app/globals.css. */}
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
