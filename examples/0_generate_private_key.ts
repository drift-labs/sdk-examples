import { execSync } from 'child_process';
import * as path from 'path';

const generatePrivateKey = () => {
  // Determine the path to private-key.json relative to the script's location.
  // The script is in examples/0_generate_private_key.ts
  // The key file should be at the project root: sdk-examples/private-key.json
  const privateKeyFilePath = path.resolve(__dirname, '../private-key.json');

  console.log(`Generating new Solana private key...`);
  console.log(`Output file: ${privateKeyFilePath}`);

  try {
    // The `solana-keygen new` command will create/overwrite the file specified by --outfile.
    // The `--no-bip39-passphrase` option ensures the command runs non-interactively.
    // Added --force to automatically overwrite if the file exists.
    const command = `solana-keygen new --no-bip39-passphrase --outfile ${privateKeyFilePath} --force`;
    
    console.log(`Executing command: ${command}`);
    execSync(command);

    console.log(`\nSuccessfully generated and saved new private key to ${privateKeyFilePath}.`);
    console.log(`This file can now be used by other examples that require a private key.`);
    console.log(`For instance, by setting the environment variable:`);
    console.log(`  PRIVATE_KEY=${privateKeyFilePath}`);
    console.log(`Or by having scripts read directly from this file path.`);

  } catch (error) {
    console.error('\nError generating private key:');
    if (error instanceof Error) {
      console.error(error.message);
      const execError = error as any; // Type assertion to access properties like stderr
      if (execError.stderr) {
        console.error('Stderr:\n', execError.stderr.toString());
      }
      if (execError.stdout) {
        console.error('Stdout:\n', execError.stdout.toString());
      }
    } else {
      console.error('An unknown error occurred:', error);
    }
    console.log("\nPlease ensure 'solana-keygen' is installed and accessible in your system's PATH.");
    process.exit(1); // Exit with error code
  }
};

// Execute the function when the script is run
generatePrivateKey();
