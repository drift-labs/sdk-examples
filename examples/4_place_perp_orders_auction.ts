/**
 * This example demonstrates how to place auction orders on a perp market.
 * Auction orders' have a price that starts at `auctionStartPrice` and linearly approaches
 * `auctionEndPrice` over `auctionDuration` slots. If the order is not filled by the end of
 * the auction the order is placed normally with `price`
 *
 * These are preferred over market orders as they allow jit makers to fill the orders
 * at favorable prices.
 *
 * You can get perp market indexes from:
 *   * `View Details` from the perp market on https://app.drift.trade
 *   * Streamlit: https://analytics.drift.trade/?tab=Overview-Markets
 *   * perp markets constants file: https://github.com/drift-labs/protocol-v2/blob/master/sdk/src/constants/perpMarkets.ts
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

const slotSubscriber = new SlotSubscriber(connection);
await slotSubscriber.subscribe();

const perpMarketIndex = 0; // SOL-PERP
const orderSize = BASE_PRECISION.div(new BN(10)); // 0.1 SOL-PERP
const orderDirection = PositionDirection.LONG;
const auctionBps = 20; // auction from 20 bps below oracle

const perpMarket = driftClient.getPerpMarketAccount(perpMarketIndex)!;
const mktName = decodeName(perpMarket.name);

const oracle = driftClient.getOracleDataForPerpMarket(perpMarketIndex);
console.log(`Current oracle price: ${convertToNumber(oracle.price, PRICE_PRECISION)}`);

const auctionStartPrice = oracle.price.mul(new BN(10000 - auctionBps)).div(new BN(10000));
const auctionEndPrice = oracle.price;
const auctionDuration = 69; // 69 slots
console.log(`\nPlacing a ${getVariant(orderDirection)} order for ${convertToNumber(orderSize, BASE_PRECISION)} ${mktName} at $${convertToNumber(auctionStartPrice, PRICE_PRECISION)} to ${convertToNumber(auctionEndPrice, PRICE_PRECISION)} over ${auctionDuration} slots`);

// 1) place an auction order
const tx = await driftClient.placePerpOrder(
	getOrderParams({
		orderType: OrderType.LIMIT,
		marketIndex: perpMarketIndex,
		baseAssetAmount: orderSize,
		direction: orderDirection,
		auctionStartPrice,
		auctionEndPrice,
		auctionDuration,
		price: auctionEndPrice,
	}),
	{
		computeUnitsPrice: 1_000,
	}
);
console.log(`Placed auction order tx: https://solscan.io/tx/${tx}`);


// 3) read back the open orders.

// There is a chance that this fails if we did not get the account updates from the RPC yet. So can force the driftClient to update with the RPC, be wary this may be heavy on the RPC.
const user = driftClient.getUser(0);
await user.fetchAccounts();

for (let i = 0; i < 30; i++) {
	console.log('');
	const openOrders = user.getOpenOrders();
	for (const order of openOrders) {
		const oracle = driftClient.getOracleDataForPerpMarket(order.marketIndex);
		const auctionPrice = getAuctionPrice(order, slotSubscriber.getSlot(), oracle.price);

		console.log(`Open order ${order.orderId}: ${getVariant(order.orderType)}, market: ${getVariant(order.marketType)}-${order.marketIndex}, ${convertToNumber(order.baseAssetAmount, BASE_PRECISION)} ${getVariant(order.direction)}, auctionPrice: ${convertToNumber(auctionPrice, PRICE_PRECISION)}, oraclePrice: ${convertToNumber(oracle.price, PRICE_PRECISION)}`);
	}

	const p = user.getPerpPosition(perpMarketIndex);
	if (p) {
		const entryPrice = calculateEntryPrice(p);
		console.log(`Open position: ${convertToNumber(p.baseAssetAmount, BASE_PRECISION)}, entryPrice: ${convertToNumber(entryPrice, PRICE_PRECISION)}`);
	} else {
		console.log(`No position found`);
	}

	await new Promise(resolve => setTimeout(resolve, 1000));
}
if (user.getOpenOrders().length > 0) {
	console.log('Cancelling orders')
	// default cancels all open orders
	const tx3 = await driftClient.cancelOrders(undefined, undefined, undefined, {
		computeUnitsPrice: 1_000,
	});
	console.log(`Cancel orders tx: https://solscan.io/tx/${tx3}`);
} else {
	console.log('No open orders to cancel');
}

process.exit(0);
