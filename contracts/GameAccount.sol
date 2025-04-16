// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * Conta de jogador para o "CryptoQuest"
 * Permite autenticação via login social (Google/Apple ID)
 * Permite transações sem gas para novos jogadores
 */
contract GameAccount is BaseAccount, Initializable, UUPSUpgradeable, IERC721Receiver {
    using ECDSA for bytes32;

    // Storage slot with the address of the current implementation
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    // Social auth identifier (hash of user's social credentials)
    bytes32 public socialAuthId;
    
    // Game paymaster address
    address public gamePaymaster;
    
    // EntryPoint singleton contract
    IEntryPoint private immutable _entryPoint;
    
    // Game NFTs used as collateral
    struct NFTCollateral {
        address contractAddress;
        uint256 tokenId;
        bool locked;
    }
    NFTCollateral[] public collateralNFTs;
    
    // Events
    event SocialAuthInitialized(bytes32 indexed socialAuthId);
    event NFTCollateralAdded(address indexed nftContract, uint256 indexed tokenId);
    event NFTCollateralRemoved(address indexed nftContract, uint256 indexed tokenId);
    event GameTokensWithdrawn(address indexed tokenContract, uint256 amount);
    
    modifier onlyPaymaster() {
        require(msg.sender == gamePaymaster, "Only the game paymaster can call this function");
        _;
    }
    
    /**
     * Constructor to set the EntryPoint address
     */
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }
    
    /**
     * Initialize the account.
     * @param _socialAuthId Social auth identifier
     * @param _gamePaymaster Address of the game paymaster
     */
    function initialize(bytes32 _socialAuthId, address _gamePaymaster) public initializer {
        socialAuthId = _socialAuthId;
        gamePaymaster = _gamePaymaster;
        
        emit SocialAuthInitialized(_socialAuthId);
    }
    
    /**
     * Return the entryPoint used by this account
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    /**
     * Execute a transaction (called by EntryPoint)
     * @param dest destination address to call
     * @param value amount of ETH to transfer
     * @param func data to pass to destination
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrPaymaster();
        _call(dest, value, func);
    }
    
    /**
     * Execute a batch of transactions
     * @param dest array of destination addresses
     * @param func array of data to pass to each destination
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrPaymaster();
        require(dest.length == func.length, "Wrong array length");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }
    
    /**
     * Validate user operation
     * @param userOp the user operation
     * @param userOpHash hash of the user operation
     * @param missingAccountFunds amount to pay as collateral to bundle with a valid signature
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        _requireFromEntryPoint();
        
        // If the user op signature is a social auth proof, verify it
        if (userOp.signature.length > 65) {
            // Social auth verification
            // Note: In a real implementation, this would validate OAuth signatures
            // Here we just check if the hash matches the stored socialAuthId
            bytes32 authHash = keccak256(userOp.signature);
            if (authHash == socialAuthId) {
                // Valid social auth
                if (missingAccountFunds > 0) {
                    // If the account doesn't have enough ETH, let the paymaster handle it
                    (bool success,) = payable(msg.sender).call{value: 0}("");
                    (success);
                    // Ignore failure (it's the paymaster's job to pay)
                }
                return 0; // Valid signature
            }
        } else {
            // Standard signature validation
            bytes32 hash = userOpHash.toEthSignedMessageHash();
            if (hash.recover(userOp.signature) == address(this)) {
                if (missingAccountFunds > 0) {
                    (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
                    success;
                }
                return 0; // Valid signature
            }
        }
        
        return SIG_VALIDATION_FAILED;
    }
    
    /**
     * Add an NFT as collateral
     * @param nftContract the NFT contract address
     * @param tokenId the NFT token ID
     */
    function addNFTCollateral(address nftContract, uint256 tokenId) external {
        _requireFromEntryPointOrPaymaster();
        
        // Transfer NFT to this contract
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        
        // Store collateral info
        collateralNFTs.push(NFTCollateral({
            contractAddress: nftContract,
            tokenId: tokenId,
            locked: true
        }));
        
        emit NFTCollateralAdded(nftContract, tokenId);
    }
    
    /**
     * Remove NFT collateral
     * @param index the index of the NFT in the collateral array
     * @param recipient address to send the NFT to
     */
    function removeNFTCollateral(uint256 index, address recipient) external {
        _requireFromEntryPointOrPaymaster();
        require(index < collateralNFTs.length, "Index out of bounds");
        require(!collateralNFTs[index].locked, "NFT is locked as collateral");
        
        NFTCollateral memory nft = collateralNFTs[index];
        
        // Transfer NFT back to player
        IERC721(nft.contractAddress).safeTransferFrom(address(this), recipient, nft.tokenId);
        
        // Remove from collateral array (swap and pop)
        collateralNFTs[index] = collateralNFTs[collateralNFTs.length - 1];
        collateralNFTs.pop();
        
        emit NFTCollateralRemoved(nft.contractAddress, nft.tokenId);
    }
    
    /**
     * Unlock NFT collateral when account has enough game tokens
     * @param index the index of the NFT in the collateral array
     */
    function unlockNFTCollateral(uint256 index) external onlyPaymaster {
        require(index < collateralNFTs.length, "Index out of bounds");
        collateralNFTs[index].locked = false;
    }
    
    /**
     * Withdraw game tokens from account
     * @param token the token contract address
     * @param amount amount to withdraw
     * @param recipient address to send tokens to
     */
    function withdrawGameTokens(
        address token,
        uint256 amount,
        address recipient
    ) external {
        _requireFromEntryPointOrPaymaster();
        
        IERC20(token).transfer(recipient, amount);
        
        emit GameTokensWithdrawn(token, amount);
    }
    
    /**
     * Implementation of IERC721Receiver.onERC721Received
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /**
     * Utility function to make a call
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
    
    /**
     * Check if the caller is the entry point or the paymaster
     */
    function _requireFromEntryPointOrPaymaster() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == gamePaymaster,
            "Caller is not EntryPoint or paymaster"
        );
    }
    
    /**
     * Implement UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal view override {
        // In a real implementation, only the game owner should be able to upgrade
        _requireFromEntryPoint();
    }
    
    /**
     * Receive ETH
     */
    receive() external payable {}
} 