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
  const funderFactory = await hre.ethers.getContractFactory("Funder");

  const dappStakingPoolProxy = await upgrades.deployProxy(dappStakingPoolFactory, [
    "0x853c2D147a1BD7edA8FE0f58fb3C5294dB07220e", // liquidity protection
    "0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55", // liq protection store
    "0x33A23d447De16a8Ff802c9Fcc917465Df01A3977", // dapp bnt anchor
    "0x939b462ee3311f8926c047d2b576c389092b1649", // dapp token
    "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c", // bnt token
    await hre.ethers.provider.getBlockNumber(), // start block
    205000 // 20.5 DAPPs per block with 4 decimal precision
  ]);
  console.log("dapp Staking Pool Proxy deployed to:", dappStakingPoolProxy.address);
  await dappStakingPoolFactory.attach(dappStakingPoolProxy.address);

  // start at 0% for rewards so all goes to IL
  const funderProxy = await upgrades.deployProxy(funderFactory, [dappStakingPoolProxy.address,"0x939b462ee3311f8926c047d2b576c389092b1649",0]);
  console.log("funder Proxy deployed to:", funderProxy.address);
  await funderFactory.attach(funderProxy.address);

  const gnosisSafe = '0x5288d36112fe21be1a24b236be887C90c3AE7090';
 
  console.log("Transferring ownership of ProxyAdmin...");
  // The owner of the ProxyAdmin can upgrade our contracts
  await upgrades.admin.transferProxyAdminOwnership(gnosisSafe);
  console.log("Transferred ownership of ProxyAdmin to:", gnosisSafe);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
