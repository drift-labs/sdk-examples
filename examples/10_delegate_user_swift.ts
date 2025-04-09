/**
 * This example demonstrates how to set up the Swift orders account and submit trades as a delegate
 * for another account. This example assumes we're trading subaccount 0 (default subaccount
 * for vaults).
 *
 * Delegates can be assigned to a specific `UserAccount` and have only trading permissions on that user account.
 * Drift vaults operate on this model. The `Vault` account owns the assets (`VaultDepositors` own shares of these
 * assets) and the manager assigns a delegate to trade the `Vault`'s account.
 *
 * 1) a `SignedMsgUserAccount` must be created before swift orders can be sent
 * 2) sign orders as the delegate
 *
 * For this example, set the environment variables:
 *
 * - PRIVATE_KEY: the keypair of the delegate (the account that will sign the orders)
 * - TARGET_AUTHORITY: the authority of the user account to trade (i.e. a vault)
 *
 */
import {
	DriftClient,
	BN,
	Wallet,
	loadKeypair,
	PositionDirection,
	SlotSubscriber,
	getSignedMsgUserAccountPublicKey,
	MarketType,
	isVariant,
	getMarketOrderParams,
	type OrderParams,
	generateSignedMsgUuid,
	digestSignature,
	type SignedMsgOrderParamsDelegateMessage,
    getOrderParams,
    OrderType
} from "@drift-labs/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
	throw new Error("PRIVATE_KEY environment variable is not set");
}

const _targetAuthority = process.env.TARGET_AUTHORITY;
if (!_targetAuthority) {
	throw new Error("TARGET_AUTHORITY environment variable is not set");
}
const targetAuthority = new PublicKey(_targetAuthority);
console.log(`Target authority: ${targetAuthority.toBase58()}`);

const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
	throw new Error("RPC_URL environment variable is not set");
}

const swiftUrl = "https://swift.drift.trade";

const keypair = loadKeypair(privateKey);
console.log(`Using keypair for delegate (signer): ${keypair.publicKey.toBase58()}`);

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

	subAccountIds: [0],
	activeSubAccountId: 0,
	authority: targetAuthority,
});
await driftClient.subscribe();

if (!driftClient.authority.equals(targetAuthority)) {
	throw new Error("Target authority does not match the authority set in the drift client");
}

// 1) Check if a `SignedMsgUserAccount` exists for the target authority, if not create one
const signedMsgUserAccount = getSignedMsgUserAccountPublicKey(driftClient.program.programId, targetAuthority);
const acc = await driftClient.connection.getAccountInfo(signedMsgUserAccount);
if (acc === null) {
	console.log(`Creating SignedMsgUserAccount for ${targetAuthority.toBase58()}`);
	const [txSig, signedMsgUserAccountPublicKey] = await driftClient.initializeSignedMsgUserOrders(driftClient.authority, 8);
	console.log(`Created SignedMsgUserAccount for ${targetAuthority.toBase58()}`);
	console.log(`  SignedMsgUserAccount: ${signedMsgUserAccountPublicKey.toBase58()}`);
	console.log(`  Tx: https://solscan.io/tx/${txSig}`);
}

const slotSubscriber = new SlotSubscriber(connection);
await slotSubscriber.subscribe();

const marketIndex = 0; // SOL-PERP
const direction = PositionDirection.LONG;
const orderSize = driftClient
	.getPerpMarketAccount(marketIndex)!
	.amm.minOrderSize.muln(2);

const slot = slotSubscriber.getSlot();
const oracleInfo = driftClient.getOracleDataForPerpMarket(marketIndex);

// absolute prices (auction starts 1% below oracle, ends 1% above oracle)
//const highPrice = oracleInfo.price.muln(101).divn(100);
//const lowPrice = oracleInfo.price.muln(99).divn(100);
//const orderType = OrderType.MARKET;

// oracle offset prices. Auction will float around the oracle price.
// We want to have tight slippage params, so float around oracle-10bps and oracle+10bps
const highPrice = oracleInfo.price.muln(10).divn(10000);
const lowPrice = oracleInfo.price.muln(10).divn(10000).neg();
const orderType = OrderType.ORACLE;

const marketOrderParams = getOrderParams({
	orderType,
	marketIndex,
	marketType: MarketType.PERP,
	direction,
	baseAssetAmount: orderSize,
	auctionStartPrice: isVariant(direction, 'long') ? lowPrice : highPrice,
	auctionEndPrice: isVariant(direction, 'long') ? highPrice : lowPrice,
	auctionDuration: 50,
});

const orderMessage: SignedMsgOrderParamsDelegateMessage = {
	signedMsgOrderParams: marketOrderParams as OrderParams,
	slot: new BN(slot),
	uuid: generateSignedMsgUuid(),
	stopLossOrderParams: null,
	takeProfitOrderParams: null,
	takerPubkey: await driftClient.getUserAccountPublicKey(), // NOT driftClient.authority,
};
const { orderParams: message, signature } =
	driftClient.signSignedMsgOrderParamsMessage(orderMessage, true);

const hash = digestSignature(Uint8Array.from(signature));
console.log(
	`Sending order in slot: ${slot}, time: ${Date.now()}, hash: ${hash}`
);

const response = await fetch(swiftUrl + '/orders', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		market_index: marketIndex,
		market_type: 'perp',
		message: message.toString(),
		signature: signature.toString('base64'),
		taker_pubkey: driftClient.authority.toBase58(), // authority of the user you are trading for
		signing_authority: driftClient.wallet.publicKey.toBase58(), // authority of the signing delegate
	}),
});

if (!response.ok) {
	console.error('Failed to send order', await response.json());
	process.exit(1);
}

const expireTime = Date.now() + 30_000;
while (Date.now() < expireTime) {
	const confirmResponse = await fetch(
		swiftUrl +
		'/confirmation/hash-status?hash=' +
		encodeURIComponent(hash)
	);

	console.log(confirmResponse);
	if (confirmResponse.ok) {
		console.log('Confirmed swift server received hash ', hash);
		break;
	} else if (confirmResponse.status >= 500) {
		console.log(`Error with order: ${hash}`);
		console.log(confirmResponse);
		break;
	}
	await new Promise((resolve) => setTimeout(resolve, 10000));
}

process.exit(0);
