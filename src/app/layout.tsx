import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SkipLink, LiveRegion, StatusRegion } from "@/components/ui/accessibility";
import { Header } from "@/components/ui/header";
import { Navbar } from "@/components/ui/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DriftRapport - Intern Rapportering",
  description: "Intern rapporteringsplattform for Likestillingssenteret KUN og Likestillingssenteret på Vestlandet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <LiveRegion />
        <StatusRegion />
        <AuthProvider>
          <Header />
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
