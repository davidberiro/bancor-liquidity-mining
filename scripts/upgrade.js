
// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
    const poolProxyAddress = '';
    const fundProxyAddress = '';
    
    const dappStakingPoolFactoryV2 = await hre.ethers.getContractFactory("DappStakingPool");
    const funderFactoryV2 = await hre.ethers.getContractFactory("Funder");
    console.log("Preparing upgrade...");

    const poolV2Address = await upgrades.prepareUpgrade(poolProxyAddress, dappStakingPoolFactoryV2);
    const fundV2Address = await upgrades.prepareUpgrade(fundProxyAddress, funderFactoryV2);
    console.log("PoolV2 at:", poolV2Address);
    console.log("FundV2 at:", fundV2Address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
