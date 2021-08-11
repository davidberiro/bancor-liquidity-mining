//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILiquidityProtection.sol";
import "./interfaces/ILiquidityProtectionStore.sol";
import "./interfaces/ITransferPositionCallback.sol";

import "hardhat/console.sol";

contract DappStakingPool is OwnableUpgradeable, ITransferPositionCallback {
    using SafeMath for uint;

    struct UserPoolInfo {
        uint amount;
        uint lpAmount;
        uint pending;
        uint rewardDebt;
        uint positionId;
        uint depositTime;
    }

    struct PoolInfo {
        uint allocPoint;
        uint timeLocked;
        uint lastRewardBlock;
        uint accDappPerShare;
        uint totalLpStaked;
    }

    ILiquidityProtection public liquidityProtection;
    ILiquidityProtectionStore public liquidityProtectionStore;

    IERC20 public dappToken;
    IERC20 public bntToken;

    address public dappBntPoolAnchor;

    uint public dappPerBlock;
    uint public startBlock;
    uint public totalAllocPoint;

    uint public dappILSupply; // amount of DAPP held by contract to cover IL
    uint public dappRewardsSupply; // amount of DAPP held by contract to cover rewards

    PoolInfo[] public poolInfo;
    mapping (uint => mapping (address => UserPoolInfo)) public userPoolInfo;

    event DepositDapp(address indexed user, uint indexed pid, uint amount);
    event DepositDappBnt(address indexed user, uint indexed pid, uint amount);
    event withdrawDapp(address indexed user, uint indexed pid, uint amount);
    event withdrawDappBnt(address indexed user, uint indexed pid, uint amount);

    function initialize(
        address _liquidityProtection,
        address _liquidityProtectionStore,
        address _dappBntPoolAnchor,
        address _dappToken,
        address _bntToken,
        uint _startBlock
    ) external initializer {
        __Ownable_init(); 
        liquidityProtection = ILiquidityProtection(_liquidityProtection);
        liquidityProtectionStore = ILiquidityProtectionStore(_liquidityProtectionStore);
        dappBntPoolAnchor = _dappBntPoolAnchor;
        dappToken = IERC20(_dappToken);
        bntToken = IERC20(_bntToken);
        startBlock = _startBlock;

        dappToken.approve(address(liquidityProtection), uint(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF));
        poolInfo.push(PoolInfo({
            allocPoint: 0,
            timeLocked: 0,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        // 3m*30days*24hours*60min*60s = 90 days in seconds
        poolInfo.push(PoolInfo({
            allocPoint: 476,
            timeLocked: 3 minutes,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 952,
            timeLocked: 6 minutes,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 1905,
            timeLocked: 12 minutes,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 2857,
            timeLocked: 18 minutes,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 3810,
            timeLocked: 24 minutes,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
        // 476 + 952 + 1905 + 2857 + 3810 = 10000
        totalAllocPoint = 10000;
    }

    function getLpAmount(uint positionId) private view returns (uint) {
        (,,, uint lpAmount,,,,) = liquidityProtectionStore.protectedLiquidity(positionId);
        return lpAmount;
    }

    function updateRewards(uint pid) public {
        PoolInfo storage pool = poolInfo[pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        if (pool.totalLpStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint multiplier = (block.number).sub(pool.lastRewardBlock);
        uint dappReward = multiplier.mul(dappPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        pool.accDappPerShare = pool.accDappPerShare.add(dappReward.mul(1e12).div(pool.totalLpStaked));
        pool.lastRewardBlock = block.number;
    }

    function onTransferPosition(uint256 newId, address provider, bytes calldata data) external override {
        uint pid = abi.decode(data, (uint));
        updateRewards(pid);

        UserPoolInfo storage userInfo = userPoolInfo[pid][provider];
        PoolInfo storage pool = poolInfo[pid];

        require(userInfo.positionId == 0, "user already has position in pool");
        (, address poolToken,, uint lpAmount,,,,) = liquidityProtectionStore.protectedLiquidity(newId);
        require(poolToken == dappBntPoolAnchor, "wrong position type");

        if (userInfo.amount > 0) {
            uint pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt);
            userInfo.pending = userInfo.pending.add(pending);
        }

        pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
        userInfo.positionId = newId;
        userInfo.amount = userInfo.amount.add(lpAmount);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
        userInfo.depositTime = now;
    }

    // if there is no more bnt for single sided staking, users can still
    // stake dapp-bnt tokens
    function stakeDappBnt(uint amount, uint pid) public {
        updateRewards(pid);
        IERC20(dappBntPoolAnchor).transferFrom(msg.sender, address(this), amount);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];

        if (userInfo.amount > 0) {
            uint pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt);
            userInfo.pending = userInfo.pending.add(pending);
        }
        pool.totalLpStaked = pool.totalLpStaked.add(amount);
        userInfo.amount = userInfo.amount.add(amount);
        userInfo.lpAmount = userInfo.lpAmount.add(amount);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
        userInfo.depositTime = now;
    }

    function unstakeDappBnt(uint amount, uint pid) public {
        updateRewards(pid);
        harvest(pid);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];
        require(userInfo.depositTime + pool.timeLocked <= now, "Still locked");

        pool.totalLpStaked = pool.totalLpStaked.sub(amount);
        // this line validates user balance
        userInfo.amount = userInfo.amount.sub(amount);
        userInfo.lpAmount = userInfo.lpAmount.sub(amount);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
        IERC20(dappBntPoolAnchor).transfer(msg.sender, amount);
    }

    function stakeDapp(uint amount, uint pid) public {
        updateRewards(pid);
        dappToken.transferFrom(msg.sender, address(this), amount);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];

        // scoping for stack too deep error
        {
            if (userInfo.amount > 0) {
                uint pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt);
                userInfo.pending = userInfo.pending.add(pending);
            } else {
                uint positionId = liquidityProtection.addLiquidity(dappBntPoolAnchor, address(dappToken), amount);
                uint lpAmount = getLpAmount(positionId);
                pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
                userInfo.positionId = positionId;
                userInfo.amount = lpAmount;
                userInfo.rewardDebt = lpAmount.mul(pool.accDappPerShare).div(1e12);
                userInfo.depositTime = now;
                return;
            }
        }
            uint prevLpAmount = getLpAmount(userInfo.positionId);
        {
            (uint targetAmount, uint baseAmount, uint networkAmount) = liquidityProtection.removeLiquidityReturn(userInfo.positionId, 1000000, block.timestamp);
            // to make sure the contract only manages one position per user, we withdraw
            // all then redeposit with added amount
            liquidityProtection.removeLiquidity(userInfo.positionId, 1000000);
            uint diff = targetAmount.sub(baseAmount);
            if (diff > 0) {
                if (dappILSupply >= diff) {
                    // cover difference from IL, burn BNT
                    dappILSupply = dappILSupply.sub(diff);
                    amount = amount.add(targetAmount);
                    bntToken.transfer(address(0), networkAmount);
                } else {
                    // if can't afford, only add base amount, compensate with bnt
                    amount = amount.add(baseAmount);
                    bntToken.transfer(msg.sender, networkAmount);
                }
            } else {
                amount = amount.add(targetAmount);
            }
        }
        {
            uint positionId = liquidityProtection.addLiquidity(dappBntPoolAnchor, address(dappToken), amount);
            uint postLpAmount = getLpAmount(positionId);
            uint newLpStaked = postLpAmount.sub(prevLpAmount);
            pool.totalLpStaked = pool.totalLpStaked.add(newLpStaked);
            userInfo.positionId = positionId;
            userInfo.amount = userInfo.amount.add(newLpStaked);
            userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
            userInfo.depositTime = now;
        }
    }

    // portion of total staked, PPM
    function unstakeDapp(uint32 portion, uint pid) public {
        updateRewards(pid);
        harvest(pid);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];
        require(userInfo.depositTime + pool.timeLocked <= now, "Still locked");

        uint prevLpAmount = getLpAmount(userInfo.positionId);
        (uint targetAmount, uint baseAmount, uint networkAmount) = liquidityProtection.removeLiquidityReturn(userInfo.positionId, portion, block.timestamp);
        console.log(baseAmount);
        console.log(targetAmount);
        liquidityProtection.removeLiquidity(userInfo.positionId, portion);
        uint diff = targetAmount.sub(baseAmount);
        uint newLpAmount = getLpAmount(userInfo.positionId);

        pool.totalLpStaked = pool.totalLpStaked.sub(userInfo.amount.sub(newLpAmount));
        userInfo.amount = userInfo.amount.sub(prevLpAmount.sub(newLpAmount));
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);

        if (diff > 0) {
            if (dappILSupply >= diff) {
                // cover difference from IL, burn BNT
                dappILSupply = dappILSupply.sub(diff);
                dappToken.transfer(msg.sender, targetAmount);
                bntToken.transfer(address(0x000000000000000000000000000000000000dEaD), networkAmount);
            } else {
                // if can't afford, only add base amount, compensate with bnt
                dappToken.transfer(msg.sender, baseAmount);
                bntToken.transfer(msg.sender, networkAmount);
            }
        }
    }

    function harvest(uint pid) public {
        updateRewards(pid);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];
        uint pendingReward = userInfo.pending.add(userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt));
        if(pendingReward > 0) {
            if (dappRewardsSupply > pendingReward) {
                dappToken.transfer(msg.sender, pendingReward);
                dappRewardsSupply = dappRewardsSupply.sub(pendingReward);
                userInfo.pending = 0;
                userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
            } else {
                dappToken.transfer(msg.sender, dappRewardsSupply);
                dappRewardsSupply = 0;
                userInfo.pending = pendingReward.sub(dappRewardsSupply);
                userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
            }
        }
    }

    function fund(uint dappRewardsAmount, uint dappILAmount) public {
        dappToken.transferFrom(msg.sender, address(this), dappRewardsAmount);
        dappToken.transferFrom(msg.sender, address(this), dappILAmount);
        dappRewardsSupply = dappRewardsSupply.add(dappRewardsAmount);
        dappILSupply = dappILSupply.add(dappILAmount);
    }

    function add(uint256 _allocPoint, uint256 _timeLocked) public onlyOwner {
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(PoolInfo({
            allocPoint: _allocPoint,
            timeLocked: _timeLocked,
            lastRewardBlock: lastRewardBlock,
            accDappPerShare: 0,
            totalLpStaked: 0
        }));
    }

    function set(uint256 pid, uint256 _allocPoint) public onlyOwner {
        uint256 prevAllocPoint = poolInfo[pid].allocPoint;
        poolInfo[pid].allocPoint = _allocPoint;
        if (prevAllocPoint != _allocPoint) {
            totalAllocPoint = totalAllocPoint.sub(prevAllocPoint).add(_allocPoint);
        }
    }
}
