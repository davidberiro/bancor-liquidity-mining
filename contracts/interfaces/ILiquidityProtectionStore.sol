// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/*
    Liquidity Pool Protection Store interface
*/
interface ILiquidityProtectionStore {
  function protectedLiquidity(uint256 _id)
    external
    view
    returns (
      address,
      address,
      address,
      uint256,
      uint256,
      uint256,
      uint256,
      uint256
    );
}
