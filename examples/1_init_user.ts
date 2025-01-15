/**
 * This example demonstrates how to initialize a new user account. This step is not required
 * if you have already created a drift account on the drift UI.
 */
import {
	DriftClient,
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

// subaccount 0 is default
try {
	const user = driftClient.getUser(0);
	console.log(`User 0 already exists: ${user.userAccountPublicKey.toBase58()}`);
} catch (e) {
	console.log(`User does not exist, initializing...`);
	const [tx, userAccountPublicKey] = await driftClient.initializeUserAccount(0);
	console.log(`User initialized subsaccount 0: ${userAccountPublicKey.toBase58()}`);
	console.log(`https://solscan.io/tx/${tx}`);
}

process.exit(0);