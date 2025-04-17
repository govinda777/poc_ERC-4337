// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/UserOperation.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * SponsorPaymaster: a paymaster that sponsors gas fees for specific users and dapps,
 * allowing for gasless transactions.
 */
contract SponsorPaymaster is BasePaymaster {
    // Mapping to track sponsored addresses
    mapping(address => bool) public sponsoredAddresses;
    
    // Mapping to track sponsored applications (by contract address)
    mapping(address => bool) public sponsoredApps;
    
    // Sponsorship limits
    struct SponsorshipLimit {
        uint256 dailyLimit;
        uint256 txLimit;
        uint256 usedToday;
        uint256 lastReset;
    }
    
    // Limits per sponsor type
    mapping(address => SponsorshipLimit) public addressLimits;
    mapping(address => SponsorshipLimit) public appLimits;
    
    // Default limits
    uint256 public defaultDailyLimit = 0.1 ether;
    uint256 public defaultTxLimit = 0.01 ether;
    
    // Events
    event AddressSponsored(address indexed account);
    event AddressUnsponsored(address indexed account);
    event AppSponsored(address indexed app);
    event AppUnsponsored(address indexed app);
    event GasSponsored(address indexed account, address indexed app, uint256 gasUsed);
    event SponsorLimitUpdated(address indexed subject, uint256 dailyLimit, uint256 txLimit, bool isApp);
    event DefaultLimitsUpdated(uint256 dailyLimit, uint256 txLimit);
    event PaymasterFunded(address indexed funder, uint256 amount);

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    /**
     * Add an address to be sponsored with default limits
     */
    function sponsorAddress(address account) external onlyOwner {
        require(account != address(0), "Cannot sponsor zero address");
        sponsoredAddresses[account] = true;
        
        // Initialize limits if not set
        if (addressLimits[account].dailyLimit == 0) {
            addressLimits[account] = SponsorshipLimit({
                dailyLimit: defaultDailyLimit,
                txLimit: defaultTxLimit,
                usedToday: 0,
                lastReset: block.timestamp
            });
        }
        
        emit AddressSponsored(account);
    }
    
    /**
     * Add an address to be sponsored with custom limits
     */
    function sponsorAddressWithLimits(
        address account, 
        uint256 dailyLimit, 
        uint256 txLimit
    ) external onlyOwner {
        require(account != address(0), "Cannot sponsor zero address");
        sponsoredAddresses[account] = true;
        
        addressLimits[account] = SponsorshipLimit({
            dailyLimit: dailyLimit,
            txLimit: txLimit,
            usedToday: 0,
            lastReset: block.timestamp
        });
        
        emit AddressSponsored(account);
        emit SponsorLimitUpdated(account, dailyLimit, txLimit, false);
    }
    
    /**
     * Remove an address from sponsored list
     */
    function unsponsorAddress(address account) external onlyOwner {
        sponsoredAddresses[account] = false;
        emit AddressUnsponsored(account);
    }
    
    /**
     * Add an application to be sponsored with default limits
     */
    function sponsorApp(address app) external onlyOwner {
        require(app != address(0), "Cannot sponsor zero address");
        sponsoredApps[app] = true;
        
        // Initialize limits if not set
        if (appLimits[app].dailyLimit == 0) {
            appLimits[app] = SponsorshipLimit({
                dailyLimit: defaultDailyLimit,
                txLimit: defaultTxLimit,
                usedToday: 0,
                lastReset: block.timestamp
            });
        }
        
        emit AppSponsored(app);
    }
    
    /**
     * Add an application to be sponsored with custom limits
     */
    function sponsorAppWithLimits(
        address app, 
        uint256 dailyLimit, 
        uint256 txLimit
    ) external onlyOwner {
        require(app != address(0), "Cannot sponsor zero address");
        sponsoredApps[app] = true;
        
        appLimits[app] = SponsorshipLimit({
            dailyLimit: dailyLimit,
            txLimit: txLimit,
            usedToday: 0,
            lastReset: block.timestamp
        });
        
        emit AppSponsored(app);
        emit SponsorLimitUpdated(app, dailyLimit, txLimit, true);
    }
    
    /**
     * Remove an application from sponsored list
     */
    function unsponsorApp(address app) external onlyOwner {
        sponsoredApps[app] = false;
        emit AppUnsponsored(app);
    }
    
    /**
     * Update default limits for new sponsorships
     */
    function setDefaultLimits(uint256 newDailyLimit, uint256 newTxLimit) external onlyOwner {
        defaultDailyLimit = newDailyLimit;
        defaultTxLimit = newTxLimit;
        emit DefaultLimitsUpdated(newDailyLimit, newTxLimit);
    }
    
    /**
     * Update limits for a specific address
     */
    function updateAddressLimits(
        address account,
        uint256 dailyLimit,
        uint256 txLimit
    ) external onlyOwner {
        require(sponsoredAddresses[account], "Address not sponsored");
        
        addressLimits[account].dailyLimit = dailyLimit;
        addressLimits[account].txLimit = txLimit;
        
        emit SponsorLimitUpdated(account, dailyLimit, txLimit, false);
    }
    
    /**
     * Update limits for a specific app
     */
    function updateAppLimits(
        address app,
        uint256 dailyLimit,
        uint256 txLimit
    ) external onlyOwner {
        require(sponsoredApps[app], "App not sponsored");
        
        appLimits[app].dailyLimit = dailyLimit;
        appLimits[app].txLimit = txLimit;
        
        emit SponsorLimitUpdated(app, dailyLimit, txLimit, true);
    }

    /**
     * Validate the paymaster data, and determine whether this paymaster should pay for this user operation.
     * Only sponsored addresses or applications can have their gas sponsored, subject to limits.
     */
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        // Extract the sender account
        address sender = userOp.sender;
        
        // Extract the target application (destination address)
        address target = _extractTarget(userOp);
        
        // Verify sponsorship eligibility
        bool isSenderSponsored = sponsoredAddresses[sender];
        bool isTargetSponsored = sponsoredApps[target];
        
        require(
            isSenderSponsored || isTargetSponsored,
            "SponsorPaymaster: sender or app not sponsored"
        );
        
        // Check and update sponsorship limits
        if (isSenderSponsored) {
            _checkAndUpdateLimits(sender, maxCost, false);
        }
        
        if (isTargetSponsored) {
            _checkAndUpdateLimits(target, maxCost, true);
        }
        
        // Verify sufficient deposit in EntryPoint
        require(
            entryPoint.balanceOf(address(this)) >= maxCost,
            "SponsorPaymaster: insufficient deposit"
        );
        
        // Context includes sponsored address, app and max cost for accounting
        // ValidationData is 0 to indicate operation is valid and that the paymaster pays for it
        return (abi.encode(sender, target, maxCost), 0);
    }
    
    /**
     * Extract target address from UserOperation callData
     */
    function _extractTarget(UserOperation calldata userOp) internal pure returns (address target) {
        bytes calldata data = userOp.callData;
        if (data.length < 4 + 32) {
            return address(0);
        }
        
        bytes4 selector = bytes4(data[:4]);
        
        // Check if the function is execute
        if (selector == bytes4(keccak256("execute(address,uint256,bytes)"))) {
            // For execute(), target is the first parameter
            assembly {
                // Skip selector (4 bytes) and load the address (32 bytes)
                target := calldataload(add(data.offset, 4))
            }
        }
        // Add support for executeBatch if needed
        else if (selector == bytes4(keccak256("executeBatch(address[],bytes[])"))) {
            // For batch, we currently don't extract targets
            // This could be enhanced to parse the array
            return address(0);
        }
        
        return target;
    }
    
    /**
     * Check sponsorship limits and update usage
     */
    function _checkAndUpdateLimits(address subject, uint256 cost, bool isApp) internal {
        SponsorshipLimit storage limits = isApp ? appLimits[subject] : addressLimits[subject];
        
        // Reset daily limit if a day has passed
        if (block.timestamp > limits.lastReset + 1 days) {
            limits.usedToday = 0;
            limits.lastReset = block.timestamp;
        }
        
        // Check transaction limit
        require(
            cost <= limits.txLimit,
            "SponsorPaymaster: transaction cost exceeds limit"
        );
        
        // Check daily limit
        require(
            limits.usedToday + cost <= limits.dailyLimit,
            "SponsorPaymaster: daily limit exceeded"
        );
        
        // Update usage
        limits.usedToday += cost;
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
        // mode is unused in this implementation
        
        // Decode the context to get sender, target app, and max cost
        (address sender, address app, uint256 maxCost) = abi.decode(context, (address, address, uint256));
        
        // If actualGasCost is less than maxCost, adjust the usage records
        // This ensures we don't over-count against limits
        if (actualGasCost < maxCost) {
            if (sponsoredAddresses[sender]) {
                addressLimits[sender].usedToday -= (maxCost - actualGasCost);
            }
            
            if (sponsoredApps[app]) {
                appLimits[app].usedToday -= (maxCost - actualGasCost);
            }
        }
        
        // Emit event for gas sponsoring
        emit GasSponsored(sender, app, actualGasCost);
    }
    
    /**
     * Allow anyone to deposit funds for gas sponsoring
     */
    receive() external payable {
        emit PaymasterFunded(msg.sender, msg.value);
    }
    
    /**
     * Allow the owner to deposit funds directly to EntryPoint
     */
    function addDepositToEntryPoint(uint256 amount) external payable onlyOwner {
        // If additional ETH was sent, use that amount
        uint256 depositAmount = msg.value > 0 ? msg.value : amount;
        
        if (msg.value == 0) {
            // Using existing balance
            entryPoint.depositTo{value: depositAmount}(address(this));
        } else {
            // Using sent ETH
            entryPoint.depositTo{value: depositAmount}(address(this));
        }
    }
    
    /**
     * Allow the owner to withdraw funds from the EntryPoint
     */
    function withdrawFromEntryPoint(uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(payable(owner()), amount);
    }
    
    /**
     * Allow the owner to withdraw funds from this contract
     */
    function withdrawFunds(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Cannot withdraw to zero address");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Failed to withdraw funds");
    }
} 