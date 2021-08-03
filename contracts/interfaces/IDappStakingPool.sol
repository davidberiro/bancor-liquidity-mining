// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

/*
    Staking Pool Interface
*/
interface IDappStakingPool {
    function fund(uint dappRewardsAmount, uint dappILAmount) external;
}