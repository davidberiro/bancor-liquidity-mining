// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

/*
    Liquidity Protection interface
*/
interface ILiquidityProtection {
    function addLiquidity(
        address poolAnchor,
        address reserveToken,
        uint256 amount
    ) external payable returns (uint256);

    function removeLiquidity(uint256 id, uint32 portion) external;

    function removeLiquidityReturn(uint256 id, uint32 portion, uint timestamp) external returns (uint, uint, uint);

}
