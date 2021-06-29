require("@nomiclabs/hardhat-waffle");
require("hardhat-abi-exporter");

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    local: {
      url: "http://localhost:8545",
      timeout: 100000
    }
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
      }
    ]
  },
  abiExporter: {
    flat: true
  }
};

