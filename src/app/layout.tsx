import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ed's - AI Assistant Linda",
  description: "Linda — your executive personal assistant for managing tasks, notes, and communications.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
