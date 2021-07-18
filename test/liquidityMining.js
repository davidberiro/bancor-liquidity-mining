const { expect } = require("chai");
const { network, ethers } = require("hardhat");

const liquidityProtectionSettingsAbi = require('../abi/ILiquidityProtectionSettings.json');
const converterRegistryDataAbi = require('../abi/IConverterRegistryData.json');
const bancorNetworkAbi = require('../abi/IBancorNetwork.json');
const converterAbi = require('../abi/ILiquidityPoolConverter.json');

const liquidityProtectionSettingsAdminAddress = "0xdfeE8DC240c6CadC2c7f7f9c257c259914dEa84E";
const liquidityProtectionSettingsContractAddress = "0xF7D28FaA1FE9Ea53279fE6e3Cde75175859bdF46";
const liquidityProtectionStoreContractAddress = "0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55";
const liquidityProtectionContractAddress = "0x853c2D147a1BD7edA8FE0f58fb3C5294dB07220e";
const converterRegistryDataAddress = "0x2BF0B9119535a7a5E9a3f8aD1444594845c3A86B";
const bancorNetworkAddress = "0x2F9EC37d6CcFFf1caB21733BdaDEdE11c823cCB0";
const bntAddress = "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c";
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const bancorEthAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ethBntAddress = "0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533";
const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("Liquidity mining", function() {
  this.timeout(100000);
  let dappTokenContract;
  let dappBntTokenContract;
  let dappStakingPoolContract;
  let owner, addr1, addr2, addrs;

  before(async function() {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // impersonate account w/ permissions to approve converters
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [liquidityProtectionSettingsAdminAddress]
    });
    const liquidityProtectionSettingsAdminSigner = await ethers.provider.getSigner(liquidityProtectionSettingsAdminAddress);
    const liquidityProtectionSettingsContract = new ethers.Contract(
      liquidityProtectionSettingsContractAddress,
      liquidityProtectionSettingsAbi,
      liquidityProtectionSettingsAdminSigner
    );
    const converterRegistryDataContract = new ethers.Contract(
      converterRegistryDataAddress,
      converterRegistryDataAbi,
      owner
    );
    const bancorNetworkContract = new ethers.Contract(
      bancorNetworkAddress,
      bancorNetworkAbi,
      addr1
    );

    const dappStakingPoolFactory = await ethers.getContractFactory("DappStakingPool", addr1);
    const dappTokenFactory = await ethers.getContractFactory("DappToken", addr1);
    const converterDeployerFactory = await ethers.getContractFactory("ConverterDeployer");

    const converterDeployerContract = await converterDeployerFactory.deploy();
    await converterDeployerContract.deployed();

    dappTokenContract = await dappTokenFactory.deploy();
    await dappTokenContract.deployed();
    await dappTokenContract.mint(addr1.address, ethers.utils.parseEther("100000000"));

    const tx = await converterDeployerContract.deployConverter(
      [dappTokenContract.address, bntAddress],
      [500000, 500000]
    );
    const txReceipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const converterAddress = '0x'+txReceipt.logs[txReceipt.logs.length-1].data.substring(26);
    const dappConverterContract = new ethers.Contract(
      converterAddress,
      converterAbi,
      addr1
    );
    const [ dappBntAnchor ] = await converterRegistryDataContract.getConvertibleTokenSmartTokens(dappTokenContract.address);
    await liquidityProtectionSettingsContract.addPoolToWhitelist(dappBntAnchor);

    dappBntTokenContract = await dappTokenFactory.attach(dappBntAnchor);
    const bntToken = await dappTokenFactory.attach(bntAddress);
    //console.log((await bntToken.balanceOf(addr1.address)).toString());
    await bancorNetworkContract.convertByPath(
      [bancorEthAddress, ethBntAddress, bntAddress],
      ethers.utils.parseEther("1000"),
      '1',
      addr1.address,
      zeroAddress,
      '0',
      {
        value: ethers.utils.parseEther("1000")
      }
    );
    //console.log((await bntToken.balanceOf(addr1.address)).toString());

    //console.log((await dappBntTokenContract.balanceOf(addr1.address)).toString());
    await dappTokenContract.approve(converterAddress, ethers.utils.parseEther("100000000"));
    await bntToken.approve(converterAddress, ethers.utils.parseEther("100000000"));
    await dappConverterContract.addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000"), ethers.utils.parseEther("15000")],
      '1'
    );
    //console.log((await dappBntTokenContract.balanceOf(addr1.address)).toString());

    dappStakingPoolContract = await dappStakingPoolFactory.deploy();
    await dappStakingPoolContract.deployed();
    await dappStakingPoolContract.initialize(
      liquidityProtectionContractAddress,
      liquidityProtectionStoreContractAddress,
      dappBntAnchor,
      dappTokenContract.address,
      bntAddress
    );

    await dappTokenContract.approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
  });

  it("Should allow staking", async function() {
    let userInfo;
    userInfo = await dappStakingPoolContract.userStakeInfo(addr1.address);
    console.log(userInfo);
    console.log((await dappTokenContract.balanceOf(addr1.address)).toString())
    userInfo = await dappStakingPoolContract.userStakeInfo(owner.address);
    console.log(userInfo);
    await dappStakingPoolContract.stakeDapp(ethers.utils.parseEther("1"));
    console.log((await dappTokenContract.balanceOf(addr1.address)).toString())
    userInfo = await dappStakingPoolContract.userStakeInfo(addr1.address);
    console.log(userInfo);
    userInfo = await dappStakingPoolContract.userStakeInfo(owner.address);
    console.log(userInfo);
    await dappStakingPoolContract.stakeDappBnt(ethers.utils.parseEther("1"));
    userInfo = await dappStakingPoolContract.userStakeInfo(addr1.address);
    console.log(userInfo);
    userInfo = await dappStakingPoolContract.userStakeInfo(owner.address);
    console.log(userInfo);
  });
});
