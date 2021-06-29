//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.12;

interface IContractRegistry {
    function addressOf(
        bytes32 contractName
    ) external returns(address);
}

interface IConverterRegistry {
    function newConverter (
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
    address contractRegistry = 0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4;
    bytes32 converterRegistryName = 'BancorConverterRegistry';

    function deployConverter(
        address[] memory _reserveTokens,
        uint32[] memory _reserveWeights
    ) external returns(address) {
        IContractRegistry registry = IContractRegistry(contractRegistry);
        address converterRegistry = registry.addressOf(converterRegistryName);
	string memory name = 'Bnt Dapp Converter';
	string memory symbol = 'BNTDAPP';
        address converter = IConverterRegistry(converterRegistry).newConverter(
            1,
            name,
            symbol,
            18,
            30000,
            _reserveTokens,
	    _reserveWeights
        );
        return converter;
    }
}