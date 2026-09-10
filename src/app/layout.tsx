import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finances",
  description: "Personal finance and budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-full">
          <NavBar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
