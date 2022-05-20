//SPDX-License-Identifier: MIT

pragma solidity 0.8.13;


import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/ILiquidityProtection.sol";
import "./interfaces/ILiquidityProtectionStore.sol";
import "./interfaces/ITransferPositionCallback.sol";

import "hardhat/console.sol";

contract DappStakingPool is
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  ITransferPositionCallback
{
  using SafeMath for uint256;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  struct UserPoolInfo {
    uint256 amount;
    uint256 dappStaked;
    uint256 lpAmount;
    uint256 pending;
    uint256 rewardDebt;
    uint256 positionId;
    uint256 depositTime;
    uint256 claimableBnt;
    uint256 bntLocked;
  }

  struct PoolInfo {
    uint256 allocPoint;
    uint256 timeLocked;
    uint256 lastRewardBlock;
    uint256 accDappPerShare;
    uint256 totalDappStaked;
    uint256 totalDappBntStaked;
    uint256 totalLpStaked;
  }

  ILiquidityProtection public liquidityProtection;
  ILiquidityProtectionStore public liquidityProtectionStore;

  IERC20Upgradeable public dappToken;
  IERC20Upgradeable public bntToken;

  address public dappBntPoolAnchor;

  uint256 public dappPerBlock;
  uint256 public startBlock;
  uint256 public totalAllocPoint;

  uint256 public dappILSupply; // amount of DAPP held by contract to cover IL
  uint256 public dappRewardsSupply; // amount of DAPP held by contract to cover rewards
  uint256 public pendingBntIlBurn; // BNT to be burned after 24hr lockup

  PoolInfo[] public poolInfo;
  mapping(uint256 => mapping(address => UserPoolInfo)) public userPoolInfo;
  mapping(uint256 => uint256) public userPoolTotalEntries;

  event DepositDapp(address indexed user, uint256 indexed pid, uint256 amount);
  event DepositDappBnt(
    address indexed user,
    uint256 indexed pid,
    uint256 amount
  );
  event withdrawDapp(address indexed user, uint256 indexed pid, uint256 amount);
  event withdrawDappBnt(
    address indexed user,
    uint256 indexed pid,
    uint256 amount
  );
  event PositionTransferred(uint256 newId, address indexed provider);

  function initialize(
    address _liquidityProtection,
    address _liquidityProtectionStore,
    address _dappBntPoolAnchor,
    address _dappToken,
    address _bntToken,
    uint256 _startBlock,
    uint256 _dappPerBlock
  ) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    liquidityProtection = ILiquidityProtection(_liquidityProtection);
    liquidityProtectionStore = ILiquidityProtectionStore(
      _liquidityProtectionStore
    );
    dappBntPoolAnchor = _dappBntPoolAnchor;
    dappToken = IERC20Upgradeable(_dappToken);
    bntToken = IERC20Upgradeable(_bntToken);
    startBlock = _startBlock;
    dappPerBlock = _dappPerBlock;

    dappToken.safeApprove(
      address(liquidityProtection),
      uint256(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 0,
        timeLocked: 0,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 476,
        timeLocked: 90 days,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 952,
        timeLocked: 120 days,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 1905,
        timeLocked: 240 days,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 2857,
        timeLocked: 540 days,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    poolInfo.push(
      PoolInfo({
        allocPoint: 3810,
        timeLocked: 720 days,
        lastRewardBlock: _startBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
    // 476 + 952 + 1905 + 2857 + 3810 = 10000
    totalAllocPoint = 10000;
  }

  /**
   * @dev Returns pending rewards of user
   */
  function getPendingRewards(uint256 pid, address user)
    external
    view
    returns (uint256)
  {
    UserPoolInfo storage userInfo = userPoolInfo[pid][user];
    PoolInfo storage pool = poolInfo[pid];
    uint256 accDappPerShare = pool.accDappPerShare;
    if (block.number > pool.lastRewardBlock && pool.totalLpStaked != 0) {
      uint256 multiplier = (block.number).sub(pool.lastRewardBlock);
      uint256 dappReward = multiplier
        .mul(dappPerBlock)
        .mul(pool.allocPoint)
        .div(totalAllocPoint);
      accDappPerShare = pool.accDappPerShare.add(
        dappReward.mul(1e12).div(pool.totalLpStaked)
      );
    }
    return
      userInfo.pending.add(
        userInfo.amount.mul(accDappPerShare).div(1e12).sub(userInfo.rewardDebt)
      );
  }

  /**
   * @dev Transfers position to pools contract
   */
  function onTransferPosition(
    uint256 newId,
    address provider,
    bytes calldata data
  ) external override {
    require(
      msg.sender == address(liquidityProtection),
      "Liquidity protection only"
    );
    uint256 pid = abi.decode(data, (uint256));
    _updateRewards(pid);

    UserPoolInfo storage userInfo = userPoolInfo[pid][provider];
    PoolInfo storage pool = poolInfo[pid];

    require(userInfo.positionId == 0, "user already has position in pool");
    (
      address newProvider,
      address poolToken,
      ,
      uint256 lpAmount,
      uint256 dappAmount,
      ,
      ,

    ) = liquidityProtectionStore.protectedLiquidity(newId);
    require(address(this) == newProvider);
    require(poolToken == dappBntPoolAnchor, "wrong position type");

    if (userInfo.amount > 0) {
      uint256 pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(
        userInfo.rewardDebt
      );
      userInfo.pending = userInfo.pending.add(pending);
    } else {
      userPoolTotalEntries[pid]++;
    }

    pool.totalDappStaked = pool.totalDappStaked.add(dappAmount);
    pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
    userInfo.positionId = newId;
    userInfo.amount = userInfo.amount.add(lpAmount);
    userInfo.dappStaked = userInfo.dappStaked.add(dappAmount);
    userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
    userInfo.depositTime = block.timestamp;
    emit PositionTransferred(newId, provider);
  }

  /**
   * @dev if there is no more bnt for single sided staking,
   * users can still stake dapp-bnt tokens
   */
  function stakeDappBnt(uint256 amount, uint256 pid) external nonReentrant {
    _updateRewards(pid);

    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    PoolInfo storage pool = poolInfo[pid];

    if (userInfo.amount > 0) {
      uint256 pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(
        userInfo.rewardDebt
      );
      userInfo.pending = userInfo.pending.add(pending);
    } else {
      userPoolTotalEntries[pid]++;
    }

    amount = _deflationCheck(IERC20Upgradeable(dappBntPoolAnchor), amount);

    pool.totalLpStaked = pool.totalLpStaked.add(amount);
    pool.totalDappBntStaked = pool.totalDappBntStaked.add(amount);
    userInfo.amount = userInfo.amount.add(amount);
    userInfo.lpAmount = userInfo.lpAmount.add(amount);
    userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
    userInfo.depositTime = block.timestamp;
  }

  /**
   * @dev Returns DAPPBNT LP tokens to user
   */
  function unstakeDappBnt(uint256 amount, uint256 pid) external nonReentrant {
    harvest(pid);
    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    PoolInfo storage pool = poolInfo[pid];
    require(
      userInfo.depositTime + pool.timeLocked <= block.timestamp,
      "Still locked"
    );

    pool.totalLpStaked = pool.totalLpStaked.sub(amount);
    pool.totalDappBntStaked = pool.totalDappBntStaked.sub(amount);
    // this line validates user balance
    userInfo.amount = userInfo.amount.sub(amount);
    userInfo.lpAmount = userInfo.lpAmount.sub(amount);
    userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
    if (userInfo.amount == 0) {
      userPoolTotalEntries[pid]--;
    }
    IERC20Upgradeable(dappBntPoolAnchor).safeTransfer(msg.sender, amount);
  }

  /**
   * @dev Allows user to single sided stake DAPP tokens
   */
  function stakeDapp(uint256 amount, uint256 pid) external nonReentrant {
    _updateRewards(pid);
    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    PoolInfo storage pool = poolInfo[pid];

    if (userInfo.amount == 0) {
      userPoolTotalEntries[pid]++;
    }

    // If user is staked, we unstake then restake
    if (userInfo.dappStaked > 0) {
      uint256 pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(
        userInfo.rewardDebt
      );
      userInfo.pending = userInfo.pending.add(pending);
      uint256 prevDappBal = dappToken.balanceOf(msg.sender);
      _unstakeDapp(pid);
      uint256 postDappBal = dappToken.balanceOf(msg.sender);
      amount = amount.add(postDappBal).sub(prevDappBal);

      amount = _deflationCheck(dappToken, amount);

      uint256 positionId = liquidityProtection.addLiquidity(
        dappBntPoolAnchor,
        address(dappToken),
        amount
      );
      uint256 lpAmount = _getLpAmount(positionId);
      pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
      pool.totalDappStaked = pool.totalDappStaked.add(amount);
      userInfo.positionId = positionId;
      userInfo.amount = userInfo.amount.add(lpAmount);
      userInfo.dappStaked = amount;
      userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
      userInfo.depositTime = block.timestamp;
    } else {
      amount = _deflationCheck(dappToken, amount);
      uint256 positionId = liquidityProtection.addLiquidity(
        dappBntPoolAnchor,
        address(dappToken),
        amount
      );
      uint256 lpAmount = _getLpAmount(positionId);
      pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
      pool.totalDappStaked = pool.totalDappStaked.add(amount);
      userInfo.positionId = positionId;
      userInfo.amount = userInfo.amount.add(lpAmount);
      userInfo.dappStaked = amount;
      userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
      userInfo.depositTime = block.timestamp;
    }
  }

  /**
   * @dev Allows user to unstake single sided staked DAPP tokens
   */
  function unstakeDapp(uint256 pid) external nonReentrant {
    PoolInfo memory pool = poolInfo[pid];
    UserPoolInfo memory userInfo = userPoolInfo[pid][msg.sender];
    require(
      userInfo.depositTime + pool.timeLocked <= block.timestamp,
      "Still locked"
    );
    _unstakeDapp(pid);
  }

  /**
   * @dev Allows user to harvest rewards
   */
  function harvest(uint256 pid) public {
    _updateRewards(pid);
    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    PoolInfo storage pool = poolInfo[pid];
    uint256 pendingReward = userInfo.pending.add(
      userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(
        userInfo.rewardDebt
      )
    );
    if (pendingReward > 0) {
      if (dappRewardsSupply > pendingReward) {
        dappRewardsSupply = dappRewardsSupply.sub(pendingReward);
        userInfo.pending = 0;
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(
          1e12
        );
        dappToken.safeTransfer(msg.sender, pendingReward);
      } else {
        userInfo.pending = pendingReward.sub(dappRewardsSupply);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(
          1e12
        );
        uint256 amount = dappRewardsSupply;
        dappRewardsSupply = 0;
        dappToken.safeTransfer(msg.sender, amount);
      }
    }
  }

  /**
   * @dev Allows user or dao to fund IL protection and/or staking rewards
   */
  function fund(uint256 dappRewardsAmount, uint256 dappILAmount)
    external
    nonReentrant
  {
    dappRewardsAmount = _deflationCheck(dappToken, dappRewardsAmount);
    dappILAmount = _deflationCheck(dappToken, dappILAmount);
    dappRewardsSupply = dappRewardsSupply.add(dappRewardsAmount);
    dappILSupply = dappILSupply.add(dappILAmount);
  }

  /**
   * @dev Allows owner to add pool
   */
  function add(uint256 _allocPoint, uint256 _timeLocked) external onlyOwner {
    _updatePools();
    uint256 lastRewardBlock = block.number > startBlock
      ? block.number
      : startBlock;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);
    poolInfo.push(
      PoolInfo({
        allocPoint: _allocPoint,
        timeLocked: _timeLocked,
        lastRewardBlock: lastRewardBlock,
        accDappPerShare: 0,
        totalDappStaked: 0,
        totalDappBntStaked: 0,
        totalLpStaked: 0
      })
    );
  }

  /**
   * @dev Allows owner to set pool allocation point
   */
  function set(uint256 pid, uint256 _allocPoint) external onlyOwner {
    _updatePools();
    uint256 prevAllocPoint = poolInfo[pid].allocPoint;
    poolInfo[pid].allocPoint = _allocPoint;
    if (prevAllocPoint != _allocPoint) {
      totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
    }
  }

  /**
   * @dev Allows owner to set DAPP token rewards issued per block
   */
  function setDappPerBlock(uint256 _dappPerBlock) external onlyOwner {
    _updatePools();
    dappPerBlock = _dappPerBlock;
  }

  /**
   * @dev Allows user to claim BNT. User must wait 24 hours
   * for BNT to unlock, then call claimBnt before claiming
   */
  function claimUserBnt(uint256 pid) external {
    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    require(userInfo.bntLocked <= block.timestamp, "BNT still locked");
    uint256 bntBal = bntToken.balanceOf(address(this));
    uint256 amount = userInfo.claimableBnt;
    require(bntBal >= amount, "insufficient bnt to claim");
    userInfo.claimableBnt = 0;
    userInfo.bntLocked = 0;
    bntToken.safeTransfer(msg.sender, amount);
  }

  /**
   * @dev Allows user to claim BNT for pools contract. User must wait
   * 24 hours for BNT to unlock, after can call and receive.
   */
  function claimBnt(uint256 num) external {
    liquidityProtection.claimBalance(0, num + 1);
  }

  /**
   * @dev Allows user or dao to burn BNT
   */
  function burnBnt() external {
    require(pendingBntIlBurn > 0, "no pending bnt to burn");
    uint256 bntBal = bntToken.balanceOf(address(this));
    if (bntBal >= pendingBntIlBurn) {
      uint256 amount = pendingBntIlBurn;
      pendingBntIlBurn = 0;
      bntToken.safeTransfer(
        address(0x000000000000000000000000000000000000dEaD),
        amount
      );
    } else {
      pendingBntIlBurn = pendingBntIlBurn.sub(bntBal);
      bntToken.safeTransfer(
        address(0x000000000000000000000000000000000000dEaD),
        bntBal
      );
    }
  }

  /**
   * @dev Returns LP amount
   */
  function _getLpAmount(uint256 positionId) private view returns (uint256) {
    (, , , uint256 lpAmount, , , , ) = liquidityProtectionStore
      .protectedLiquidity(positionId);
    return lpAmount;
  }

  /**
   * @dev Returns deposited amount post potential deflation
   */
  function _deflationCheck(IERC20Upgradeable token, uint256 amount)
    private
    returns (uint256)
  {
    uint256 prevDappBal = token.balanceOf(address(this));
    token.safeTransferFrom(msg.sender, address(this), amount);
    uint256 postDappBal = token.balanceOf(address(this));
    return postDappBal.sub(prevDappBal);
  }

  /**
   * @dev Updates rewards for pool
   */
  function _updateRewards(uint256 pid) private {
    PoolInfo storage pool = poolInfo[pid];
    if (block.number <= pool.lastRewardBlock) {
      return;
    }
    if (pool.totalLpStaked == 0) {
      pool.lastRewardBlock = block.number;
      return;
    }
    uint256 multiplier = (block.number).sub(pool.lastRewardBlock);
    uint256 dappReward = multiplier.mul(dappPerBlock).mul(pool.allocPoint).div(
      totalAllocPoint
    );
    pool.accDappPerShare = pool.accDappPerShare.add(
      dappReward.mul(1e12).div(pool.totalLpStaked)
    );
    pool.lastRewardBlock = block.number;
  }

  /**
   * @dev Updates rewards for all pools
   */
  function _updatePools() private {
    uint256 length = poolInfo.length;
    for (uint256 pid = 0; pid < length; ++pid) {
      _updateRewards(pid);
    }
  }

  /**
   * @dev Allows user to unstake DAPP
   */
  function _unstakeDapp(uint256 pid) private {
    harvest(pid);
    UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
    PoolInfo storage pool = poolInfo[pid];

    uint256 prevLpAmount = _getLpAmount(userInfo.positionId);
    uint256 preDappBal = dappToken.balanceOf(address(this));

    (uint256 targetAmount, , uint256 networkAmount) = liquidityProtection
      .removeLiquidityReturn(userInfo.positionId, 1000000, block.timestamp);
    liquidityProtection.removeLiquidity(userInfo.positionId, 1000000);

    uint256 postDappBal = dappToken.balanceOf(address(this));
    uint256 dappReceived = postDappBal.sub(preDappBal);

    pool.totalLpStaked = pool.totalLpStaked.sub(prevLpAmount);
    pool.totalDappStaked = pool.totalDappStaked.sub(userInfo.dappStaked);
    userInfo.amount = userInfo.amount.sub(prevLpAmount);
    userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);

    uint256 finalDappAmount = targetAmount < userInfo.dappStaked
      ? targetAmount
      : userInfo.dappStaked;

    userInfo.dappStaked = 0;
    userInfo.positionId = 0;

    if (userInfo.amount == 0) {
      userPoolTotalEntries[pid]--;
    }

    if (finalDappAmount > dappReceived) {
      uint256 diff = finalDappAmount.sub(dappReceived);
      if (dappILSupply >= diff) {
        pendingBntIlBurn = pendingBntIlBurn.add(networkAmount);
        dappILSupply = dappILSupply.sub(diff);
        dappToken.safeTransfer(msg.sender, finalDappAmount);
      } else {
        userInfo.claimableBnt = userInfo.claimableBnt.add(networkAmount);
        userInfo.bntLocked = block.timestamp + 24 hours;
        uint256 amount = dappILSupply;
        dappILSupply = 0;
        dappToken.safeTransfer(msg.sender, dappReceived.add(amount));
      }
    } else {
      pendingBntIlBurn = pendingBntIlBurn.add(networkAmount);
      dappToken.safeTransfer(msg.sender, dappReceived);
    }
  }
}
