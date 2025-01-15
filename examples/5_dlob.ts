/**
 * This example demonstrates how to build the DLOB directly from RPC data.
 * Warning: this is quite heavy on the RPC.
 *
 * Alternative is to use the drift hosted DLOB server at https://dlob.drift.trade
 *    * https://drift-labs.github.io/v2-teacher/#orderbook-trades-dlob-server
 *    * https://github.com/drift-labs/dlob-server
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

const orderSubscriber = new OrderSubscriber({
	driftClient,
	subscriptionConfig: {
		type: 'websocket',
	},
	fastDecode: true,
	decodeData: true,
});
await orderSubscriber.subscribe();

const dlobSubscriber = new DLOBSubscriber({
    driftClient,
    dlobSource: orderSubscriber,
    slotSource: slotSubscriber,
	updateFrequency: 1000,
});
await dlobSubscriber.subscribe();

for (let i = 0; i < 10; i++) {
	const dlob = dlobSubscriber.getDLOB();
	console.log(`SOL-PERP L2:`)
	const l2 = dlob.getL2({
		marketIndex: 0,
		marketType: MarketType.PERP,
		slot: slotSubscriber.getSlot(),
		oraclePriceData: driftClient.getOracleDataForPerpMarket(0),
		depth: 10,
	});
	console.log(`l2-bids:`)
	for (const level of l2.bids) {
		console.log(`  ${level.price}, ${level.size}`);
	}
	console.log(`l2-asks:`)
	for (const level of l2.asks) {
		console.log(`  ${level.price}, ${level.size}`);
	}

	console.log('');
	console.log(`SOL-PERP L3:`)
	const l3 = dlob.getL3({
		marketIndex: 0,
		marketType: MarketType.PERP,
		slot: slotSubscriber.getSlot(),
		oraclePriceData: driftClient.getOracleDataForPerpMarket(0),
	});
	let j = 0;
	console.log(`l3-bids:`)
	for (const level of l3.bids	) {
		console.log(`  ${level.price}, ${level.size}, ${level.maker.toBase58()}-${level.orderId}`);
		j++;
		if (j > 3) {
			console.log('...');
			break;
		}
	}
	j = 0;
	console.log(`l3-asks:`)
	for (const level of l3.asks) {
		console.log(`  ${level.price}, ${level.size}, ${level.maker.toBase58()}-${level.orderId}`);
		j++;
		if (j > 3) {
			console.log('...');
			break;
		}
	}

	console.log('');
	await new Promise(resolve => setTimeout(resolve, 1000));
}

process.exit(0);
