// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

import "./GameAccount.sol";

/**
 * Implementation contract for GameAccount
 */
contract GameAccountImpl is GameAccount, BaseAccount, Initializable, Ownable {
    // The social auth ID (keccak256 of the social auth proof)
    bytes32 private _socialAuthId;
    
    // Paymaster that will sponsor transactions
    address private _paymaster;
    
    // EntryPoint singleton used for verification
    IEntryPoint private immutable _entryPoint;
    
    // Indicates this is a game account
    bool private constant _isGameAccount = true;
    
    // Track in-game assets
    uint256 private _gameTokenBalance;
    mapping(uint256 => bool) private _ownedNFTs;
    
    // Constructor
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }
    
    /**
     * Initialize the account with social auth identity
     */
    function initialize(bytes32 socialAuthId, address paymaster) public initializer {
        _socialAuthId = socialAuthId;
        _paymaster = paymaster;
        _transferOwnership(tx.origin);
    }
    
    /**
     * Check if this is a game account
     */
    function isGameAccount() public pure override returns (bool) {
        return _isGameAccount;
    }
    
    /**
     * Get the paymaster for this account
     */
    function getPaymaster() public view override returns (address) {
        return _paymaster;
    }
    
    /**
     * Get the social auth ID for this account
     */
    function getSocialAuthId() public view override returns (bytes32) {
        return _socialAuthId;
    }
    
    /**
     * Get the EntryPoint for this account
     */
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    /**
     * Validate a user operation
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        // Verify the signature is from the owner
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner() != hash.recover(userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }
    
    /**
     * Execute the user operation
     */
    function _call(address target, uint256 value, bytes memory data) 
    internal override {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
    
    /**
     * Add in-game token balance
     */
    function addGameTokens(uint256 amount) external override onlyOwner {
        _gameTokenBalance += amount;
    }
    
    /**
     * Get in-game token balance
     */
    function gameTokenBalance() external view override returns (uint256) {
        return _gameTokenBalance;
    }
    
    /**
     * Add an NFT to owned assets
     */
    function addNFT(uint256 nftId) external override onlyOwner {
        _ownedNFTs[nftId] = true;
    }
    
    /**
     * Check if the account owns an NFT
     */
    function ownsNFT(uint256 nftId) external view override returns (bool) {
        return _ownedNFTs[nftId];
    }
    
    /**
     * Basic receive function
     */
    receive() external payable {}
} 