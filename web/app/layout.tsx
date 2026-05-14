import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "OvernightCo — Give an AI $20",
  description:
    "Give an AI $20 and a niche. It picks a product, builds it, prices it, sells it to humans and other agents, and shows you a profit-or-loss statement by morning.",
  openGraph: {
    title: "OvernightCo",
    description: "Give an AI $20. Get a P&L by morning.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body>{children}</body>
    </html>
  );
}
