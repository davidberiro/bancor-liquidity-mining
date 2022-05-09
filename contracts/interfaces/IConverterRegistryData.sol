// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
    Converter Registry Data interface
*/
interface IConverterRegistryData {
  function getConvertibleTokenSmartTokens(address _convertibleToken)
    external
    view
    returns (address[] memory);
}
