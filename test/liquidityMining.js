const { expect } = require("chai");
const { network, ethers } = require("hardhat");

const liquidityProtectionSettingsAbi = require('../abi/ILiquidityProtectionSettings.json');

const liquidityProtectionSettingsAdminAddress = "0xdfeE8DC240c6CadC2c7f7f9c257c259914dEa84E";
const liquidityProtectionContractAddress = "0x853c2D147a1BD7edA8FE0f58fb3C5294dB07220e";
const bntAddress = "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c";

describe("Liquidity mining", function() {
  let dappTokenContract;
  let dappStakingPoolContract;
  let owner, addr1, addr2, addrs;

  beforeAll(async function() {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // impersonate account w/ permissions to approve converters
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [liquidityProtectionSettingsAdminAddress]
    });
    const liquidityProtectionSettingsAdminSigner = await ethers.provider.getSigner(liquidityProtectionSettingsAdminAddress);
    const liquidityProtectionContract = new ethers.Contract(
      liquidityProtectionContractAddress,
      liquidityProtectionSettingsAbi,
      liquidityProtectionSettingsAdminSigner
    );

    const dappStakingPoolFactory = await ethers.getContractFactory("DappStakingPool");
    const dappTokenFactory = await ethers.getContractFactory("DappToken");
    const converterDeployerFactory = await ethers.getContractFactory("ConverterDeployer");

    const converterDeployerContract = await converterDeployerFactory.deploy();
    await converterDeployerContract.deployed();

    dappTokenContract = await dappTokenFactory.deploy();
    await dappTokenContract.deployed();

    const converterAddress = await converterDeployerContract.deployConverter(
      [dappTokenContract.address, bntAddress],
      [500000, 500000]
    );
    console.log(`Deployed DAPPBNT converter to address ${converterAddress}`);
    await liquidityProtectionContract.addPoolToWhitelist(converterAddress);
    console.log('Whitelisted converter');

    dappStakingPoolContract = await dappStakingPoolFactory.deploy();
    await dappStakingPoolContract.deployed();
    await dappStakingPoolContract.initialize(
      liquidityProtectionContractAddress,
      bntAddress,
      dappTokenContract.address,
      converterAddress
    );

  });

  it("Should allow staking", async function() {
    //const Greeter = await ethers.getContractFactory("Greeter");
    //const greeter = await Greeter.deploy("Hello, world!");
    
    //await greeter.deployed();
    //expect(await greeter.greet()).to.equal("Hello, world!");

    //await greeter.setGreeting("Hola, mundo!");
    //expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
