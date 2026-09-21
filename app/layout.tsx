import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDesk — MARS agent console",
  description:
    "A support ticket becomes a triaged, tool-assisted resolution — worked by agents on DigitalOcean.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
