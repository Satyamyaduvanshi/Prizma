"use client";

import { useEffect, useState, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import idl from "../idl.json";

// The Program ID from your anchor deploy command
const PROGRAM_ID = new web3.PublicKey("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk"); 
const USDC_MINT = new web3.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); 

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState<any[]>([]);

  // 1. Initialize Anchor Provider & Program
  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as any, PROGRAM_ID, provider);
  }, [provider]);

  // 2. Fetch Active Markets from Solana On Load
  useEffect(() => {
    const fetchMarkets = async () => {
      if (!program) return;
      try {
        console.log("Fetching markets from Solana...");
        const allMarkets = await program.account.market.all();
        setMarkets(allMarkets);
      } catch (err) {
        console.error("Error fetching markets:", err);
      }
    };
    fetchMarkets();
  }, [program]);

  // 3. Buy Shares Execution
  const buyShares = async (market: any, side: "Yes" | "No") => {
    if (!wallet.publicKey || !program) {
      alert("Connect your wallet first!");
      return;
    }
    setLoading(true);

    try {
      const [positionPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("position"), market.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const userUsdc = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey);

      console.log(`Executing Buy ${side} for Match: ${market.account.matchId}...`);

      const tx = await program.methods
        .buyShares({ [side.toLowerCase()]: {} }, new BN(500_000)) // 0.50 USDC
        .accounts({
          market: market.publicKey,
          position: positionPda,
          vault: market.account.vault,
          userUsdc: userUsdc,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID, // Use SPL Token Program for now
        })
        .rpc();
        
      alert(`Transaction successful! Signature: ${tx}`);
      
      // Refresh markets after buying
      const updatedMarkets = await program.account.market.all();
      setMarkets(updatedMarkets);

    } catch (err) {
      console.error(err);
      alert("Transaction failed! Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate odds based on AMM Liquidity
  const getOdds = (yesLiq: BN, noLiq: BN) => {
    const yes = yesLiq.toNumber();
    const no = noLiq.toNumber();
    if (yes === 0 && no === 0) return { yesPrice: 50, noPrice: 50 }; // Default seed
    const total = yes + no;
    // AMM prices inversely: more YES liquidity means YES is cheaper
    return {
      yesPrice: Math.round((no / total) * 100),
      noPrice: Math.round((yes / total) * 100),
    };
  };

  return (
    <main className="max-w-4xl mx-auto mt-10 p-4">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-emerald-400">SOLUX Predictions</h1>
        <WalletMultiButton className="!bg-emerald-500 hover:!bg-emerald-600" />
      </div>

      {markets.length === 0 && (
        <div className="text-slate-400 text-center py-20 bg-slate-900 rounded-xl border border-slate-800">
          No active markets found on Devnet. Run your init script!
        </div>
      )}

      <div className="grid gap-6">
        {markets.map((market) => {
          const { homeTeam, awayTeam, matchId, yesLiquidity, noLiquidity } = market.account;
          const odds = getOdds(yesLiquidity, noLiquidity);

          return (
            <div key={matchId} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded uppercase font-bold tracking-wider">
                  Match Winner
                </span>
                <span className="text-slate-400 text-sm font-mono text-xs truncate max-w-[150px]">
                  ID: {matchId}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-8 text-center">
                {homeTeam} <span className="text-slate-500 mx-2">vs</span> {awayTeam}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => buyShares(market, "Yes")}
                  disabled={loading}
                  className="bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 font-bold py-4 rounded-lg transition-all flex flex-col items-center justify-center gap-1"
                >
                  <span>{loading ? "Confirming..." : `Buy YES (${homeTeam})`}</span>
                  <span className="text-sm font-normal opacity-80">{odds.yesPrice}¢</span>
                </button>
                
                <button 
                  onClick={() => buyShares(market, "No")}
                  disabled={loading}
                  className="bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-400 font-bold py-4 rounded-lg transition-all flex flex-col items-center justify-center gap-1"
                >
                  <span>{loading ? "Confirming..." : `Buy NO (${awayTeam})`}</span>
                  <span className="text-sm font-normal opacity-80">{odds.noPrice}¢</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}