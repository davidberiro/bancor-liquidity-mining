// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.6.12;

/*
    Converter Registry Data interface
*/
interface IConverterRegistryData {
    function getConvertibleTokenSmartTokens(address _convertibleToken) external view returns (address[] memory);
}
