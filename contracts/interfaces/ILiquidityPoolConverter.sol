// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;


/*
    Liquidity Pool Converter interface
*/
interface ILiquidityPoolConverter {
  function addLiquidity(
    address[] memory reserveTokens,
    uint256[] memory reserveAmounts,
    uint256 _minReturn
  ) external payable;

  function removeLiquidity(
    uint256 amount,
    address[] memory reserveTokens,
    uint256[] memory _reserveMinReturnAmounts
  ) external;
}
