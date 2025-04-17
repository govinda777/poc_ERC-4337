// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * Interface for GameAccount - a smart contract wallet for game players
 */
interface GameAccount is IAccount {
    /**
     * Initialize the account
     * @param socialAuthId the social auth ID for this account
     * @param paymaster the paymaster address that will sponsor transactions
     */
    function initialize(bytes32 socialAuthId, address paymaster) external;
    
    /**
     * Check if this is a game account
     * @return true if this is a game account
     */
    function isGameAccount() external view returns (bool);
    
    /**
     * Get the paymaster for this account
     * @return the paymaster address
     */
    function getPaymaster() external view returns (address);
    
    /**
     * Get the social auth ID for this account
     * @return the social auth ID
     */
    function getSocialAuthId() external view returns (bytes32);
    
    /**
     * Get the EntryPoint for this account
     * @return the EntryPoint contract address
     */
    function entryPoint() external view returns (IEntryPoint);
    
    /**
     * Add in-game token balance
     * @param amount the amount of tokens to add
     */
    function addGameTokens(uint256 amount) external;
    
    /**
     * Get in-game token balance
     * @return the token balance
     */
    function gameTokenBalance() external view returns (uint256);
    
    /**
     * Add an NFT to owned assets
     * @param nftId the ID of the NFT
     */
    function addNFT(uint256 nftId) external;
    
    /**
     * Check if the account owns an NFT
     * @param nftId the ID of the NFT
     * @return true if the account owns the NFT
     */
    function ownsNFT(uint256 nftId) external view returns (bool);
} 