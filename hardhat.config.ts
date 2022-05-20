import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import config from "./.config.json";

import "./src/tasks/transferOwnership";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const hardhatConfig: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: { default: 0 },
    alice: { default: 1 },
    bob: { default: 2 },
    rando: { default: 3 },
  },
  networks: {
    hardhat: {
      forking: {
        blockNumber: 12786615,
        url:
          process.env.MAINNET_RPC_ENDPOINT ||
          `https://eth-mainnet.alchemyapi.io/v2/${config.alchemyKey}`,
      },
      blockGasLimit: 12e6,
    },
    rinkeby: {
      url:
        process.env.RINKEBY_RPC_ENDPOINT ||
        `https://eth-rinkeby.alchemyapi.io/v2/${config.alchemyKey}`,
      accounts: config.keys ?? [""],
      blockGasLimit: 12e6,
    },
  },
  mocha: {
    timeout: 120000,
    retries: 0,
    bail: true,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: config.etherscanApiKey,
  },
  gasReporter: {
    enabled: true,
  },
};

export default hardhatConfig;
