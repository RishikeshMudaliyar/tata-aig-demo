import type { Metadata, Viewport } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PersonaProvider } from "@/components/PersonaProvider";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tata AIG — Unified Sales Platform",
  description: "Orchestration & intelligence layer over Tata AIG's existing digital assets.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Tata AIG", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#004da7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${rubik.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PersonaProvider>{children}</PersonaProvider>
      </body>
    </html>
  );
}
