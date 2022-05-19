import { HardhatUserConfig, task  } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy";
import "@openzeppelin/hardhat-upgrades";
import config from "./tsconfig.json";
// import { HardhatUserConfig, task } from "hardhat/config";

import "./src/tasks/transferOwnership";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const hardhatConfig: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.2",
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
      // forking: {
      //   blockNumber: 12786615,
      //   url: "https://eth-mainnet.alchemyapi.io/v2/1r11J-NozgHAJb8ndBuHoZJsNVJBwORW",
      // },
      blockGasLimit: 12e6,
    },
    rinkeby: {
      url: "https://eth-rinkeby.alchemyapi.io/v2/1r11J-NozgHAJb8ndBuHoZJsNVJBwORW",
      // url: `https://eth-rinkeby.alchemyapi.io/v2/${config.alchemyKey}`,
      //accounts: config.keys ?? [""],
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
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default hardhatConfig;
