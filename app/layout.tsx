import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "China–Iran Logistics Tracker",
  description: "Order, truck and payment tracking for China–Iran freight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
