// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

/*
    Liquidity Protection Settings interface
*/
interface ILiquidityProtectionSettings {
    function addPoolToWhitelist(address poolAnchor) external;
    function setProtectionDelays(uint256 minDelay, uint256 maxDelay) external;
}
