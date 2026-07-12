import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import idl from "../src/idl.json";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
const walletKeypair = Keypair.fromSecretKey(secretKey);

const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

async function main() {
  const programId = new PublicKey("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk");
  const program = new anchor.Program(idl as any, programId, provider);
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  // Bulletproof mock data for the demo
  const matchId = "demo-wc-final";
  const homeTeam = "India";
  const awayTeam = "Germany";
  
  // Set Kickoff to 24 hours from now, close betting 5 mins before
  const now = Math.floor(Date.now() / 1000);
  const kickoffTime = new anchor.BN(now + 86400);
  const closeTime = new anchor.BN(now + 86100);

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(matchId)],
    programId
  );
  const vault = getAssociatedTokenAddressSync(usdcMint, marketPda, true);

  console.log("🚀 Creating Market PDA:", marketPda.toBase58());

  const txSig = await program.methods
    .createMarket(matchId, homeTeam, awayTeam, { matchWinner: {} }, kickoffTime, closeTime)
    .accounts({
      market: marketPda,
      usdcMint: usdcMint,
      vault: vault,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Market successfully created on Devnet!");
  console.log("Transaction Signature:", txSig);
}

main().catch(console.error);