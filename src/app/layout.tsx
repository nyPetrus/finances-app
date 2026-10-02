import type { Metadata, Viewport } from "next";
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

// Android Chrome otherwise overlays the on-screen keyboard on top of the
// page, hiding bottom-anchored UI like the Search filter sheet.
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
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
        <div className="flex min-h-full flex-col md:flex-row">
          <NavBar />
          {/* Phones: room for the fixed bottom nav bar (sidebar-nav.tsx). */}
          <main className="min-w-0 flex-1 max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]">{children}</main>
        </div>
        {/* Phones: toasts sit above the bottom nav bar. */}
        <Toaster mobileOffset={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }} />
      </body>
    </html>
  );
}
