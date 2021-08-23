// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IConverterAnchor.sol";
import "./IOwned.sol";

/*
    DSToken interface
*/
interface IDSToken is IConverterAnchor, IERC20 {
}