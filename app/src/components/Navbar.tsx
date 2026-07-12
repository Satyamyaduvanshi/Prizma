"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePathname } from "next/navigation";

// --- Custom Web3 Wallet Button ---
const CustomWalletButton = () => {
  const { setVisible } = useWalletModal();
  const { publicKey, connected, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="bg-[#FC4D36] hover:bg-[#e03e26] text-white font- text-xs px-5 py-2.5 rounded-lg transition-colors tracking-wide shadow-[0_0_15px_rgba(252,77,54,0.2)] font-sans"
      >
        Connect
      </button>
    );
  }

  const base58 = publicKey.toBase58();
  const avatarChars = base58.slice(0, 2).toUpperCase();
  const shortAddress = `${base58.slice(0, 4)}...${base58.slice(-4)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 bg-[#1C2333] hover:bg-[#232B3E] border border-white/5 rounded-full p-1 pr-4 transition-colors font-sans"
      >
        <div className="w-7 h-7 rounded-full bg-[#FC4D36] flex items-center justify-center text-[10px]  text-white shadow-inner">
          {avatarChars}
        </div>
        <span className="text-xs font-medium text-white tracking-wide">{shortAddress}</span>
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#151924] border border-white/10 rounded-xl shadow-2xl py-1 z-50 overflow-hidden font-sans">
          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font- text-red-400 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
};

export default function Navbar() {
  const [isMounted, setIsMounted] = useState(false);
  const { connected } = useWallet();
  const pathname = usePathname(); // Tracks what route is active to light up tabs dynamically

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simple active styling helper
  const linkStyle = (path: string) => 
    `pb-2 border-b-2 transition-all duration-200 font-sans cursor-pointer ${
      pathname === path 
        ? "text-white border-white " 
        : "text-gray-400 border-transparent hover:text-white"
    }`;

  const categoryStyle = (path: string) => 
    `pb-2 border-b-2 transition-all duration-200 font-sans cursor-pointer ${
      pathname === path 
        ? "text-white border-[#FC4D36] " 
        : "text-gray-400 border-transparent hover:text-white"
    }`;

  return (
    <nav className="w-full bg-[#121315] border-b border-white/5 sticky top-0 z-50 tracking-tight">
      <div className="max-w-7xl mx-auto px-8 pt-5 pb-1 flex flex-col">
        
        {/* Top Row: Brand, Search, Statistics, Actions */}
        <div className="flex items-center justify-between pb-4">
          
          {/* Logo & Modern Input Container */}
          <div className="flex items-center gap-8 flex-1 max-w-2xl">
            <Link href="/" className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 group">
              <Image 
                src="/pando.png" 
                alt="Pando Logo" 
                width={32} 
                height={32} 
                className="object-contain"
              />
              <span className="text-lg  tracking-wider text-white uppercase font-sans">
                Pando
              </span>
            </Link>

            {/* Custom Search Field */}
            <div className="relative w-full max-w-md hidden sm:block">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth="2" 
                  stroke="currentColor" 
                  className="w-4 h-4 opacity-40"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search markets..." 
                className="w-full bg-[#1B1C1F] border border-white/5 rounded-lg py-2 pl-10 pr-8 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-white/10 transition-colors font-sans font-normal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-500 border border-white/5 select-none">
                /
              </span>
            </div>
          </div>

          {/* Right Info Indicators & Actions */}
          <div className="flex items-center gap-6">
            
            {/* Stats Panel */}
            {isMounted && connected && (
              <div className="hidden md:flex items-center gap-6 mr-2 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font- tracking-wide uppercase mb-0.5">Deployed</span>
                  <span className="text-white  text-sm tracking-tight leading-none">$0.00</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font- tracking-wide uppercase mb-0.5">Cash</span>
                  <span className="text-white text-sm tracking-tight leading-none">$0.00</span>
                </div>
              </div>
            )}

            {/* Minimal Creation Button */}
            <button 
              onClick={() => alert("Market configuration coming soon!")}
              className="flex items-center gap-1.5 bg-[#1C2333] hover:bg-[#232B3E] text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors border border-white/5 font-sans"
            >
              <span className="text-sm font-light leading-none relative bottom-[0.5px]">+</span> Create
            </button>

            {/* Custom Wallet Dropdown */}
            {isMounted && (
              <div className="wallet-wrapper z-50">
                <CustomWalletButton />
              </div>
            )}
          </div>
        </div>

        {/* --- The Clean Horizontal Divider Bar --- */}
        <hr className="border-0 h-[1px] bg-white/5 w-full" />

        {/* Bottom Row: Dynamic Nav Buttons/Links */}
        <div className="flex items-center gap-6 text-xs text-gray-400 pt-3 font-sans select-none tracking-wide">
          <div className="flex items-center gap-4">
            <Link href="/trending" className={linkStyle("/trending")}>Trending</Link>
            <Link href="/recent" className={linkStyle("/recent")}>Recent</Link>
            <Link href="/new" className={linkStyle("/new")}>New</Link>
          </div>
          
          <div className="h-4 border-l border-white/10 self-center mb-2"></div>
          
          <div className="flex items-center gap-4">
            <Link href="/" className={categoryStyle("/")}>All</Link>
            <Link href="/tech" className={categoryStyle("/tech")}>Tech</Link>
            
            {/* Premium, Glowing Football / Soccer Route Target */}
            <Link href="/world-cup" className={`${categoryStyle("/world-cup")} flex items-center gap-1.5 group`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-3.5 h-3.5 text-[#FC4D36] drop-shadow-[0_0_5px_rgba(252,77,54,0.7)] group-hover:drop-shadow-[0_0_8px_rgba(252,77,54,1)] transition-all"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 12m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" />
                <path d="M12 2v6.5M12 15.5V22M2 12h6.5M15.5 12H22" />
              </svg>
              World cup
            </Link>
          </div>
        </div>

      </div>
    </nav>
  );
}