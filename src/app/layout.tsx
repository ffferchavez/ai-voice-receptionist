import type { Metadata, Viewport } from "next";
import { Geist_Mono, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Voice Receptionist · AI Demo Projects",
    template: "%s · AI Demo Projects",
  },
  description:
    "AI Demo Projects. Configure an AI receptionist, ingest voice webhooks, and capture leads.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-dvh flex-col bg-ui-bg font-sans text-ui-text"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
