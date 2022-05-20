// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/*
    Liquidity Protection interface
*/
interface ILiquidityProtection {
  function addLiquidity(
    address poolAnchor,
    address reserveToken,
    uint256 amount
  ) external payable returns (uint256);

  function transferPositionAndNotify(
    uint256 id,
    address newProvider,
    address callback,
    bytes calldata data
  ) external returns (uint256);

  function removeLiquidity(uint256 id, uint32 portion) external;

  function removeLiquidityReturn(
    uint256 id,
    uint32 portion,
    uint256 timestamp
  )
    external
    returns (
      uint256,
      uint256,
      uint256
    );

  function claimBalance(uint256 startIndex, uint256 endIndex) external;
}
