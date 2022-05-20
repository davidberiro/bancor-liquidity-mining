//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IConverterRegistry {
  function newConverter(
    uint16 _type,
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint32 _maxConversionFee,
    address[] memory _reserveTokens,
    uint32[] memory _reserveWeights
  ) external returns (address);
}

contract ConverterDeployer {
  // mainnet
  address converterRegistryAddress = 0xC0205e203F423Bcd8B2a4d6f8C8A154b0Aa60F19;
  event newConverter(address converter);

  function deployConverter(
    address[] memory _reserveTokens,
    uint32[] memory _reserveWeights
  ) external returns (address) {
    string memory name = "Bnt Dapp Converter";
    string memory symbol = "BNTDAPP";
    address converter = IConverterRegistry(converterRegistryAddress)
      .newConverter(
        1,
        name,
        symbol,
        18,
        30000,
        _reserveTokens,
        _reserveWeights
      );
    emit newConverter(converter);
    return converter;
  }
}
