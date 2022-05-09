import { task } from "hardhat/config";

export default task("transfer-ownership", "Transfer ownership to the recipient")
  .addParam("newOwner", "The new owner address")
  .setAction(
    async ({ newOwner }, { deployments, getNamedAccounts, ethers }) => {
      const namedAccounts = await getNamedAccounts();

      console.log("newOwner: ", newOwner);
      console.log("namedAccounts: ", namedAccounts.deployer);

      const dappStakingPoolProxyAdminDeployment = await deployments.get(
        "DappStakingPoolProxyAdmin"
      );
      const dappStakingPoolProxyAdminAddress =
        dappStakingPoolProxyAdminDeployment.address;
      console.log({ dappStakingPoolProxyAdminAddress });

      const dappStakingPoolProxyAdminContract = await ethers.getContractAt(
        "DappStakingPoolProxyAdmin",
        dappStakingPoolProxyAdminAddress
      );

      console.log(
        `Transferring the ownership of DappStakingPoolProxyAdmin from ${namedAccounts.deployer} to ${newOwner}`
      );
      let tx = await dappStakingPoolProxyAdminContract.transferOwnership(
        newOwner
      );
      console.log("tx: ", tx);
      let receipt = await tx.wait();
      console.log("tx mined: ", receipt.transactionHash);
      console.log(
        `Transferring the ownership of DappStakingPoolProxyAdmin done!`
      );

      const dappStakingPoolDeployment = await deployments.get(
        "DappStakingPool"
      );
      const dappStakingPoolAddress = dappStakingPoolDeployment.address;
      console.log({ dappStakingPoolAddress });
      const dappStakingPoolContract = await ethers.getContractAt(
        "DappStakingPool",
        dappStakingPoolAddress
      );

      console.log(
        `Transferring the ownership of DappStakingPool from ${namedAccounts.deployer} to ${newOwner}`
      );
      tx = await dappStakingPoolContract.transferOwnership(newOwner);
      console.log("tx: ", tx);
      receipt = await tx.wait();
      console.log("tx mined: ", receipt.transactionHash);
      console.log(`Transferring the ownership of DappStakingPool done!`);
    }
  );
