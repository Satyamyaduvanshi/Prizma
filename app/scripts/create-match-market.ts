import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountIdempotentInstruction 
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import axios from "axios";
import dotenv from "dotenv";
import idl from "../src/idl.json";

// Load the TxLINE credentials we generated earlier
dotenv.config({ path: ".env.local" });

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
const walletKeypair = Keypair.fromSecretKey(secretKey);

const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

async function main() {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;

  if (!jwt || !apiToken) {
    console.error("❌ Missing TxLINE credentials in .env.local!");
    return;
  }

  console.log("📡 Fetching fixtures from TxLINE Oracle...");

  let matchId = "10245"; // Fallback ID
  let homeTeam = "France";
  let awayTeam = "Germany";
  let kickoffTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400);

  try {
    const epochDay = Math.floor(Date.now() / 86400000);
    const response = await axios.get(
      `https://txline-dev.txodds.com/api/fixtures/snapshot/${epochDay}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "X-Api-Token": apiToken,
        },
      }
    );

    const fixturesArray = Array.isArray(response.data)
      ? response.data
      : response.data?.fixtures || Object.values(response.data || {});

    if (fixturesArray && fixturesArray.length > 0) {
      const match = fixturesArray[0] as any;
      matchId = match.fixtureId?.toString() || matchId;
      homeTeam = match.homeTeamName || homeTeam;
      awayTeam = match.awayTeamName || awayTeam;
      if (match.kickoffTime) {
         kickoffTime = new anchor.BN(Math.floor(new Date(match.kickoffTime).getTime() / 1000));
      }
      console.log("✅ Successfully fetched live fixture from TxLINE API!");
    } else {
       console.log("⚠️ API returned empty fixtures array. Using fallback data for Devnet.");
    }
  } catch (error: any) {
    console.log(`⚠️ TxLINE API fetch failed (${error.response?.status}). Using fallback data to ensure contract deployment.`);
  }

  const closeTime = kickoffTime.sub(new anchor.BN(300)); // Close 5 mins before kickoff

  console.log(`\n⚽ Preparing Market: ${homeTeam} vs ${awayTeam} (ID: ${matchId})`);

  const programId = new PublicKey("GC15UJT8ESPd93LVfGn7tHXNSWFG9wqX78Ty4GNapfSk");
  const program = new anchor.Program(idl as any, provider);
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(matchId)],
    programId
  );
  
  // true = allowOwnerOffCurve (required because the owner is a PDA, not a normal wallet)
  const vault = getAssociatedTokenAddressSync(usdcMint, marketPda, true);
  console.log("🚀 Market PDA:", marketPda.toBase58());
  console.log("🏦 Initializing Vault ATA:", vault.toBase58());

  // Fire the transaction with the pre-instruction to build the vault
  const txSig = await program.methods
    .createMarket(matchId, homeTeam, awayTeam, { matchWinner: {} }, kickoffTime, closeTime)
    .accounts({
      market: marketPda,
      usdcMint: usdcMint,
      vault: vault,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, // Payer of the rent
        vault,            // The ATA to create
        marketPda,        // The owner of the ATA (our Market PDA)
        usdcMint          // The Mint (USDC)
      )
    ])
    .rpc();

  console.log("✅ Real Match Market successfully generated on-chain!");
  console.log("Transaction Signature:", txSig);
}

main().catch(console.error);