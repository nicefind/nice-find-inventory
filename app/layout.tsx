import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nice Find — Inventory",
  description: "Inventory for Nice Find, a vintage collectables shop in Adelaide. Track stock, photos, prices and listings across eBay, Facebook Marketplace and Depop.",
  icons: { icon: "/nice-find-logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
