const Web3 = require("web3");
const { expect } = require("chai");
const { network, ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const liquidityProtectionSettingsAbi = require('../abi/ILiquidityProtectionSettings.json');
const liquidityProtectionStatsAbi = require('../abi/ILiquidityProtectionStats.json');
const liquidityProtectionAbi = require('../abi/ILiquidityProtection.json');
const converterRegistryDataAbi = require('../abi/IConverterRegistryData.json');
const bancorNetworkAbi = require('../abi/IBancorNetwork.json');
const converterAbi = require('../abi/ILiquidityPoolConverter.json');
const erc20Abi = require('../abi/IERC20.json');

const liquidityProtectionSettingsAdminAddress = "0xdfeE8DC240c6CadC2c7f7f9c257c259914dEa84E";
const liquidityProtectionSettingsContractAddress = "0xF7D28FaA1FE9Ea53279fE6e3Cde75175859bdF46";
const liquidityProtectionStoreContractAddress = "0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55";
const liquidityProtectionStatsContractAddress = "0x9712bb50dc6efb8a3d7d12cea500a50967d2d471";
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
  this.timeout(10000000);
  const web3 = new Web3();
  let dappTokenContract;
  let bntTokenContract;
  let dappBntTokenContract, bntToken;
  let dappStakingPoolContract;
  let dappBntAnchor;
  let liquidityProtectionContract;
  let funderContract;
  let owner, addr1, addr2, addr3, addr4, addr5, addrs,
    lp1,lp2,lp3,lp4,lp5,lp6, bancorNetworkContract,
    liquidityProtectionStatsContract,
    dappConverterContract;

  before(async function() {
    [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, bancorNetworkContract, ...addrs] = await ethers.getSigners();

    // impersonate account w/ permissions to approve converters
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [liquidityProtectionSettingsAdminAddress]
    });
    const liquidityProtectionSettingsAdminSigner = await ethers.provider.getSigner(liquidityProtectionSettingsAdminAddress);
    liquidityProtectionSettingsContract = new ethers.Contract(
      liquidityProtectionSettingsContractAddress,
      liquidityProtectionSettingsAbi,
      liquidityProtectionSettingsAdminSigner
    );
    liquidityProtectionStatsContract = new ethers.Contract(
      liquidityProtectionStatsContractAddress,
      liquidityProtectionStatsAbi,
      addr1
    );
    // console.log((await liquidityProtectionStatsContract.totalPoolAmount(converterDappBntAddress)).toString());
    // console.log((await liquidityProtectionStatsContract.totalReserveAmount(converterDappBntAddress, bntAddress)).toString());
    const converterRegistryDataContract = new ethers.Contract(
      converterRegistryDataAddress,
      converterRegistryDataAbi,
      owner
    );
    bancorNetworkContract = new ethers.Contract(
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
      "0x20000000000000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      bntOwnerAddress,
      "0x10000000000000",
    ]);

    // issue dapp
    await dappTokenContract.mint(addr1.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr2.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr3.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr4.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr5.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr6.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr7.address, ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint(addr8.address, ethers.utils.parseEther("100000000000"));
    // issue dapp
    await dappTokenContract.mint("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xcd3b766ccdd6ae721141f452c550ca635964ce71", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0x2546bcd3c84621e976d8185a91a922ae77ecec30", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xbda5747bfd65f08deb54cb465eb87d40e51b197e", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0xdd2fd4581271e230360230f9337d5c0430bf44c0", ethers.utils.parseEther("100000000000"));
    await dappTokenContract.mint("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ethers.utils.parseEther("100000000000"));
    // issue bnt
    await bntTokenContract.issue("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xcd3b766ccdd6ae721141f452c550ca635964ce71", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0x2546bcd3c84621e976d8185a91a922ae77ecec30", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xbda5747bfd65f08deb54cb465eb87d40e51b197e", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0xdd2fd4581271e230360230f9337d5c0430bf44c0", ethers.utils.parseEther("100000000000"));
    await bntTokenContract.issue("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ethers.utils.parseEther("100000000000"));

    // test IL
    await bntTokenContract.issue(addr1.address, ethers.utils.parseEther("100000000000"));

    dappConverterContract = new ethers.Contract(
      converterDappBntAddress,
      converterAbi,
      addr1
    );
    [ dappBntAnchor ] = await converterRegistryDataContract.getConvertibleTokenSmartTokens(dappTokenContract.address);
    dappBntTokenContract = await dappTokenFactory.attach(dappBntAnchor);
    bntToken = await dappTokenFactory.attach(bntAddress);
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
    await bntToken.connect(addr1).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    //  1 DAPP ~ 0.007301 BNT
    await dappConverterContract.addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );
    // console.log(`added liquidity BNT: ${ethers.utils.parseEther("650000")/1e18} DAPP: ${ethers.utils.parseEther("1000000000")/1e18}`);

    // add lp liquidity
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097"],
    });
    lp1 = await ethers.getSigner("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097");
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
    lp2 = await ethers.getSigner("0xcd3b766ccdd6ae721141f452c550ca635964ce71");
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
    lp3 = await ethers.getSigner("0x2546bcd3c84621e976d8185a91a922ae77ecec30");
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
    lp4 = await ethers.getSigner("0xbda5747bfd65f08deb54cb465eb87d40e51b197e");
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
    lp5 = await ethers.getSigner("0xdd2fd4581271e230360230f9337d5c0430bf44c0");
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
    lp6 = await ethers.getSigner("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199");
    await dappTokenContract.connect(lp6).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    await bntToken.connect(lp6).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    await dappConverterContract.connect(lp6).addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );
    
    await liquidityProtectionSettingsContract.addPoolToWhitelist(dappBntAnchor);

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
      // DAPPs per block in production will have 4 decimal places
      // 100k DAPPs per day / 6500 avg blocks per day ~15 DAPPs per block
      ethers.utils.parseEther("15")
    );


    await dappTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.connect(addr2).approve(dappStakingPoolContract.address, ethers.utils.parseEther("1000000"));
    await dappBntTokenContract.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("10"));
    // await dappBntTokenContract.connect(addr1).transfer("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199", ethers.utils.parseEther("10"));

    funderContract = await funderFactory.deploy(dappStakingPoolContract.address,dappTokenContract.address,7000);
    await funderContract.deployed();
    // await dappTokenContract.mint(funderContract.address, ethers.utils.parseEther("1000000"));
    
    console.log(`staking pool: ${dappStakingPoolContract.address}`)
    console.log(`dappBntTokenContract: ${dappBntTokenContract.address}\n`)
    
    await liquidityProtectionSettingsContract.setProtectionDelays(60,200);
    await dappTokenContract.connect(addr1).approve(dappStakingPoolContract.address, ethers.utils.parseEther("100000000"));

    // comment out if testing IL downside without DAPP as IL protection
    // await dappStakingPoolContract.fund(ethers.utils.parseEther("140000"), ethers.utils.parseEther("60000"));

    await dappTokenContract.connect(addr1).approve(bancorNetworkContract.address, '98999800000000000000000000000');
    await bntToken.connect(addr1).approve(bancorNetworkContract.address, '8911974684313573287562');
    
    // console.log(`${addr1.address}\nDAPP: ${(await dappTokenContract.balanceOf(addr1.address)).toString()}\nBNT: ${(await bntTokenContract.balanceOf(addr1.address)).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf(addr1.address)).toString()}\n`)
    // console.log((await liquidityProtectionStatsContract.totalPoolAmount(dappBntTokenContract.address)).toString());
    // console.log((await liquidityProtectionStatsContract.totalReserveAmount(dappBntTokenContract.address, bntToken.address)).toString());
    // console.log(`0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097\nDAPP: ${(await dappTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xdf3e18d64bc6a983f673ab319ccae4f1a57c7097")).toString()}\n`)
    // console.log(`0xcd3b766ccdd6ae721141f452c550ca635964ce71\nDAPP: ${(await dappTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xcd3b766ccdd6ae721141f452c550ca635964ce71")).toString()}\n`)
    // console.log(`0x2546bcd3c84621e976d8185a91a922ae77ecec30\nDAPP: ${(await dappTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0x2546bcd3c84621e976d8185a91a922ae77ecec30")).toString()}\n`)
    // console.log(`0xbda5747bfd65f08deb54cb465eb87d40e51b197e\nDAPP: ${(await dappTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xbda5747bfd65f08deb54cb465eb87d40e51b197e")).toString()}\n`)
    // console.log(`0xdd2fd4581271e230360230f9337d5c0430bf44c0\nDAPP: ${(await dappTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0xdd2fd4581271e230360230f9337d5c0430bf44c0")).toString()}\n`)
    // console.log(`DAPP/BNT Token address: ${dappBntTokenContract.address}`)
    // console.log(`0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199\nDAPP: ${(await dappTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\nBNT: ${(await bntTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf("0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199")).toString()}\n`)
  });

  it.skip("Should allow deploy lp", async function() {
    await dappTokenContract.connect(lp1).approve(dappStakingPoolContract.address, '989998000000000000000000');
    await dappStakingPoolContract.connect(lp1).stakeDapp('989998000000000000000000', 0);
  })

  // it("Should allow deploy lp", async function() {
  //   await dappTokenContract.connect(lp2).approve(dappStakingPoolContract.address, '989998000000000000000000');
  //   await dappStakingPoolContract.connect(lp2).stakeDapp('989998000000000000000000', 0);
  // })

  // it("Should allow deploy lp", async function() {
  //   await dappTokenContract.connect(lp3).approve(dappStakingPoolContract.address, '989998000000000000000000');
  //   await dappStakingPoolContract.connect(lp3).stakeDapp('989998000000000000000000', 0);
  // })

  // it("Should allow deploy lp", async function() {
  //   await dappTokenContract.connect(lp4).approve(dappStakingPoolContract.address, '989998000000000000000000');
  //   await dappStakingPoolContract.connect(lp4).stakeDapp('989998000000000000000000', 0);
  // })

  // it("Should allow deploy lp", async function() {
  //   await dappTokenContract.connect(lp5).approve(dappStakingPoolContract.address, '989998000000000000000000');
  //   await dappStakingPoolContract.connect(lp5).stakeDapp('989998000000000000000000', 0);
  // })

  it("Should allow deploy lp", async function() {
    await dappTokenContract.connect(lp6).approve(dappStakingPoolContract.address, '1000000000000000000000000');
    await dappStakingPoolContract.connect(lp6).stakeDapp('1000000000000000000000000', 0);
  })

  it("Should mature IL protection", async function() {
    // advance time
    await ethers.provider.send("evm_increaseTime", [8640000]); // 100 days in seconds
  })

  // it.skip("test IL upside", async function() {
  //   console.log('simulate IL')
  //   // simulate IL upside
  //   const conversionPath = await bancorNetworkContract.conversionPath(
  //     dappTokenContract.address,
  //     bntAddress
  //   );
  //   const rateByPath = await bancorNetworkContract.rateByPath(
  //     conversionPath,
  //     '98999800000000000000000000000'
  //   );
  //   // console.log(`${addr1.address}\nDAPP: ${(await dappTokenContract.balanceOf(addr1.address)).toString()}\nBNT: ${(await bntTokenContract.balanceOf(addr1.address)).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf(addr1.address)).toString()}\n`)
  //   // console.log((await liquidityProtectionStatsContract.totalPoolAmount(dappBntTokenContract.address)).toString());
  //   // console.log((await liquidityProtectionStatsContract.totalReserveAmount(dappBntTokenContract.address, bntToken.address)).toString());
  //   await bancorNetworkContract.convertByPath(
  //     conversionPath,
  //     '98999800000000000000000000000',
  //     rateByPath,
  //     addr1.address,
  //     zeroAddress,
  //     '0'
  //   );
  // })

  it("test IL downside", async function() {
    // simulate IL downside
    const conversionPath = await bancorNetworkContract.conversionPath(
      bntAddress,
      dappTokenContract.address
    );
    const rateByPath = await bancorNetworkContract.rateByPath(
      conversionPath,
      '8911974684313573287562'
    );
    console.log('totalPoolAmount - totalReserveAmount before')
    // console.log(`${addr1.address}\nDAPP: ${(await dappTokenContract.balanceOf(addr1.address)).toString()}\nBNT: ${(await bntTokenContract.balanceOf(addr1.address)).toString()}\nBNT/DAPP LP: ${(await dappBntTokenContract.balanceOf(addr1.address)).toString()}\n`)
    console.log((await liquidityProtectionStatsContract.totalPoolAmount(dappBntTokenContract.address)).toString());
    console.log((await liquidityProtectionStatsContract.totalPoolAmount(bntToken.address)).toString());
    console.log((await liquidityProtectionStatsContract.totalReserveAmount(dappBntTokenContract.address, bntToken.address)).toString());
    await bancorNetworkContract.convertByPath(
      conversionPath,
      '8911974684313573287562',
      rateByPath,
      addr1.address,
      zeroAddress,
      '0'
    );
    console.log('totalPoolAmount - totalReserveAmount after')
    console.log((await liquidityProtectionStatsContract.totalPoolAmount(dappBntTokenContract.address)).toString());
    // console.log((await liquidityProtectionStatsContract.totalPoolAmount(bntToken.address)).toString());
    console.log((await liquidityProtectionStatsContract.totalReserveAmount(dappBntTokenContract.address, bntToken.address)).toString());
    // console.log((await dappStakingPoolContract.userPoolInfo(0,lp6.address)).amount.toString())
    // console.log((await dappStakingPoolContract.userPoolInfo(0,lp6.address)).dappStaked.toString())
    // console.log((await dappStakingPoolContract.userPoolInfo(0,lp6.address)).lpAmount.toString())
  })

  it("Should allow claim BNT", async function() {
    const preBal = await bntTokenContract.balanceOf(lp6.address);
    console.log((await bntTokenContract.balanceOf(lp6.address)).toString())
    await ethers.provider.send("evm_increaseTime", [600]); // 10m in seconds
    await dappStakingPoolContract.connect(lp6).unstakeDapp(0);
    const pendingIl = (await dappStakingPoolContract.userPoolInfo(0,lp6.address)).claimableBnt;
    console.log((await dappStakingPoolContract.userPoolInfo(0,lp6.address)).claimableBnt.toString())
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds

    await dappStakingPoolContract.connect(lp6).claimBnt(1);
    await dappStakingPoolContract.connect(lp6).claimUserBnt(0);
    console.log((await bntTokenContract.balanceOf(lp6.address)).toString())
    const postBal = await bntTokenContract.balanceOf(lp6.address);
    expect(postBal.sub(preBal)).to.be.above('0');
    expect(postBal.sub(pendingIl)).to.equal(preBal);
  })

  // it("Should allow burn BNT", async function() {
  //   console.log((await dappStakingPoolContract.pendingBntIlBurn()).toString())
  //   await ethers.provider.send("evm_increaseTime", [600]); // 10m in seconds
  //   await dappStakingPoolContract.connect(lp5).burnBnt();
  //   console.log((await dappStakingPoolContract.pendingBntIlBurn()).toString())
  // })

  // it("Should allow pass volatility check", async function() {
  //   await ethers.provider.send("evm_increaseTime", [600]); // 10m in seconds
  // })

  it("Should deplete BNT IL", async function() {
    console.log('add more liquidity1');
    // add more liquidity
    await dappTokenContract.connect(addr1).approve(converterDappBntAddress, ethers.utils.parseEther("10000000000"));
    console.log('add more liquidity2');
    // await bntToken.connect(addr1).approve(converterDappBntAddress, ethers.utils.parseEther("15000000000"));
    console.log('add more liquidity3');
    await dappConverterContract.addLiquidity(
      [dappTokenContract.address, bntAddress],
      [ethers.utils.parseEther("1000000000"), ethers.utils.parseEther("650000")],
      '1'
    );

    console.log('stake');
    // stake
    await dappTokenContract.connect(lp6).approve(dappStakingPoolContract.address, '1000000000000000000000000');
    await dappStakingPoolContract.connect(lp6).stakeDapp('1000000000000000000000000', 0);

    console.log('simulate IL downside - conversionPath');
    // simulate IL downside
    const conversionPath = await bancorNetworkContract.conversionPath(
      bntAddress,
      dappTokenContract.address
    );
    console.log('simulate IL downside - rateByPath');
    const rateByPath = await bancorNetworkContract.rateByPath(
      conversionPath,
      '8911974684313573287562222'
    );
    console.log('simulate IL downside - convertByPath');
    await bancorNetworkContract.convertByPath(
      conversionPath,
      '8911974684313573287562222',
      rateByPath,
      addr1.address,
      zeroAddress,
      '0'
    );

    // claim
    console.log('claim');
    await ethers.provider.send("evm_increaseTime", [600]); // 10m in seconds
    await dappStakingPoolContract.connect(lp6).unstakeDapp(0);
    console.log((await dappStakingPoolContract.userPoolInfo(0,lp6.address)).claimableBnt.toString())
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds
    await dappStakingPoolContract.connect(lp6).claimBnt(1);
    await dappStakingPoolContract.connect(lp6).claimUserBnt(0);
    console.log((await bntTokenContract.balanceOf(lp6.address)).toString())
  })
});
