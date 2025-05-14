/**
 * This example demonstrates how to fetch the current count of users
 * in high leverage mode from the HighLeverageModeConfig account.
 */
import {
	DriftClient,
	Wallet,
	BulkAccountLoader,
	DRIFT_PROGRAM_ID,
	getHighLeverageModeConfigPublicKey,
	SpotMarkets,
} from "@drift-labs/sdk";
import type { // All type imports should be here
	HighLeverageModeConfig,
	SpotMarketAccount,
	SpotMarketConfig,
} from "@drift-labs/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
// import { BorshAccountsCoder } from "@project-serum/anchor"; // Only if manual deserialization is needed

// Helper function to get RPC_URL
function getRpcUrl(): string {
	const rpcUrl = process.env.RPC_URL;
	if (!rpcUrl) {
		throw new Error("RPC_URL environment variable is not set");
	}
	return rpcUrl;
}

// Helper to create a placeholder wallet for read-only client
function getPlaceholderWallet(): Wallet {
	return new Wallet(Keypair.generate());
}

const main = async () => {
	const rpcUrl = getRpcUrl();
	const connection = new Connection(rpcUrl, 'confirmed');
	const bulkAccountLoader = new BulkAccountLoader(connection, 'confirmed', 0);

	// We don't need a real wallet for read-only operations
	const wallet = getPlaceholderWallet();

	// SpotMarkets is an object like { 'mainnet-beta': SpotMarketConfig[] }
	// The elements of the array are SpotMarketConfig
	const usdcMarketConfig = SpotMarkets['mainnet-beta'].find(
		(market: SpotMarketConfig) => market.marketIndex === 0
	)!;

	if (!usdcMarketConfig) {
		console.error("Could not find USDC market config (marketIndex 0) in SpotMarkets. Check SDK constants.");
		process.exit(1);
		return; 
	}
	
	const driftClient = new DriftClient({
		connection,
		wallet,
		programID: new PublicKey(DRIFT_PROGRAM_ID),
		env: 'mainnet-beta', 
		accountSubscription: {
			type: 'polling',
			accountLoader: bulkAccountLoader, 
		},
		perpMarketIndexes: [], 
		spotMarketIndexes: [0], 
		oracleInfos: [{ 
			publicKey: usdcMarketConfig.oracle,
			source: usdcMarketConfig.oracleSource,
		}],
	});
	await driftClient.subscribe();
	console.log('Successfully initialized and subscribed DriftClient.');

	let currentUsersInHighLeverage = -1; // Default to an error value

	try {
		const highLeverageModeConfigPda = getHighLeverageModeConfigPublicKey(
			driftClient.program.programId
		);
		console.log(
			`Derived HighLeverageModeConfig PDA: ${highLeverageModeConfigPda.toBase58()}`
		);

		const configAccount = (await driftClient.program.account.highLeverageModeConfig.fetch(
			highLeverageModeConfigPda
		)) as HighLeverageModeConfig; // Explicit cast

		currentUsersInHighLeverage = configAccount.currentUsers;

		console.log(
			'Successfully fetched and deserialized HighLeverageModeConfig account.'
		);
	} catch (e) {
		console.error(
			"Error fetching or deserializing HighLeverageModeConfig account:",
			e
		);
		if ((e as Error).message && (e as Error).message.includes("Account does not exist")) {
			console.error("The HighLeverageModeConfig account may not be initialized on this network/environment.");
		}
	}

	if (currentUsersInHighLeverage !== -1) {
		console.log(`Current number of users in high leverage mode: ${currentUsersInHighLeverage}`);
	} else {
		console.log('Could not determine the number of users in high leverage mode.');
	}

	await driftClient.unsubscribe();
	console.log('Example finished.');
	process.exit(0);
};

main().catch(e => {
	console.error(e);
	process.exit(1);
}); 