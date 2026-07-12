import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction, // <--- Add this
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";

// 1. Setup connection and local CLI wallet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Read your local Arch Linux Solana CLI wallet
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const secretKeyString = fs.readFileSync(keypairPath, "utf-8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const walletKeypair = Keypair.fromSecretKey(secretKey);

const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);

async function main() {
  console.log("Wallet Public Key:", wallet.publicKey.toBase58());

  // 2. TxLINE Devnet Configs from the docs
  const programId = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
  const txlTokenMint = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
  
  // 3. Fetch IDL dynamically from Devnet
  console.log("Fetching TxLINE IDL from Devnet...");
  const idl = await anchor.Program.fetchIdl(programId, provider);
  if (!idl) throw new Error("IDL not found on-chain");
  const program = new anchor.Program(idl, provider);

  // 4. Derive the necessary PDAs for the subscription
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // 5. Send the Subscription Transaction
  console.log("Creating Token Account and Sending Subscription...");
  const SERVICE_LEVEL_ID = 1; 
  const DURATION_WEEKS = 4;

  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,         // Payer
        userTokenAccount,         // The ATA address to create
        wallet.publicKey,         // Owner
        txlTokenMint,             // Mint
        TOKEN_2022_PROGRAM_ID,    // Token Program (TxLINE uses Token-2022)
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
    ])
    .accounts({
      user: wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Subscribed to TxLINE Free Tier!");
  console.log("Transaction Signature:", txSig);
}

main().catch(console.error);