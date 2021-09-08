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
        uint dappStaked;
        uint lpAmount;
        uint pending;
        uint rewardDebt;
        uint positionId;
        uint depositTime;
        uint claimableBnt;
    }

    struct PoolInfo {
        uint allocPoint;
        uint timeLocked;
        uint lastRewardBlock;
        uint accDappPerShare;
        uint totalDappStaked;
        uint totalDappBntStaked;
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
    uint public pendingBntIlBurn; // BNT to be burned after 24hr lockup

    PoolInfo[] public poolInfo;
    mapping (uint => mapping (address => UserPoolInfo)) public userPoolInfo;

    event DepositDapp(address indexed user, uint indexed pid, uint amount);
    event DepositDappBnt(address indexed user, uint indexed pid, uint amount);
    event withdrawDapp(address indexed user, uint indexed pid, uint amount);
    event withdrawDappBnt(address indexed user, uint indexed pid, uint amount);
    event PositionTransferred(uint256 newId, address indexed provider);

    function initialize(
        address _liquidityProtection,
        address _liquidityProtectionStore,
        address _dappBntPoolAnchor,
        address _dappToken,
        address _bntToken,
        uint _startBlock,
        uint _dappPerBlock
    ) external initializer {
        __Ownable_init(); 
        liquidityProtection = ILiquidityProtection(_liquidityProtection);
        liquidityProtectionStore = ILiquidityProtectionStore(_liquidityProtectionStore);
        dappBntPoolAnchor = _dappBntPoolAnchor;
        dappToken = IERC20(_dappToken);
        bntToken = IERC20(_bntToken);
        startBlock = _startBlock;
        dappPerBlock = _dappPerBlock;

        dappToken.approve(address(liquidityProtection), uint(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF));
        poolInfo.push(PoolInfo({
            allocPoint: 0,
            timeLocked: 0,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 476,
            timeLocked: 90 days,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 952,
            timeLocked: 120 days,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 1905,
            timeLocked: 240 days,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 2857,
            timeLocked: 540 days,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        poolInfo.push(PoolInfo({
            allocPoint: 3810,
            timeLocked: 720 days,
            lastRewardBlock: _startBlock,
            accDappPerShare: 0,
            totalDappStaked: 0,
            totalDappBntStaked: 0,
            totalLpStaked: 0
        }));
        // 476 + 952 + 1905 + 2857 + 3810 = 10000
        totalAllocPoint = 10000;
    }

    function getPendingRewards(uint256 pid, address user) external view returns (uint256) {
        UserPoolInfo storage userInfo = userPoolInfo[pid][user];
        PoolInfo storage pool = poolInfo[pid];
        uint accDappPerShare = pool.accDappPerShare;
        if (block.number > pool.lastRewardBlock && pool.totalLpStaked != 0) {
            uint multiplier = (block.number).sub(pool.lastRewardBlock);
            uint dappReward = multiplier.mul(dappPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            accDappPerShare = pool.accDappPerShare.add(dappReward.mul(1e12).div(pool.totalLpStaked));
        }
        return userInfo.pending.add(userInfo.amount.mul(accDappPerShare).div(1e12).sub(userInfo.rewardDebt));
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
        (, address poolToken,, uint lpAmount, uint dappAmount,,,) = liquidityProtectionStore.protectedLiquidity(newId);
        require(poolToken == dappBntPoolAnchor, "wrong position type");

        if (userInfo.amount > 0) {
            uint pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt);
            userInfo.pending = userInfo.pending.add(pending);
        }

        pool.totalDappStaked = pool.totalDappStaked.add(dappAmount);
        pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
        userInfo.positionId = newId;
        userInfo.amount = userInfo.amount.add(lpAmount);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
        userInfo.depositTime = now;
        emit PositionTransferred(newId, provider);
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
        pool.totalDappBntStaked = pool.totalDappBntStaked.add(amount);
        userInfo.amount = userInfo.amount.add(amount);
        userInfo.lpAmount = userInfo.lpAmount.add(amount);
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
        userInfo.depositTime = now;
    }

    function unstakeDappBnt(uint amount, uint pid) public {
        harvest(pid);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];
        require(userInfo.depositTime + pool.timeLocked <= now, "Still locked");

        pool.totalLpStaked = pool.totalLpStaked.sub(amount);
        pool.totalDappBntStaked = pool.totalDappBntStaked.sub(amount);
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
        uint calcAmount;

        // scoping for stack too deep error
        {
            if (userInfo.amount > 0) {
                uint pending = userInfo.amount.mul(pool.accDappPerShare).div(1e12).sub(userInfo.rewardDebt);
                userInfo.pending = userInfo.pending.add(pending);
            } else {
                uint positionId = liquidityProtection.addLiquidity(dappBntPoolAnchor, address(dappToken), amount);
                uint lpAmount = getLpAmount(positionId);
                pool.totalLpStaked = pool.totalLpStaked.add(lpAmount);
                pool.totalDappStaked = pool.totalDappStaked.add(amount);
                userInfo.positionId = positionId;
                userInfo.amount = lpAmount;
                userInfo.dappStaked = amount;
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
                    calcAmount = amount.add(targetAmount);
                    bntToken.transfer(address(0x000000000000000000000000000000000000dEaD), networkAmount);
                } else {
                    // if can't afford, only add base amount, compensate with bnt
                    calcAmount = amount.add(baseAmount);
                    bntToken.transfer(msg.sender, networkAmount);
                }
            } else {
                calcAmount = amount.add(targetAmount);
            }
        }
        {
            uint positionId = liquidityProtection.addLiquidity(dappBntPoolAnchor, address(dappToken), calcAmount);
            uint postLpAmount = getLpAmount(positionId);
            uint newLpStaked = postLpAmount.sub(prevLpAmount);
            pool.totalLpStaked = pool.totalLpStaked.add(newLpStaked);
            pool.totalDappStaked = pool.totalDappStaked.add(amount);
            userInfo.dappStaked = userInfo.dappStaked.add(amount);
            userInfo.positionId = positionId;
            userInfo.amount = userInfo.amount.add(newLpStaked);
            userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);
            userInfo.depositTime = now;
        }
    }

    function unstakeDapp(uint pid) public {
        harvest(pid);
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        PoolInfo storage pool = poolInfo[pid];
        require(userInfo.depositTime + pool.timeLocked <= now, "Still locked");

        uint prevLpAmount = getLpAmount(userInfo.positionId);
        uint preDappBal = dappToken.balanceOf(address(this));
        console.log('locked balance');
        console.log(liquidityProtectionStore.lockedBalanceCount(address(this)));
        (uint targetAmount, uint baseAmount, uint networkAmount) = liquidityProtection.removeLiquidityReturn(userInfo.positionId, 1000000, block.timestamp);
        console.log('networkAmount');
        console.log(networkAmount);
        liquidityProtection.removeLiquidity(userInfo.positionId, 1000000);
        uint postDappBal = dappToken.balanceOf(address(this));
        // uint receivedDapp = postDappBal.sub(preDappBal);
        // uint receivedBnt = postBntBal.sub(preBntBal);
        uint newLpAmount = getLpAmount(userInfo.positionId);

        pool.totalLpStaked = pool.totalLpStaked.sub(prevLpAmount.sub(newLpAmount));
        pool.totalDappStaked = pool.totalDappStaked.sub(userInfo.dappStaked);
        userInfo.amount = userInfo.amount.sub(prevLpAmount.sub(newLpAmount));
        userInfo.rewardDebt = userInfo.amount.mul(pool.accDappPerShare).div(1e12);

        // if received dapp < staked, attempt to cover IL
        // if IL supply can cover in full, do so, burn any received BNT
        // if IL supply cannot and BNT received, send dapp received and bnt received
        // if IL supply cannot and no BNT received, send dapp received + remaining IL if any
        if(postDappBal.sub(preDappBal) < userInfo.dappStaked) {
            uint diff = userInfo.dappStaked.sub(postDappBal.sub(preDappBal));
            if (dappILSupply >= diff) {
                // console.log("if (dappILSupply >= diff) {");
                // console.log(dappILSupply/1e18);
                // console.log(diff/1e18);
                // console.log((dappILSupply.sub(diff))/1e18);
                // cover difference from IL, burn BNT
                dappILSupply = dappILSupply.sub(diff);
                // console.log(dappILSupply/1e18);
                dappToken.transfer(msg.sender, postDappBal.sub(preDappBal).add(diff));
                
                // log pending rewards to burn
                pendingBntIlBurn = pendingBntIlBurn.add(networkAmount);
            } else {
                console.log("else");
                // if networkAmount > 0 for BNT, add to pending
                // if no BNT received, empty remaining IL
                uint dappTokenAmt = postDappBal.sub(preDappBal);
                if(networkAmount > 0) {
                    // log pending BNT IL to claim
                    userInfo.claimableBnt = userInfo.claimableBnt.add(networkAmount);
                } else {
                    // compensate with remaining IL
                    dappTokenAmt.add(dappILSupply);
                    dappILSupply = 0;
                }
                dappToken.transfer(msg.sender, dappTokenAmt);
            }
        } else {
            console.log("big else");
            dappToken.transfer(msg.sender, postDappBal.sub(preDappBal));
        }

        userInfo.dappStaked = 0;

        if(userInfo.amount == 0) userInfo.positionId = 0;
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
            totalDappStaked: 0,
            totalDappBntStaked: 0,
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

    function setDappPerBlock(uint _dappPerBlock) public onlyOwner {
        dappPerBlock = _dappPerBlock;
    }

    function claimBnt(uint pid) public {
        UserPoolInfo storage userInfo = userPoolInfo[pid][msg.sender];
        liquidityProtection.claimBalance(0,2);
        bntToken.transfer(msg.sender, userInfo.claimableBnt);
        userInfo.claimableBnt = 0;
    }

}