// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  await hre.run('compile');

  // We get the contract to deploy
  const dappStakingPoolFactory = await hre.ethers.getContractFactory("DappStakingPool");
  const dappTokenFactory = await hre.ethers.getContractFactory("DappToken");

  const dappTokenContract = await dappTokenFactory.deploy();
  await dappTokenContract.deployed();
  console.log("Dapp Token deployed to:", dappTokenContract.address);

  const dappStakingPoolContract = await dappStakingPoolFactory.deploy();
  await dappStakingPoolContract.deployed();
  console.log("Dapp Staking Pool deployed to:", dappStakingPoolContract.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
