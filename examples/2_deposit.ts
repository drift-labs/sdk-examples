/**
 * This example demonstrates how to deposit spot assets into a user account.
 *
 * You can get spot market indexes from:
 *   * `View Details` from the spot market on https://app.drift.trade
 *   * Streamlit: https://analytics.drift.trade/?tab=Overview-Markets
 *   * spot markets constants file: https://github.com/drift-labs/protocol-v2/blob/master/sdk/src/constants/spotMarkets.ts
 */
import {
	DriftClient,
	BN,
	QUOTE_PRECISION,
	Wallet,
	loadKeypair,
} from "@drift-labs/sdk";
import { Connection } from "@solana/web3.js";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
	throw new Error("PRIVATE_KEY environment variable is not set");
}

const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
	throw new Error("RPC_URL environment variable is not set");
}

const keypair = loadKeypair(privateKey);
console.log(`Using keypair for user: ${keypair.publicKey.toBase58()}`);

const connection = new Connection(rpcUrl);
const driftClient = new DriftClient({
	connection,
	wallet: new Wallet(keypair),
	env: "mainnet-beta",
});
await driftClient.subscribe();

const spotMarketIndex = 0; // USDC
const depositAmount = new BN(100).mul(QUOTE_PRECISION);

const tx = await driftClient.deposit(
	depositAmount,
	spotMarketIndex,
	// helper function to get ATA for spot market mint
	await driftClient.getAssociatedTokenAccount(0),
	0, // default will deposit to subaccount 0
	undefined,
	{
		computeUnitsPrice: 10_000,
	},
)
console.log(`Deposit tx: https://solscan.io/tx/${tx}`);

process.exit(0);