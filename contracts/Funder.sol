// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IDappStakingPool.sol";

import "hardhat/console.sol";

contract Funder is OwnableUpgradeable {

    address public stakingContract;
    IERC20 public dappTokenContract;
    uint public rewardsPercentage;
  
    function initialize(
        address _stakingContract,
        address _dappTokenContract,
        uint _rewardsPercentage // out of 10000
    ) external initializer {
        __Ownable_init(); 
        stakingContract = _stakingContract;
        dappTokenContract = IERC20(_dappTokenContract);
        rewardsPercentage = _rewardsPercentage;
    }

    /**
        * @dev update rewards percentage
        */
    function update(uint _rewardsPercentage) external {
        require(_msgSender() == owner(), "sender not authorized");
        rewardsPercentage = _rewardsPercentage;
    }

    /**
        * @dev fund
        */
    function fund() external {
        uint256 dappBal = dappTokenContract.balanceOf(address(this));
        uint256 rewardsAmt = (dappBal * rewardsPercentage)/10000;
        uint256 ILAmt = (dappBal * (10000 - rewardsPercentage))/10000;
        dappTokenContract.approve(stakingContract,dappBal);
        IDappStakingPool(stakingContract).fund(rewardsAmt, ILAmt);
    }
}