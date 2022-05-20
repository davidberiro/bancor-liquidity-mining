// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * @dev Transfer position event callback interface
 */
interface ITransferPositionCallback {
  function onTransferPosition(
    uint256 newId,
    address provider,
    bytes calldata data
  ) external;
}
