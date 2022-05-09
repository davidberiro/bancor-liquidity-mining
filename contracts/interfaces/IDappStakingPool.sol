// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
    Staking Pool Interface
*/
interface IDappStakingPool {
  function fund(uint256 dappRewardsAmount, uint256 dappILAmount) external;
}
