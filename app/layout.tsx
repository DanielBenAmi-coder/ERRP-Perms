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
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "ER Permission Report",
  description: "Staff actions. Fully accountable. The internal permission reporting and review system for ER Roleplay.",
  icons: {
    icon: "/er-logo.png",
    shortcut: "/er-logo.png",
  },
  openGraph: {
    title: "ER Permission Report",
    description: "Staff Actions. Fully Accountable.",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "ER Permission Report" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ER Permission Report",
    description: "Staff Actions. Fully Accountable.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
