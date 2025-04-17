// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/EntryPoint.sol";
import "./AuctionAccount.sol";

/**
 * @title AccountFactory
 * @dev Factory para criar contas que podem interagir com o Leilao NFT usando o padrão ERC-4337
 */
contract AccountFactory {
    EntryPoint public immutable entryPoint;
    
    // Mapeamento para rastrear as contas criadas
    mapping(address => bool) public accountCreated;
    
    // Evento emitido quando uma nova conta é criada
    event AccountCreated(address indexed account, address indexed owner);
    
    /**
     * @dev Construtor que inicializa o factory com um EntryPoint
     * @param _entryPoint Endereço do contrato EntryPoint
     */
    constructor(address payable _entryPoint) {
        require(_entryPoint != address(0), "EntryPoint cannot be zero address");
        entryPoint = EntryPoint(_entryPoint);
    }
    
    /**
     * @dev Cria uma nova conta para o usuário
     * @param owner Endereço do proprietario da conta
     * @param salt Valor de salt para cálculo de endereço
     * @return account Endereço da nova conta criada
     */
    function createAccount(address owner, uint256 salt) external returns (address account) {
        bytes32 saltBytes = bytes32(salt);
        account = getAddress(owner, saltBytes);
        
        if (!accountCreated[account]) {
            AuctionAccount newAccount = new AuctionAccount{salt: saltBytes}(
                address(entryPoint),
                owner
            );
            require(address(newAccount) == account, "Account address mismatch");
            
            accountCreated[account] = true;
            emit AccountCreated(account, owner);
        }
        
        return account;
    }
    
    /**
     * @dev Calcula o endereço da conta antes da criação
     * @param owner Endereço do proprietario da conta
     * @param salt Valor de salt para o cálculo de endereço
     * @return Endereço previsto da conta
     */
    function getAddress(address owner, bytes32 salt) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(abi.encodePacked(
                type(AuctionAccount).creationCode,
                abi.encode(address(entryPoint), owner)
            ))
        )))));
    }
} 