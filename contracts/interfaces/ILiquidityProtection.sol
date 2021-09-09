// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;
import "./ILiquidityProtectionStore.sol";
import "./ILiquidityProtectionStats.sol";

/*
    Liquidity Protection interface
*/
interface ILiquidityProtection {

    function store() external view returns (ILiquidityProtectionStore);

    function stats() external view returns (ILiquidityProtectionStats);

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

    function removeLiquidityReturn(uint256 id, uint32 portion, uint timestamp) external returns (uint, uint, uint);

    function claimBalance(uint256 startIndex, uint256 endIndex) external;

}
