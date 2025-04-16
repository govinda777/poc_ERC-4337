// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./GameAccount.sol";
import "./GamePaymaster.sol";

/**
 * Factory para criar contas de jogador para o jogo "CryptoQuest"
 * Permite a criação de contas via autenticação social (Google/Apple ID)
 */
contract GameAccountFactory is Ownable {
    GameAccount public immutable accountImplementation;
    GamePaymaster public immutable gamePaymaster;
    
    // Mapping to track social auth identifiers
    mapping(bytes32 => address) public socialAuthAccounts;
    
    // Events
    event AccountCreated(address indexed account, bytes32 indexed socialAuthId);
    event NFTCollateralAdded(address indexed account);

    constructor(
        IEntryPoint _entryPoint,
        GamePaymaster _gamePaymaster
    ) Ownable(msg.sender) {
        accountImplementation = new GameAccount(_entryPoint);
        gamePaymaster = _gamePaymaster;
    }

    /**
     * Cria uma conta para um novo jogador usando autenticação social
     * @param socialAuthProof prova criptográfica da autenticação social
     * @param salt valor de salt para geração do endereço
     * @return account o endereço da conta criada
     */
    function createAccountViaSocialAuth(
        bytes calldata socialAuthProof,
        uint256 salt
    ) public returns (GameAccount account) {
        // Verify social auth proof
        // Note: In a real implementation, this would validate signatures
        // from OAuth providers or other auth systems
        bytes32 socialAuthId = keccak256(socialAuthProof);
        
        // Check if an account already exists for this social ID
        require(socialAuthAccounts[socialAuthId] == address(0), "Account already exists for this social auth");
        
        // Create the account
        address addr = getAddress(socialAuthId, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return GameAccount(payable(addr));
        }
        
        account = GameAccount(payable(
            new ERC1967Proxy{salt: bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(GameAccount.initialize, (socialAuthId, address(gamePaymaster)))
            )
        ));
        
        // Register the account with the paymaster for gas sponsoring
        gamePaymaster.registerNewPlayer(address(account));
        
        // Store the social auth mapping
        socialAuthAccounts[socialAuthId] = address(account);
        
        emit AccountCreated(address(account), socialAuthId);
        
        return account;
    }
    
    /**
     * Adiciona NFTs do jogo como garantia para a conta do jogador
     * @param account endereço da conta do jogador
     * @param nftId ID do NFT a ser usado como garantia
     */
    function addNFTCollateral(address account, uint256 nftId) external onlyOwner {
        // In a real implementation, this would transfer the NFT to a vault
        // or mark it as locked in the game's NFT contract
        
        // Register collateral with the paymaster
        gamePaymaster.addCollateral(account);
        
        emit NFTCollateralAdded(account);
    }

    /**
     * Calcula o endereço da conta que seria criada
     * @param socialAuthId identificador da autenticação social
     * @param salt valor de salt para geração do endereço
     * @return o endereço da conta
     */
    function getAddress(
        bytes32 socialAuthId,
        uint256 salt
    ) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(GameAccount.initialize, (socialAuthId, address(gamePaymaster)))
                )
            ))
        );
    }
} 