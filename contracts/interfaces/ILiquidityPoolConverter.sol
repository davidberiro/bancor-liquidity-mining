// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

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
