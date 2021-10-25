/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

// const HDWalletProvider = require('@truffle/hdwallet-provider');
// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();
const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache-cli, geth or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
    kovan: {
      networkCheckTimeout: 1000000,
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://kovan.infura.io/v3/${process.env.INFURA_KEY}`
        ),
      network_id: 42,
      gas: 6721975,
      gasPrice: 161000000000,
      confirmations: 2,
      timeoutBlocks: 2000,
      skipDryRun: true
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
        ),
      network_id: 1,
      gas: 5500000,
      gasPrice: 161000000000,
      timeoutBlocks: 200,
      confirmations: 2,
      skipDryRun: true
    },
    ftm: {
      provider: () =>
        new HDWalletProvider(
          process.env.mnemonic,
          `https://black-wispy-glitter.fantom.quiknode.pro/${process.env.INFURA_KEY}`
        ),
      network_id: 250,
      timeoutBlocks: 200,
      confirmations: 2,
      skipDryRun: true
    },
  },

  plugins: ['truffle-contract-size',
    'solidity-coverage',
    'truffle-plugin-verify',
  ],

  // Set default mocha options here, use special reporters etc.
  mocha: {
    reporter: 'eth-gas-reporter',
    timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.8",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: true,
         runs: 200
       },
      }
    }
  },

  // Truffle DB is currently disabled by default; to enable it, change enabled: false to enabled: true
  //
  // Note: if you migrated your contracts prior to enabling this field in your Truffle project and want
  // those previously migrated contracts available in the .db directory, you will need to run the following:
  // $ truffle migrate --reset --compile-all

  db: {
    enabled: false
  }
};
