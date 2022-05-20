import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { DEPLOY_PARAMS } from "../src/config";

/**
 * Hardhat task defining the contract deployments
 *
 * @param hre Hardhat environment to deploy to
 */
const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
): Promise<void> => {
  const chainId = await hre.getChainId();
  const { ethers } = hre;
  let deployer, alice;
  ({ deployer, alice } = await hre.getNamedAccounts());
  if (!deployer) {
    [deployer] = await hre.getUnnamedAccounts();
  }

  console.log({ chainId, deployer });

  if (!DEPLOY_PARAMS[chainId]) {
    console.log(
      `Deploy Params must be configured before deploying. \n`,
      DEPLOY_PARAMS
    );
    return;
  }

  const {
    liquidityProtection,
    liquidityProtectionStore,
    dappBntPoolAnchor,
    dappToken,
    bntToken,
    dappPerBlock,
  } = DEPLOY_PARAMS[chainId];

  const startBlock = await ethers.provider.getBlockNumber();

  // Deploy StakingProxy contract
  console.log(`Deploying DappStakingPool contract to chain: ${chainId}`);
  await hre.deployments.deploy("DappStakingPool", {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            liquidityProtection,
            liquidityProtectionStore,
            dappBntPoolAnchor,
            dappToken,
            bntToken,
            startBlock,
            dappPerBlock,
          ],
        },
      },
      viaAdminContract: "DappStakingPoolProxyAdmin",
    },
  });

  const dappStakingDeployment = await hre.deployments.get("DappStakingPool");
  const dappStakingPoolAddress = dappStakingDeployment.address;

  // Deploy Funder Contract
  await hre.deployments.deploy("Funder", {
    from: deployer,
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [dappStakingPoolAddress, dappToken, 0],
        },
      },
      viaAdminContract: "FunderProxyAdmin",
    },
  });
};

export default func;
