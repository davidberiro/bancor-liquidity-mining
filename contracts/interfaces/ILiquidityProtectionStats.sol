// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.6.12;

import "./IConverterAnchor.sol";

import "./IDSToken.sol";
import "./IReserveToken.sol";

/*
    Liquidity Protection Stats interface
*/
interface ILiquidityProtectionStats {

    function totalPoolAmount(IDSToken poolToken) external view returns (uint256);

    function totalReserveAmount(IDSToken poolToken, IReserveToken reserveToken) external view returns (uint256);

}