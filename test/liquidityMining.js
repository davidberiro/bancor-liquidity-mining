const { expect } = require("chai");
const { network, ethers } = require("hardhat");

const liquidityProtectionSettingsAbi = require('../abi/ILiquidityProtectionSettings.json');
const liquidityProtectionAbi = require('../abi/ILiquidityProtection.json');
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
  let dappBntAnchor;
  let liquidityProtectionContract;
  let owner, addr1, addr2, addr3, addrs;

  before(async function() {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

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
    liquidityProtectionContract = new ethers.Contract(
      liquidityProtectionContractAddress,
      liquidityProtectionAbi,
      ethers.provider
    );

    const dappStakingPoolFactory = await ethers.getContractFactory("DappStakingPool", addr1);
    const dappTokenFactory = await ethers.getContractFactory("DappToken", addr1);
    const converterDeployerFactory = await ethers.getContractFactory("ConverterDeployer");

    const converterDeployerContract = await converterDeployerFactory.deploy();
    await converterDeployerContract.deployed();

    dappTokenContract = await dappTokenFactory.deploy();
    await dappTokenContract.deployed();
    await dappTokenContract.mint(addr1.address, ethers.utils.parseEther("100000000"));
    await dappTokenContract.mint(addr2.address, ethers.utils.parseEther("100000000"));
    await dappTokenContract.mint(addr3.address, ethers.utils.parseEther("100000000"));

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
    [ dappBntAnchor ] = await converterRegistryDataContract.getConvertibleTokenSmartTokens(dappTokenContract.address);
    await liquidityProtectionSettingsContract.addPoolToWhitelist(dappBntAnchor);

    dappBntTokenContract = await dappTokenFactory.attach(dappBntAnchor);
    const bntToken = await dappTokenFactory.attach(bntAddress);
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

    await dappTokenContract.approve(converterAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.approve(converterAddress, ethers.utils.parseEther("10000000000"));
    await dappConverterContract.addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("100000"), ethers.utils.parseEther("15000")],
      '1'
    );

    const blockNumber = await ethers.provider.getBlockNumber();
    dappStakingPoolContract = await dappStakingPoolFactory.deploy();
    await dappStakingPoolContract.deployed();
    await dappStakingPoolContract.initialize(
      liquidityProtectionContractAddress,
      liquidityProtectionStoreContractAddress,
      dappBntAnchor,
      dappTokenContract.address,
      bntAddress,
      blockNumber
    );

    await dappTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.transfer(addr2.address, ethers.utils.parseEther("10"));
  });

  it("Should allow funding dapp rewards and IL", async function() {
    const prevDappSupply = await dappTokenContract.balanceOf(dappStakingPoolContract.address);
    const prevDappILSupply = await dappStakingPoolContract.dappILSupply();
    const prevDappRewardsSupply = await dappStakingPoolContract.dappRewardsSupply();
    expect(prevDappSupply.toString()).to.equal('0');
    expect(prevDappILSupply.toString()).to.equal('0');
    expect(prevDappRewardsSupply.toString()).to.equal('0');
    await dappTokenContract.approve(dappStakingPoolContract.address, ethers.utils.parseEther("100000000"));
    await dappStakingPoolContract.fund(ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"));
    const postDappSupply = await dappTokenContract.balanceOf(dappStakingPoolContract.address);
    const postDappILSupply = await dappStakingPoolContract.dappILSupply();
    const postDappRewardsSupply = await dappStakingPoolContract.dappRewardsSupply();
    expect(postDappSupply).to.equal(ethers.utils.parseEther("200000"));
    expect(postDappILSupply).to.equal(ethers.utils.parseEther("100000"));
    expect(postDappRewardsSupply).to.equal(ethers.utils.parseEther("100000"));
  });

  it("Should allow staking one sided dapp", async function() {
    let user = addr2;
    let userInfo;
    userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
    await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 0);
    userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
    expect(userInfo.amount).to.equal(ethers.utils.parseEther("0.5"));
    expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
  });

  it("Should allow staking DAPP-BNT LP", async function() {
    let user = addr2;
    let userInfo;
    userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
    await dappStakingPoolContract.connect(user).stakeDappBnt(ethers.utils.parseEther("1"), 0);
    userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
    expect(userInfo.amount).to.equal(ethers.utils.parseEther("1.5"));
    expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("1"));
  });

  it("Should allow transferring positions and notifying", async function() {
    let user = addr3;
    let userInfo;
    await dappTokenContract.connect(user).approve(liquidityProtectionContractAddress, ethers.utils.parseEther("10000"));
    const poolId = await liquidityProtectionContract.callStatic.addLiquidity(dappBntAnchor, dappTokenContract.address, ethers.utils.parseEther("1"), { from: user.address });
    console.log('pool id ' + poolId.toString());
    await liquidityProtectionContract.connect(user).addLiquidity(dappBntAnchor, dappTokenContract.address, ethers.utils.parseEther("1"));
  });

  it("Should allow users to claim rewards", async function() {
  });
});
