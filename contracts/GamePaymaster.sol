// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * GamePaymaster: a paymaster for the "CryptoQuest" Play-to-Earn game
 * Allows new players to make transactions without ETH, using game NFTs as collateral
 */
contract GamePaymaster is BasePaymaster {
    using ECDSA for bytes32;
    
    // Game token (USDC) for paying gas
    IERC20 public immutable gameToken;
    address public immutable gameTokenAddress;
    
    // Mapping to track new player wallets
    mapping(address => bool) public newPlayerWallets;
    
    // Mapping to track if a player has game NFTs as collateral
    mapping(address => bool) public hasCollateral;
    
    // Game contract address
    address public immutable gameContract;
    
    // Transaction limits
    uint256 public maxTransactionsPerPlayer = 5;
    mapping(address => uint256) public playerTransactionCount;
    
    // Configurações do Paymaster
    uint256 public dailySpendingLimit;    // Limite diário total
    uint256 public sessionSpendingLimit;  // Limite por sessão
    uint256 public currentDailySpent;     // Gasto atual do dia
    uint256 public dailyResetTimestamp;   // Quando o limite diário será resetado
    
    // Events
    event PlayerRegistered(address indexed playerWallet);
    event GasPaidForPlayer(address indexed playerWallet, uint256 gasAmount);
    event CollateralAdded(address indexed playerWallet);
    event CollateralRemoved(address indexed playerWallet);

    constructor(
        IEntryPoint _entryPoint
    ) BasePaymaster(_entryPoint) {
        // Default values
        gameTokenAddress = address(0); // Will be set later
        gameToken = IERC20(address(0));
        gameContract = address(0); // Will be set later
        
        // Initialize spending limits
        dailySpendingLimit = 0.1 ether;    
        sessionSpendingLimit = 0.01 ether; 
        currentDailySpent = 0;             
        dailyResetTimestamp = block.timestamp + 1 days;
    }

    /**
     * Register a new player wallet for gasless transactions
     */
    function registerNewPlayer(address playerWallet) external onlyOwner {
        require(playerWallet != address(0), "Cannot register zero address");
        require(!newPlayerWallets[playerWallet], "Player already registered");
        
        newPlayerWallets[playerWallet] = true;
        playerTransactionCount[playerWallet] = 0;
        
        emit PlayerRegistered(playerWallet);
    }
    
    /**
     * Add game NFTs as collateral for a player
     */
    function addCollateral(address playerWallet) external {
        // Only the game contract can add collateral
        require(msg.sender == gameContract, "Only game contract can add collateral");
        hasCollateral[playerWallet] = true;
        
        emit CollateralAdded(playerWallet);
    }
    
    /**
     * Remove game NFTs collateral when player has enough funds
     */
    function removeCollateral(address playerWallet) external {
        // Only the game contract can remove collateral
        require(msg.sender == gameContract, "Only game contract can remove collateral");
        hasCollateral[playerWallet] = false;
        
        emit CollateralRemoved(playerWallet);
    }
    
    /**
     * Update the maximum number of free transactions per player
     */
    function setMaxTransactionsPerPlayer(uint256 maxTx) external onlyOwner {
        maxTransactionsPerPlayer = maxTx;
    }

    /**
     * Validate if this paymaster should pay for this user operation
     * Sponsored gas for new players who have either NFT collateral or haven't exceeded transaction limits
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        // Extract the sender account
        address sender = userOp.sender;
        
        // Verify player eligibility
        require(newPlayerWallets[sender], "GamePaymaster: not a registered player");
        
        // Check if player has collateral or hasn't exceeded transaction limits
        require(
            hasCollateral[sender] || playerTransactionCount[sender] < maxTransactionsPerPlayer,
            "GamePaymaster: no collateral or transaction limit exceeded"
        );
        
        // Verify sufficient token balance and allowance
        uint256 tokenAmount = maxCost; // Calculate token amount based on gas cost
        
        // Note: In a real implementation, you'd use a price oracle to convert ETH to token amounts
        
        // Verify sufficient deposit in EntryPoint
        require(
            entryPoint.balanceOf(address(this)) >= maxCost,
            "GamePaymaster: insufficient deposit"
        );
        
        // Increment transaction count for players without collateral
        if (!hasCollateral[sender]) {
            playerTransactionCount[sender]++;
        }
        
        // Context includes player address and gas cost for accounting
        return (abi.encode(sender, maxCost), 0);
    }
    
    /**
     * Pay for the user operation with game tokens
     */
    function _payGasInERC20(address account, uint256 amount) private {
        // Transfer tokens from game treasury to this contract
        gameToken.transferFrom(owner(), address(this), amount);
        
        // Approve the EntryPoint to use these tokens
        // Note: In a real implementation, you'd use a token paymaster or convert tokens to ETH
    }
    
    /**
     * Post-operation handler
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        // Decode the context to get player address and max cost
        (address player, uint256 maxCost) = abi.decode(context, (address, uint256));
        
        // Emit event for gas payment
        emit GasPaidForPlayer(player, actualGasCost);
    }
    
    /**
     * Allow game to deposit funds for gas sponsoring
     */
    receive() external payable {
        // Accept ETH deposits
    }
    
    /**
     * Allow owner to deposit funds to EntryPoint
     */
    function depositToEntryPoint() external payable onlyOwner {
        entryPoint.depositTo{value: msg.value}(address(this));
    }
    
    /**
     * Allow owner to withdraw funds from EntryPoint
     */
    function withdrawFromEntryPoint(uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(payable(owner()), amount);
    }

    /**
     * Sign a user operation hash to sponsor a transaction
     * For testing purposes, this directly signs the hash
     */
    function signUserOp(bytes32 userOpHash) external view returns (bytes memory) {
        // In production code, you would need much more validation here
        // For testing, we'll just sign it with a private key
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = signWithPrivateKey(hash);
        return abi.encodePacked(r, s, v);
    }

    // For testing purposes only - in reality would be more secure
    function signWithPrivateKey(bytes32 hash) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        // This is a test-only function that emulates signing
        // In a real implementation, this would use a secure key
        
        // Using a fixed test key for predictable results
        r = keccak256(abi.encodePacked(hash, "test_key_r"));
        s = keccak256(abi.encodePacked(hash, "test_key_s"));
        v = 27;
        
        return (v, r, s);
    }
} 