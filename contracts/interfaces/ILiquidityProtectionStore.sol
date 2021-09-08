// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

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

