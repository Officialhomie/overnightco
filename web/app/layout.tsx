import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

// Material Symbols — loaded via next/font is not supported, so we use a link tag in head

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
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="selection:bg-[#22c55e] selection:text-[#003915]">
        <div className="scanline" aria-hidden />
        {children}
      </body>
    </html>
  );
}
