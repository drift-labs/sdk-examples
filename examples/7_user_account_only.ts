/**
 * This example demonstrates how data from a user account without using a DriftClient.
 * Thsi provides read-only access for an account
 */
import {
	DriftClient,
	BN,
	QUOTE_PRECISION,
	Wallet,
	BASE_PRECISION,
	convertToNumber,
	calculateEntryPrice,
	User,
	getSignedTokenAmount,
	getTokenAmount,
	TEN,
	BulkAccountLoader,
	SpotMarkets,
	getVariant,
} from "@drift-labs/sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";


const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
	throw new Error("RPC_URL environment variable is not set");
}

const userAccountToRead = new PublicKey("2aMcirYcF9W8aTFem6qe8QtvfQ22SLY6KUe6yUQbqfHk");

const connection = new Connection(rpcUrl);
const bulkAccountLoader = new BulkAccountLoader(connection, 'confirmed', 0);  // 0 means will not update accounts in background
const usdcOracleInfo = SpotMarkets['mainnet-beta'].find(market => market.marketIndex === 0)!;
const driftClient = new DriftClient({
	connection,
	accountSubscription: {
		type: 'polling',
		accountLoader: bulkAccountLoader,
	},
	wallet: new Wallet(Keypair.generate()),

	// you need to include all the markets you intend to use, otherwise they won't be loaded by DriftClient
	perpMarketIndexes: [],
	spotMarketIndexes: [0], // since want to use usdc spot market later
	oracleInfos: [{
		publicKey: usdcOracleInfo.oracle,
		source: usdcOracleInfo.oracleSource,
	}],
});
await driftClient.subscribe();
// await driftClient.fetchAccounts();

const user = new User({
	driftClient,
	userAccountPublicKey: userAccountToRead,
	accountSubscription: {
		type: 'polling',
		accountLoader: bulkAccountLoader,
	},
});
await user.fetchAccounts();

// get USDC spot balances
const usdcPos = user.getSpotPosition(0); // 0 is the USDC market index
const usdcMarketAccount = driftClient.getSpotMarketAccount(0)!;
if (usdcPos) {
	const usdcBalance = getSignedTokenAmount(
		getTokenAmount(
			usdcPos.scaledBalance,
			usdcMarketAccount,
			usdcPos.balanceType,
		),
		usdcPos.balanceType,
	)
	const usdcPrec = TEN.pow(new BN(usdcMarketAccount.decimals));
	console.log(`USDC Spot Balance: ${convertToNumber(usdcBalance, usdcPrec)}`);
} else {
	console.log(`No USDC position found`);
}

const perpPos = user.getPerpPosition(0);
if (perpPos) {
	const entryPrice = calculateEntryPrice(perpPos);
	console.log(`Perp Position: ${perpPos.marketIndex}, base: ${convertToNumber(perpPos.baseAssetAmount, BASE_PRECISION)}, quote: ${convertToNumber(perpPos.quoteAssetAmount, QUOTE_PRECISION)}, entryPrice: ${convertToNumber(entryPrice, QUOTE_PRECISION)}`);
} else {
	console.log(`No perp position found`);
}

process.exit(0);
