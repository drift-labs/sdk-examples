# drift-examples

Examples here are written using `bun` 1.1.9. If you using `node`, recommended version is v20.18.0. And use [`@drift-labs/sdk`](https://www.npmjs.com/package/@drift-labs/sdk).
If you are using the drift sdk in browser environment, it's recommended to use [`@drift-labs/sdk-browser`](https://www.npmjs.com/package/@drift-labs/sdk-browser) instead.

## Install dependencies:

```bash
bun install
```

All examples require the following environment variables:

- `PRIVATE_KEY`: The private key of the account to use, can be:
    - numbers array (from `solana-keygen new`)
	- base58 encoded private key (phantom exported private key)
	- a file to any of the above
- `RPC_URL`: The RPC URL of the network to use for the example, you need a proper one
    - https://helius.xyz/
	- https://www.triton.one/


## Run Examples

Each file under `examples/` is an example, start with:

```bash
bun run example/1_init_user.ts
```

