# drift-examples

Examples here are written using `bun` 1.1.9. If you are using `node`, the recommended version is v20.18.0. And use [`@drift-labs/sdk`](https://www.npmjs.com/package/@drift-labs/sdk).
If you are using the drift sdk in browser environment, it's recommended to use [`@drift-labs/sdk-browser`](https://www.npmjs.com/package/@drift-labs/sdk-browser) instead.

# Use Node Version Manager

Install NVM if you haven't already:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`
```
Install compatible Node version:
```
nvm install 20.18.0`
nvm use`
```
Verify the installation:
```
node --version
```
## Install dependencies:

```bash
bun install
```

All examples require the following environment variables:

- `PRIVATE_KEY`: The private key of the account to use, can be:
    - numbers array (from `solana-keygen new`)
	- base58 encoded private key (phantom exported private key)
	- a file to any of the above. 
	  **To generate a compatible private key file, run the `0_generate_private_key.ts` script:**
	  ```bash
	  bun run examples/0_generate_private_key.ts
	  ```
	  This will create a `private-key.json` file in the root of this project (e.g., `sdk-examples/private-key.json`).
	  You should then set your `PRIVATE_KEY` environment variable to this path, for example, in your `.env` file:
	  `PRIVATE_KEY=./private-key.json`
- `RPC_URL`: The RPC URL of the network to use for the example, you need a proper one
    - https://helius.xyz/
	- https://www.triton.one/


## Run Examples

Each file under `examples/` is an example, start with:

```bash
bun run example/1_init_user.ts
```