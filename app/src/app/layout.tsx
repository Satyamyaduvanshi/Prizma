"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useMemo } from "react";
import Navbar from "@/components/Navbar"; // Adjust path dynamically if needed

import "@solana/wallet-adapter-react-ui/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const endpoint = "https://api.devnet.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
 <html lang="en" className={`${geistSans.className} h-full antialiased`}>
  <body className="min-h-full flex flex-col bg-[#000001] text-white">
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              {/* Managed layout wrapper containing clean global Navbar navigation */}
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}