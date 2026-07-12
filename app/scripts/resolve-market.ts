import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
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
  const program = new anchor.Program(idl as any, provider);

  const matchId = "10245"; // The France vs Germany match ID we used earlier

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), Buffer.from(matchId)],
    programId
  );

  console.log("🏁 Resolving Market:", marketPda.toBase58());

  // Assuming France (Home/YES) won the match. 
  // Update the enum { yes: {} } or { no: {} } based on your contract's expected input.
  const txSig = await program.methods
    .resolveMarket({ yes: {} }) 
    .accounts({
      market: marketPda,
      authority: wallet.publicKey, // Only the admin who created it can resolve it in a mock setup
    })
    .rpc();

  console.log("✅ Market successfully resolved! Winner declared.");
  console.log("Transaction Signature:", txSig);
}

main().catch(console.error);