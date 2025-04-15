// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * SponsorPaymaster: a paymaster that sponsors gas fees for specific users and dapps,
 * allowing for gasless transactions.
 */
contract SponsorPaymaster is BasePaymaster, Ownable {
    // Mapping to track sponsored addresses
    mapping(address => bool) public sponsoredAddresses;
    
    // Mapping to track sponsored applications (by contract address)
    mapping(address => bool) public sponsoredApps;
    
    // Event emitted when a new address is sponsored
    event AddressSponsored(address indexed account);
    event AddressUnsponsored(address indexed account);
    event AppSponsored(address indexed app);
    event AppUnsponsored(address indexed app);
    event GasSponsored(address indexed account, address indexed app, uint256 gasUsed);

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) Ownable(msg.sender) {}

    /**
     * Add an address to be sponsored
     */
    function sponsorAddress(address account) external onlyOwner {
        sponsoredAddresses[account] = true;
        emit AddressSponsored(account);
    }
    
    /**
     * Remove an address from sponsored list
     */
    function unsponsorAddress(address account) external onlyOwner {
        sponsoredAddresses[account] = false;
        emit AddressUnsponsored(account);
    }
    
    /**
     * Add an application to be sponsored
     */
    function sponsorApp(address app) external onlyOwner {
        sponsoredApps[app] = true;
        emit AppSponsored(app);
    }
    
    /**
     * Remove an application from sponsored list
     */
    function unsponsorApp(address app) external onlyOwner {
        sponsoredApps[app] = false;
        emit AppUnsponsored(app);
    }

    /**
     * Validate the paymaster data, and determine whether this paymaster should pay for this user operation.
     * Only sponsored addresses or applications can have their gas sponsored.
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        (userOpHash, maxCost); // unused
        
        // Extract the sender account
        address sender = userOp.sender;
        
        // Extract the target application (destination address)
        address target;
        if (userOp.callData.length >= 4 + 32) {
            // callData format for execute: function selector (4 bytes) + target (32 bytes) + ...
            bytes4 selector = bytes4(userOp.callData[:4]);
            
            // Check if the function is execute or executeBatch
            if (selector == bytes4(keccak256("execute(address,uint256,bytes)"))) {
                // For execute(), target is the first parameter
                assembly {
                    // Skip selector (4 bytes) and load the address (32 bytes)
                    target := mload(add(userOp.callData, 36))
                }
            }
        }
        
        // Check if the sender is sponsored or the target application is sponsored
        require(
            sponsoredAddresses[sender] || sponsoredApps[target],
            "SponsorPaymaster: sender or app not sponsored"
        );
        
        // Context includes sponsored address and app for logging purposes
        return (abi.encode(sender, target), 0);
    }
    
    /**
     * Post-operation handler.
     * Called after the user operation is executed, to handle actual gas consumption and payment.
     */
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (mode); // unused
        
        // Decode the context to get sender and target app
        (address sender, address app) = abi.decode(context, (address, address));
        
        // Emit event for gas sponsoring
        emit GasSponsored(sender, app, actualGasCost);
    }
    
    /**
     * Allow the owner to deposit funds for gas sponsoring
     */
    receive() external payable {
        // Accept ETH deposits to fund the paymaster
    }
    
    /**
     * Allow the owner to withdraw funds
     */
    function withdrawFunds(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Cannot withdraw to zero address");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Failed to withdraw funds");
    }
} 