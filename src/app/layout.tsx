import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import "@/lib/env";

export const metadata: Metadata = {
  title: "Cliq - AI-Powered Hiring",
  description: "Streamline your hiring process with AI-powered video interviews. Find the best candidates faster.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
