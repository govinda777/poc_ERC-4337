// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "./CorporateRecoveryAccount.sol";

/**
 * Fábrica para implantação de carteiras corporativas com recurso de recuperação
 */
contract CorporateRecoveryAccountFactory {
    CorporateRecoveryAccount public immutable accountImplementation;
    
    event AccountCreated(address indexed account, address[] initialSigners, uint256 threshold);
    
    constructor(IEntryPoint entryPoint) {
        accountImplementation = new CorporateRecoveryAccount(entryPoint);
    }
    
    /**
     * Cria uma nova carteira corporativa
     * @param initialSigners Lista inicial de signatários
     * @param threshold Número minimo de assinaturas necessárias
     * @param salt Um valor de salt para o cálculo do endereço
     * @return address O endereço da nova carteira
     */
    function createAccount(
        address[] memory initialSigners,
        uint256 threshold,
        uint256 salt
    ) public returns (address) {
        address addr = getAddress(initialSigners, threshold, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }
        
        bytes memory initializeData = abi.encodeCall(
            CorporateRecoveryAccount.initialize,
            (initialSigners, threshold)
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy{salt: bytes32(salt)}(
            address(accountImplementation),
            initializeData
        );
        
        emit AccountCreated(address(proxy), initialSigners, threshold);
        return address(proxy);
    }
    
    /**
     * Calcula o endereço de uma carteira antes da implantação
     */
    function getAddress(
        address[] memory initialSigners,
        uint256 threshold,
        uint256 salt
    ) public view returns (address) {
        bytes memory initializeData = abi.encodeCall(
            CorporateRecoveryAccount.initialize,
            (initialSigners, threshold)
        );
        
        bytes memory deploymentData = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(accountImplementation), initializeData)
        );
        
        bytes32 bytecodeHash = keccak256(deploymentData);
        return Create2.computeAddress(bytes32(salt), bytecodeHash);
    }
} 