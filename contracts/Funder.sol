// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IDappStakingPool.sol";

import "hardhat/console.sol";

contract Funder is OwnableUpgradeable {
  address public stakingContract;
  IERC20 public dappTokenContract;
  uint256 public rewardsPercentage;

  function initialize(
    address _stakingContract,
    address _dappTokenContract,
    uint256 _rewardsPercentage // out of 10000
  ) external initializer {
    __Ownable_init();
    stakingContract = _stakingContract;
    dappTokenContract = IERC20(_dappTokenContract);
    rewardsPercentage = _rewardsPercentage;
  }

  /**
   * @dev update rewards percentage
   */
  function update(uint256 _rewardsPercentage) external onlyOwner {
    rewardsPercentage = _rewardsPercentage;
  }

  /**
   * @dev fund
   */
  function fund() external {
    uint256 dappBal = dappTokenContract.balanceOf(address(this));
    uint256 rewardsAmt = (dappBal * rewardsPercentage) / 10000;
    uint256 ILAmt = (dappBal * (10000 - rewardsPercentage)) / 10000;
    dappTokenContract.approve(stakingContract, dappBal);
    IDappStakingPool(stakingContract).fund(rewardsAmt, ILAmt);
  }
}
