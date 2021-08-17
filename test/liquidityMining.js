const Web3 = require("web3");
const { expect } = require("chai");
const { network, ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const liquidityProtectionSettingsAbi = require('../abi/ILiquidityProtectionSettings.json');
const liquidityProtectionAbi = require('../abi/ILiquidityProtection.json');
const converterRegistryDataAbi = require('../abi/IConverterRegistryData.json');
const bancorNetworkAbi = require('../abi/IBancorNetwork.json');
const converterAbi = require('../abi/ILiquidityPoolConverter.json');
const erc20Abi = require('../abi/IERC20.json');

const liquidityProtectionSettingsAdminAddress = "0xdfeE8DC240c6CadC2c7f7f9c257c259914dEa84E";
const liquidityProtectionSettingsContractAddress = "0xF7D28FaA1FE9Ea53279fE6e3Cde75175859bdF46";
const liquidityProtectionStoreContractAddress = "0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55";
const liquidityProtectionContractAddress = "0x853c2D147a1BD7edA8FE0f58fb3C5294dB07220e";
const converterDappBntAddress = "0xd3840a74e6111f3d37a93dd67673f3de136e598a";
const converterRegistryDataAddress = "0x2BF0B9119535a7a5E9a3f8aD1444594845c3A86B";
const bancorNetworkAddress = "0x2F9EC37d6CcFFf1caB21733BdaDEdE11c823cCB0";
const bntAddress = "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c";
const bntOwnerAddress = "0xa489c2b5b36835a327851ab917a80562b5afc244";
const dappAddress = "0x939b462ee3311f8926c047d2b576c389092b1649";
const dappMinterAddress = "0xce9b04be4e87548d34b8a2180b85310424c84518";
const wethAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const bancorEthAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ethBntAddress = "0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533";
const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("Liquidity mining", function() {
  this.timeout(100000);
  const web3 = new Web3();
  let dappTokenContract;
  let bntTokenContract;
  let dappBntTokenContract;
  let dappStakingPoolContract;
  let dappBntAnchor;
  let liquidityProtectionContract;
  let funderContract;
  let owner, addr1, addr2, addr3, addr4, addrs;

  before(async function() {
    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

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

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [dappMinterAddress],
    });
    const dappMinterSigner = await ethers.getSigner(dappMinterAddress);
    dappTokenContract = new ethers.Contract(
      dappAddress,
      erc20Abi,
      dappMinterSigner
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [bntOwnerAddress],
    });
    const bntMinterSigner = await ethers.getSigner(bntOwnerAddress);
    bntTokenContract = new ethers.Contract(
      bntAddress,
      erc20Abi,
      bntMinterSigner
    );

    const dappStakingPoolFactory = await ethers.getContractFactory("DappStakingPool", addr1);
    const dappTokenFactory = await ethers.getContractFactory("DappToken", addr1);
    const funderFactory = await ethers.getContractFactory("Funder");

    await network.provider.send("hardhat_setBalance", [
      dappMinterAddress,
      "0x10000000000000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      bntOwnerAddress,
      "0x10000000000000",
    ]);

    await dappTokenContract.mint(addr1.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr2.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr3.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xcd3b766ccdd6ae721141f452c550ca635964ce71", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0x2546bcd3c84621e976d8185a91a922ae77ecec30", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xbda5747bfd65f08deb54cb465eb87d40e51b197e", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xdd2fd4581271e230360230f9337d5c0430bf44c0", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xcd3b766ccdd6ae721141f452c550ca635964ce71", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0x2546bcd3c84621e976d8185a91a922ae77ecec30", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xbda5747bfd65f08deb54cb465eb87d40e51b197e", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xdd2fd4581271e230360230f9337d5c0430bf44c0", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ethers.utils.parseEther("100000000000"));

    await dappTokenContract.mint(addr4.address, ethers.utils.parseEther("100000000000"));
    const dappConverterContract = new ethers.Contract(
      converterDappBntAddress,
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

    await dappTokenContract.connect(addr1).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    //  1 DAPP ~ 0.007301 BNT
    await dappConverterContract.addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097"],
    });
    const lp1 = await ethers.getSigner("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097");
    await dappTokenContract.connect(lp1).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp1).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp1).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xcd3b766ccdd6ae721141f452c550ca635964ce71"],
    });
    const lp2 = await ethers.getSigner("0xcd3b766ccdd6ae721141f452c550ca635964ce71");
    await dappTokenContract.connect(lp2).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp2).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp2).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x2546bcd3c84621e976d8185a91a922ae77ecec30"],
    });
    const lp3 = await ethers.getSigner("0x2546bcd3c84621e976d8185a91a922ae77ecec30");
    await dappTokenContract.connect(lp3).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp3).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp3).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xbda5747bfd65f08deb54cb465eb87d40e51b197e"],
    });
    const lp4 = await ethers.getSigner("0xbda5747bfd65f08deb54cb465eb87d40e51b197e");
    await dappTokenContract.connect(lp4).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp4).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp4).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xdd2fd4581271e230360230f9337d5c0430bf44c0"],
    });
    const lp5 = await ethers.getSigner("0xdd2fd4581271e230360230f9337d5c0430bf44c0");
    await dappTokenContract.connect(lp5).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp5).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp5).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"],
    });
    const lp6 = await ethers.getSigner("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199");
    await dappTokenContract.connect(lp6).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp6).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp6).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
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
      blockNumber,
      ethers.utils.parseEther("1")
    );

    await dappTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("10"));

    funderContract = await funderFactory.deploy(dappStakingPoolContract.address,dappTokenContract.address,7000);
    await funderContract.deployed();
    await dappTokenContract.mint(funderContract.address, ethers.utils.parseEther("1000000"));
    
    console.log(`staking pool: ${dappStakingPoolContract.address}`)
    console.log(`dappBntTokenContract: ${dappBntTokenContract.address}\n`)
    
    console.log(`0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097\nDAPP: ${(await dappTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\n`)
    console.log(`0xcd3b766ccdd6ae721141f452c550ca635964ce71\nDAPP: ${(await dappTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\n`)
    console.log(`0x2546bcd3c84621e976d8185a91a922ae77ecec30\nDAPP: ${(await dappTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\n`)
    console.log(`0xbda5747bfd65f08deb54cb465eb87d40e51b197e\nDAPP: ${(await dappTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\n`)
    console.log(`0xdd2fd4581271e230360230f9337d5c0430bf44c0\nDAPP: ${(await dappTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\n`)
    console.log(`0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199\nDAPP: ${(await dappTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\n`)

    await liquidityProtectionSettingsContract.setProtectionDelays(60,200);
    await dappTokenContract.connect(addr1).approve(dappStakingPoolContract.address, ethers.utils.parseEther("100000000"));
    await dappStakingPoolContract.fund(ethers.utils.parseEther("140000"), ethers.utils.parseEther("60000"));
  });

  it("Should allow fork deployment", async function() {

  })

//   it("Should allow funding dapp rewards and IL", async function() {
//     const prevDappSupply = await dappTokenContract.balanceOf(dappStakingPoolContract.address);
//     const prevDappILSupply = await dappStakingPoolContract.dappILSupply();
//     const prevDappRewardsSupply = await dappStakingPoolContract.dappRewardsSupply();
//     const prevFunderBalance = await dappTokenContract.balanceOf(funderContract.address);
//     expect(prevDappSupply.toString()).to.equal('0');
//     expect(prevDappILSupply.toString()).to.equal('0');
//     expect(prevDappRewardsSupply.toString()).to.equal('0');
//     expect(prevFunderBalance.toString()).to.equal(ethers.utils.parseEther("1000000"));
//     await dappTokenContract.connect(addr1).approve(dappStakingPoolContract.address, ethers.utils.parseEther("100000000"));
//     await dappStakingPoolContract.fund(ethers.utils.parseEther("100000"), ethers.utils.parseEther("100000"));
//     const postDappSupply = await dappTokenContract.balanceOf(dappStakingPoolContract.address);
//     const postDappILSupply = await dappStakingPoolContract.dappILSupply();
//     const postDappRewardsSupply = await dappStakingPoolContract.dappRewardsSupply();
//     expect(postDappSupply).to.equal(ethers.utils.parseEther("200000"));
//     expect(postDappILSupply).to.equal(ethers.utils.parseEther("100000"));
//     expect(postDappRewardsSupply).to.equal(ethers.utils.parseEther("100000"));
//     await funderContract.fund();
//     const postFundDappSupply = await dappTokenContract.balanceOf(dappStakingPoolContract.address);
//     const postFundDappILSupply = await dappStakingPoolContract.dappILSupply();
//     const postFundDappRewardsSupply = await dappStakingPoolContract.dappRewardsSupply();
//     const postFundFunderBalance = await dappTokenContract.balanceOf(funderContract.address);
//     expect(postFundFunderBalance.toString()).to.equal('0');
//     expect(postFundDappSupply).to.equal(ethers.utils.parseEther("1200000"));
//     expect(postFundDappILSupply).to.equal(ethers.utils.parseEther("400000"));
//     expect(postFundDappRewardsSupply).to.equal(ethers.utils.parseEther("800000"));
//   });

//   it("Should allow staking one sided dapp", async function() {
//     let user = addr2;
//     let userInfo;
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//     await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 0);
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0.005"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//   });

//   it("Should allow staking one sided dapp again", async function() {
//     let user = addr2;
//     let userInfo;
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0.005"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//     await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 0);
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect((userInfo.amount.sub(ethers.utils.parseEther("0.01"))).abs().lt(ethers.utils.parseEther("0.0000001"))).to.be.true;
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//   });

//   it("Should allow staking DAPP-BNT LP", async function() {
//     let user = addr2;
//     let userInfo;
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     // lpAmount?
//     let userPreAmount = userInfo.amount;
//     await dappStakingPoolContract.connect(user).stakeDappBnt(ethers.utils.parseEther("1"), 0);
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     // lpAmount?
//     let userPostAmount = userInfo.amount;
//     expect(userPostAmount.sub(userPreAmount)).to.equal(ethers.utils.parseEther("1"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("1"));
//   });

//   it("Should allow transferring positions and notifying", async function() {
//     let user = addr3;
//     let userInfo;
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//     await dappTokenContract.connect(user).approve(liquidityProtectionContractAddress, ethers.utils.parseEther("10000"));
//     const poolId = await liquidityProtectionContract.callStatic.addLiquidity(dappBntAnchor, dappTokenContract.address, ethers.utils.parseEther("1"), { from: user.address });
//     await liquidityProtectionContract.connect(user).addLiquidity(dappBntAnchor, dappTokenContract.address, ethers.utils.parseEther("1"));
//     const encodedPid = web3.eth.abi.encodeParameter('uint256', '0');
//     await liquidityProtectionContract.connect(user).transferPositionAndNotify(
//       poolId,
//       dappStakingPoolContract.address,
//       dappStakingPoolContract.address,
//       encodedPid
//     );
//     userInfo = await dappStakingPoolContract.userPoolInfo(0, user.address);
//     expect((userInfo.amount.sub(ethers.utils.parseEther("0.005"))).abs().lt(ethers.utils.parseEther("0.0000001"))).to.be.true;
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//   });

//   it("Should allow admin to add pool", async function() {
//     await dappStakingPoolContract.add('2000', '100');
//     const poolInfo = await dappStakingPoolContract.poolInfo(6);
//     expect(poolInfo.allocPoint.toString()).to.equal('2000');
//     expect(poolInfo.timeLocked.toString()).to.equal('100');
//     expect(poolInfo.accDappPerShare.toString()).to.equal('0');
//     expect(poolInfo.totalLpStaked.toString()).to.equal('0');
//   });

//   it("Should allow users to claim rewards", async function() {
//     let user = addr4;
//     let userInfo;
//     await dappTokenContract.connect(user).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
//     await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 6);

//     // advance time
//     const nowBlock = await ethers.provider.getBlockNumber();
//     const timestamp = (await ethers.provider.getBlock(nowBlock)).timestamp;
//     await ethers.provider.send("evm_mine", [ timestamp + 1000 ]);

//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     const preDappSupply = await dappTokenContract.balanceOf(addr4.address);
//     await dappStakingPoolContract.connect(user).harvest(6);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     const postDappSupply = await dappTokenContract.balanceOf(addr4.address);
//     expect(postDappSupply.sub(preDappSupply).toString()).to.be.above(ethers.utils.parseEther("0"));
//   });

//   it("Should allow staking to timelocked pool", async function() {
//     let user = addr2;
//     let userInfo;
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//     await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 6);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     expect((userInfo.amount.sub(ethers.utils.parseEther("0.005"))).abs().lt(ethers.utils.parseEther("0.0000001"))).to.be.true;
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//   });

//   it("Should not allow user to unstake early from timelocked pool", async function() {
//     let user = addr2;
//     let failed = false;
//     try {
//       await dappStakingPoolContract.connect(user).unstakeDapp('1000000', 6);
//     } catch (e) {
//       failed = true;
//     }
//     expect(failed).to.be.true;
//   });

//   it("Should allow user to unstake from timelocked pool after enough time", async function() {
//     let user = addr2;
//     let userInfo;
//     // advance time
//     const nowBlock = await ethers.provider.getBlockNumber();
//     const timestamp = (await ethers.provider.getBlock(nowBlock)).timestamp;
//     await ethers.provider.send("evm_mine", [ timestamp + 1000 ]);

//     await dappStakingPoolContract.connect(user).unstakeDapp('1000000', 6);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//   });

//   it("Should allow user to unstake DAPP and DAPP-BNT LP from timelocked pool", async function() {
//     let user = addr2;
//     let userInfo;
//     await dappStakingPoolContract.connect(user).stakeDapp(ethers.utils.parseEther("1"), 6);
//     await dappStakingPoolContract.connect(user).stakeDappBnt(ethers.utils.parseEther("1"), 6);

//     // advance time
//     const nowBlock = await ethers.provider.getBlockNumber();
//     const timestamp = (await ethers.provider.getBlock(nowBlock)).timestamp;
//     await ethers.provider.send("evm_mine", [ timestamp + 1000 ]);

//     const userPreDappBalance = await dappTokenContract.balanceOf(user.address);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     // failing, should pass
//     await dappStakingPoolContract.connect(user).unstakeDapp('1000000', 6);
//     await dappStakingPoolContract.connect(user).unstakeDappBnt('1000000000000000000', 6);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     userInfo = await dappStakingPoolContract.userPoolInfo(6, user.address);
//     expect(userInfo.amount).to.equal(ethers.utils.parseEther("0"));
//     expect(userInfo.lpAmount).to.equal(ethers.utils.parseEther("0"));
//     const userPostDappBalance = await dappTokenContract.balanceOf(user.address);
//     console.log((userPostDappBalance.sub(userPreDappBalance)).toString());
//   });
});