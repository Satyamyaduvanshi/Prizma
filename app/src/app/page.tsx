"use client";

import { useEffect, useState, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "../idl.json";

const PROGRAM_ID = new web3.PublicKey("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk");
const USDC_MINT = new web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// A sleek mock chart SVG for the financial dashboard vibe
const MockChart = ({ color }: { color: string }) => (
  <svg viewBox="0 0 100 40" className="w-full h-20 opacity-80" preserveAspectRatio="none">
    <path
      d="M0,35 L10,32 L20,38 L30,25 L40,28 L50,15 L60,20 L70,10 L80,12 L90,2 L100,8"
      fill="none"
      stroke={color}
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
    <path
      d="M0,35 L10,32 L20,38 L30,25 L40,28 L50,15 L60,20 L70,10 L80,12 L90,2 L100,8 L100,40 L0,40 Z"
      fill={`url(#gradient-${color})`}
      opacity="0.2"
    />
    <defs>
      <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  // Store bet amounts per matchId so they don't overwrite each other
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: string }>({});

  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as any, provider);
  }, [provider]);

  useEffect(() => {
    const fetchMarkets = async () => {
      if (!program) return;
      try {
        const allMarkets = await program.account.market.all();
        setMarkets(allMarkets);
      } catch (err) {
        console.error("Error fetching markets:", err);
      }
    };
    if (isMounted) fetchMarkets();
  }, [program, isMounted]);

  const handleBetChange = (matchId: string, value: string) => {
    setBetAmounts((prev) => ({ ...prev, [matchId]: value }));
  };

  const buyShares = async (market: any, side: "Yes" | "No") => {
    if (!wallet.publicKey || !program) {
      alert("Please connect your wallet first.");
      return;
    }

    const inputVal = betAmounts[market.account.matchId] || "5";
    const amountNum = parseFloat(inputVal);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(market.account.matchId + side);

    try {
      const [positionPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("position"), market.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const userUsdc = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);
      const usdcAmount = new BN(amountNum * 1_000_000); 

      const tx = await program.methods
        .buyShares({ [side.toLowerCase()]: {} }, usdcAmount) 
        .accounts({
          market: market.publicKey,
          position: positionPda,
          vault: market.account.vault,
          userUsdc: userUsdc,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID, 
        })
        .rpc();
        
      alert(`Trade Executed! Signature: ${tx}`);
      
      const updatedMarkets = await program.account.market.all();
      setMarkets(updatedMarkets);

    } catch (err) {
      console.error(err);
      alert("Transaction failed! Check console.");
    } finally {
      setLoading(null);
    }
  };

  const getOdds = (yesLiq: BN, noLiq: BN) => {
    const yes = yesLiq.toNumber();
    const no = noLiq.toNumber();
    if (yes === 0 && no === 0) return { yesPrice: 50, noPrice: 50 }; 
    const total = yes + no;
    return {
      yesPrice: Math.round((no / total) * 100),
      noPrice: Math.round((yes / total) * 100),
    };
  };

  if (!isMounted) return null;

  const featuredMarket = markets[0];
  const gridMarkets = markets.slice(1);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white font-sans selection:bg-[#FC4D36]/30">
      
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black tracking-tight text-[#FC4D36]">PANDO</h1>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <span className="text-white cursor-pointer">Trending</span>
            <span className="hover:text-white cursor-pointer transition-colors">Recent</span>
            <span className="hover:text-white cursor-pointer transition-colors">Sports</span>
            <span className="hover:text-white cursor-pointer transition-colors">Crypto</span>
          </div>
        </div>
        <div>
          <WalletMultiButton style={{ backgroundColor: "#FC4D36", borderRadius: "8px", fontWeight: 600, height: "40px" }} />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10">
        
        {/* Empty State */}
        {markets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500 border border-white/5 border-dashed rounded-2xl bg-[#151924]/50">
            <p className="text-lg">No active markets found on Devnet.</p>
            <p className="text-sm mt-2">Initialize a market using your scripts to see the dashboard.</p>
          </div>
        )}

        {/* Hero Featured Market */}
        {featuredMarket && (
          <div className="mb-12 bg-[#151924] border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#FC4D36] bg-[#FC4D36]/10 rounded-full">
                      Featured
                    </span>
                    <span className="text-gray-500 text-xs font-mono">ID: {featuredMarket.account.matchId}</span>
                  </div>
                  <h2 className="text-4xl font-bold leading-tight mb-4 text-white">
                    {featuredMarket.account.homeTeam} <span className="text-gray-600 font-light mx-2">vs</span> {featuredMarket.account.awayTeam}
                  </h2>
                  <p className="text-gray-400 max-w-md text-sm leading-relaxed mb-8">
                    Trade on the outcome of this major international fixture. Prices reflect the real-time probability based on AMM pool liquidity. Settled automatically via the TxLINE Oracle.
                  </p>
                </div>

                {/* Trading Controls */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-1/3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={betAmounts[featuredMarket.account.matchId] || "5"}
                        onChange={(e) => handleBetChange(featuredMarket.account.matchId, e.target.value)}
                        className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-mono text-sm focus:outline-none focus:border-[#FC4D36] transition-colors"
                        placeholder="Amount"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">USDC</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => buyShares(featuredMarket, "Yes")}
                      disabled={!!loading}
                      className="bg-[#FC4D36] hover:bg-[#e03e26] text-white font-semibold py-4 rounded-xl transition-all flex flex-col items-center justify-center shadow-lg shadow-[#FC4D36]/20 disabled:opacity-50"
                    >
                      <span>{loading === featuredMarket.account.matchId + "Yes" ? "Confirming..." : `YES • ${featuredMarket.account.homeTeam}`}</span>
                      <span className="text-xs font-medium opacity-80 mt-1">{getOdds(featuredMarket.account.yesLiquidity, featuredMarket.account.noLiquidity).yesPrice}¢</span>
                    </button>
                    <button 
                      onClick={() => buyShares(featuredMarket, "No")}
                      disabled={!!loading}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-4 rounded-xl transition-all flex flex-col items-center justify-center disabled:opacity-50"
                    >
                      <span>{loading === featuredMarket.account.matchId + "No" ? "Confirming..." : `NO • ${featuredMarket.account.awayTeam}`}</span>
                      <span className="text-xs font-medium text-gray-400 mt-1">{getOdds(featuredMarket.account.yesLiquidity, featuredMarket.account.noLiquidity).noPrice}¢</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mock Chart Area */}
              <div className="bg-[#0B0E14]/50 border border-white/5 rounded-2xl p-6 flex flex-col justify-end relative overflow-hidden">
                <div className="absolute top-6 left-6">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Implied Volatility</p>
                  <p className="text-[#FC4D36] text-2xl font-mono">+14.2%</p>
                </div>
                <MockChart color="#FC4D36" />
              </div>

            </div>
          </div>
        )}

        {/* Section Header */}
        {gridMarkets.length > 0 && (
          <div className="flex items-center justify-between mb-8 mt-16">
            <h3 className="text-xl font-semibold text-white">Live Markets</h3>
            <span className="text-sm text-[#FC4D36] hover:text-white cursor-pointer transition-colors font-medium">See all →</span>
          </div>
        )}

        {/* Market Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridMarkets.map((market) => {
            const { homeTeam, awayTeam, matchId, yesLiquidity, noLiquidity } = market.account;
            const odds = getOdds(yesLiquidity, noLiquidity);

            return (
              <div key={matchId} className="bg-[#151924] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all flex flex-col group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Match</span>
                  </div>
                </div>

                <h4 className="text-lg font-bold mb-2 text-white group-hover:text-[#FC4D36] transition-colors">
                  {homeTeam} vs {awayTeam}
                </h4>
                <p className="text-sm text-gray-500 mb-6 flex-grow">
                  Automated AMM settlement based on Devnet TxLINE data.
                </p>

                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-2">
                     <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={betAmounts[matchId] || "5"}
                        onChange={(e) => handleBetChange(matchId, e.target.value)}
                        className="w-full bg-[#0B0E14] border border-white/5 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-[#FC4D36] transition-colors"
                        placeholder="USDC Amount"
                      />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => buyShares(market, "Yes")}
                      disabled={!!loading}
                      className="bg-white/5 hover:bg-[#FC4D36] border border-white/10 hover:border-transparent text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex justify-between px-4 items-center"
                    >
                      <span>YES</span>
                      <span className="font-mono text-[#FC4D36] group-hover:text-white">{odds.yesPrice}¢</span>
                    </button>
                    
                    <button 
                      onClick={() => buyShares(market, "No")}
                      disabled={!!loading}
                      className="bg-white/5 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex justify-between px-4 items-center"
                    >
                      <span>NO</span>
                      <span className="font-mono text-gray-400">{odds.noPrice}¢</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}