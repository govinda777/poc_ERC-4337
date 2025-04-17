// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "./BiometricAuthAccount.sol";

/**
 * Fábrica para implantação de carteiras com Autenticacao biométrica para pagamentos diarios.
 */
contract BiometricAuthAccountFactory {
    BiometricAuthAccount public immutable accountImplementation;
    
    event AccountCreated(address indexed account, address indexed owner);
    
    constructor(IEntryPoint entryPoint) {
        accountImplementation = new BiometricAuthAccount(entryPoint);
    }
    
    /**
     * Cria uma nova carteira com Autenticacao biométrica
     * @param owner proprietario da carteira
     * @param salt Um valor de salt para o cálculo do endereço
     * @return address O endereço da nova carteira
     */
    function createAccount(
        address owner,
        uint256 salt
    ) public returns (address) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }
        
        bytes memory initializeData = abi.encodeCall(
            BiometricAuthAccount.initialize,
            (owner)
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy{salt: bytes32(salt)}(
            address(accountImplementation),
            initializeData
        );
        
        emit AccountCreated(address(proxy), owner);
        return address(proxy);
    }
    
    /**
     * Calcula o endereço de uma carteira antes da implantação
     */
    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        bytes memory initializeData = abi.encodeCall(
            BiometricAuthAccount.initialize,
            (owner)
        );
        
        bytes memory deploymentData = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(accountImplementation), initializeData)
        );
        
        bytes32 bytecodeHash = keccak256(deploymentData);
        return Create2.computeAddress(bytes32(salt), bytecodeHash);
    }
} 