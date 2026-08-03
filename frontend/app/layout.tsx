import type { Metadata } from "next";
import { Toaster } from 'sonner';
import "./globals.css";

export const metadata: Metadata = {
  title: "Law Connect Bot | Admin Panel",
  description: "Telegram Admin Panel for Faculty of Law",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
