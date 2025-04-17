// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "./DeFiInsuranceAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * Implementação concreta de DeFiInsuranceAccount
 */
contract DeFiInsuranceAccountImpl is DeFiInsuranceAccount {
    using ECDSA for bytes32;
    
    constructor(IEntryPoint anEntryPoint) DeFiInsuranceAccount(anEntryPoint) {}
    
    // Implementação da função abstrata necessária
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }
}

/**
 * @title DeFiInsuranceAccountFactory
 * @dev Factory for creating DeFi Insurance accounts
 */
contract DeFiInsuranceAccountFactory {
    address public immutable accountImplementation;
    
    event AccountCreated(address indexed account, address indexed owner, address indexed oracle);
    
    constructor(IEntryPoint entryPoint) {
        accountImplementation = address(new DeFiInsuranceAccountImpl(entryPoint));
    }
    
    /**
     * Create a new DeFi Insurance account
     * @param owner The owner of the account
     * @param oracle The price oracle address
     * @param rescueDestination The address where funds will be sent on liquidation
     * @param salt Salt for deterministic address creation
     * @return account The address of the created account
     */
    function createAccount(
        address owner,
        address oracle,
        address rescueDestination,
        uint256 salt
    ) public returns (DeFiInsuranceAccount account) {
        address addr = getAddress(owner, oracle, rescueDestination, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return DeFiInsuranceAccount(payable(addr));
        }
        
        bytes memory initializeData = abi.encodeCall(
            DeFiInsuranceAccount.initialize,
            (owner, oracle, rescueDestination)
        );
        
        account = DeFiInsuranceAccount(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    initializeData
                )
            )
        );
        
        emit AccountCreated(address(account), owner, oracle);
    }
    
    /**
     * Calculate the counterfactual address of an account
     * @param owner The owner of the account
     * @param oracle The price oracle address  
     * @param rescueDestination The address where funds will be sent on liquidation
     * @param salt Salt for deterministic address creation
     * @return The address of the account
     */
    function getAddress(
        address owner,
        address oracle,
        address rescueDestination,
        uint256 salt
    ) public view returns (address) {
        bytes memory initializeData = abi.encodeCall(
            DeFiInsuranceAccount.initialize,
            (owner, oracle, rescueDestination)
        );
        
        bytes memory deploymentData = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(accountImplementation), initializeData)
        );
        
        bytes32 bytecodeHash = keccak256(deploymentData);
        return Create2.computeAddress(bytes32(salt), bytecodeHash);
    }
} 