/**
 * This example demonstrates how read various metrics important for account health.
 */
import {
	DriftClient,
	BN,
	QUOTE_PRECISION,
	Wallet,
	loadKeypair,
	BASE_PRECISION,
	PositionDirection,
	convertToNumber,
	PRICE_DIV_PEG,
	PRICE_PRECISION,
	decodeName,
	getVariant,
	getOrderParams,
	OrderType,
	calculateEntryPrice,
	getAuctionPrice,
	SlotSubscriber,
	OrderSubscriber,
	DLOBSubscriber,
	MarketType,
	User,
	getSignedTokenAmount,
	getTokenAmount,
	TEN,
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

	// you may want to experiment with these to suit your use case. Default
	// will use websocket to keep accounts up to date.
	accountSubscription: {
		type: "websocket",
		commitment: "confirmed",
	},
});
await driftClient.subscribe();

// const slotSubscriber = new SlotSubscriber(connection);
// await slotSubscriber.subscribe();

// const orderSubscriber = new OrderSubscriber({
// 	driftClient,
// 	subscriptionConfig: {
// 		type: 'websocket',
// 	},
// 	fastDecode: true,
// 	decodeData: true,
// });
// await orderSubscriber.subscribe();

// const dlobSubscriber = new DLOBSubscriber({
//     driftClient,
//     dlobSource: orderSubscriber,
//     slotSource: slotSubscriber,
// 	updateFrequency: 1000,
// });
// await dlobSubscriber.subscribe();

function calculateAccountValueUsd(user: User): number {
	const netSpotValue = convertToNumber(
		user.getNetSpotMarketValue(),
		QUOTE_PRECISION
	);
	const unrealizedPnl = convertToNumber(
		user.getUnrealizedPNL(true, undefined, undefined),
		QUOTE_PRECISION
	);
	return netSpotValue + unrealizedPnl;
}

const user = driftClient.getUser(0);

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

// get total account value USD
const accountValueUsd = calculateAccountValueUsd(user);
console.log(`Account Value USD: ${accountValueUsd}`);

// get free collateral (initial margin available for new positions)
const freeCollateralInit = user.getFreeCollateral('Initial');
console.log(`Free Collateral (Initial): ${convertToNumber(freeCollateralInit, QUOTE_PRECISION)}`);

// get free collateral, if this drops to 0, the account will be liquidated
const freeCollateralMaint = user.getFreeCollateral('Maintenance');
console.log(`Free Collateral (Maintenance): ${convertToNumber(freeCollateralMaint, QUOTE_PRECISION)}`);

process.exit(0);
