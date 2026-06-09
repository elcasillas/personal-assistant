import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Assistant",
  description: "Executive personal assistant for managing tasks, notes, and communications.",
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
