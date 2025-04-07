/**
 * This example demonstrates how to calculate borrow and lend rates for spot markets.
 */
import {
	BN,
	DriftClient,
    calculateBorrowRate,
    calculateDepositRate,
	convertToNumber,
	BulkAccountLoader,
	SpotMarkets,
	TEN,
	SPOT_MARKET_RATE_PRECISION,
	Wallet,
} from "@drift-labs/sdk";
import { Keypair } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";


const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
	throw new Error("RPC_URL environment variable is not set");
}

const connection = new Connection(rpcUrl);
const bulkAccountLoader = new BulkAccountLoader(connection, 'confirmed', 0);  // 0 means will not update accounts in background
const usdcOracleInfo = SpotMarkets['mainnet-beta'].find(market => market.marketIndex === 0)!;
const markets = SpotMarkets['mainnet-beta'];
const driftClient = new DriftClient({
	connection,
	accountSubscription: {
		type: 'polling',
		accountLoader: bulkAccountLoader,
	},
	wallet: new Wallet(Keypair.generate()),

	// you need to include all the markets you intend to use, otherwise they won't be loaded by DriftClient
	perpMarketIndexes: [],
	//spotMarketIndexes: [0], // since want to use usdc spot market later, leave undefined to load all markets.
	//oracleInfos: [{
	//	publicKey: usdcOracleInfo.oracle,
	//	source: usdcOracleInfo.oracleSource,
	//}],
	spotMarketIndexes: markets.map((m) => m.marketIndex),
      oracleInfos: markets.map((m) => ({
        publicKey: m.oracle,
        source: m.oracleSource
      })),
});
await driftClient.subscribe();

await driftClient.fetchAccounts();

// USDC spot market account
const spotMarket = driftClient.getSpotMarketAccount(0)!;
const spotPrecision = TEN.pow(new BN(spotMarket.decimals));

const depositApr = calculateDepositRate(spotMarket);
const depositAprNum =  convertToNumber(depositApr, SPOT_MARKET_RATE_PRECISION).toFixed(4) * 100;
const borrowApr = calculateBorrowRate(spotMarket);
const borrowAprNum = convertToNumber(borrowApr, SPOT_MARKET_RATE_PRECISION).toFixed(4) * 100;
console.log(`USDC Deposit APR: ${depositAprNum}%`);
console.log(`USDC Borrow APR:  ${borrowAprNum}%`);

// example how rates change with $1MM deposit or borrow
const usdcAmount = new BN(1e6).mul(spotPrecision);
const depositApr1 = calculateDepositRate(spotMarket, usdcAmount);
const depositAprNum1 =  convertToNumber(depositApr1, SPOT_MARKET_RATE_PRECISION).toFixed(4) * 100;
const borrowApr1 = calculateBorrowRate(spotMarket, usdcAmount.neg());
const borrowAprNum1 = convertToNumber(borrowApr1, SPOT_MARKET_RATE_PRECISION).toFixed(4) * 100;

console.log(`USDC Deposit APR (after $1MM deposit): ${depositAprNum}% -> ${depositAprNum1}%`);
console.log(`USDC Borrow APR (after $1MM borrow):   ${borrowAprNum}% -> ${borrowAprNum1}%`);

process.exit(0);
