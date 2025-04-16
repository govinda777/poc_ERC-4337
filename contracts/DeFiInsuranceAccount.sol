// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./mocks/MockPriceOracle.sol";

/**
 * @title DeFiInsuranceAccount
 * @dev ERC-4337 account with DeFi insurance and automatic rescue functionality
 * Monitors ETH price via oracle and liquidates position if price drops by a certain percentage
 */
contract DeFiInsuranceAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    // The EntryPoint singleton we trust
    IEntryPoint private immutable _entryPoint;
    
    // Owner of this account
    address public owner;
    
    // Oracle for price monitoring
    MockPriceOracle public oracle;
    
    // Insurance settings
    uint256 public triggerPrice; // Price that triggers liquidation
    uint256 public depositAmount; // Amount of ETH deposited for insurance
    address public rescueDestination; // Where to send funds after liquidation
    bool public liquidated; // Whether this account has been liquidated
    uint256 public lastPriceCheck; // Timestamp of last price check
    uint256 public priceCheckInterval = 4 hours; // How often to check price (can be adjusted)
    
    // The percentage drop that triggers liquidation (20% = 2000)
    uint256 public constant TRIGGER_PERCENTAGE = 2000;
    uint256 public constant PERCENTAGE_BASE = 10000;
    
    // Events
    event InsuranceAccountInitialized(address indexed owner, address indexed oracle);
    event DepositReceived(uint256 amount);
    event TriggerPriceSet(uint256 triggerPrice);
    event PositionLiquidated(uint256 timestamp, uint256 price, uint256 amount);
    event RescueDestinationChanged(address indexed newDestination);
    
    /**
     * Constructor
     */
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }
    
    /**
     * Initialize function (must be called right after deployment)
     * @param _owner Owner of this account
     * @param _oracle Address of the price oracle
     * @param _rescueDestination Address to send funds after liquidation
     */
    function initialize(
        address _owner,
        address _oracle,
        address _rescueDestination
    ) public initializer {
        owner = _owner;
        oracle = MockPriceOracle(_oracle);
        rescueDestination = _rescueDestination;
        lastPriceCheck = block.timestamp;
        
        // Get initial price and set trigger price 20% below it
        (uint256 currentPrice, bool valid) = oracle.fetchETHPrice();
        require(valid, "Invalid price from oracle");
        
        triggerPrice = (currentPrice * (PERCENTAGE_BASE - TRIGGER_PERCENTAGE)) / PERCENTAGE_BASE;
        
        emit InsuranceAccountInitialized(_owner, _oracle);
        emit TriggerPriceSet(triggerPrice);
        emit RescueDestinationChanged(_rescueDestination);
    }
    
    /**
     * Return the entryPoint used by this account
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }
    
    /**
     * Deposit ETH for insurance coverage
     */
    function deposit() external payable {
        require(!liquidated, "Account already liquidated");
        depositAmount += msg.value;
        emit DepositReceived(msg.value);
    }
    
    /**
     * Update rescue destination
     * @param _rescueDestination New address to send funds after liquidation
     */
    function setRescueDestination(address _rescueDestination) external {
        _requireFromEntryPointOrOwner();
        require(!liquidated, "Account already liquidated");
        rescueDestination = _rescueDestination;
        emit RescueDestinationChanged(_rescueDestination);
    }
    
    /**
     * Execute a transaction (called by EntryPoint)
     * @param dest Destination address to call
     * @param value Amount of ETH to transfer
     * @param func Data to pass to destination
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        require(!liquidated, "Account already liquidated");
        _call(dest, value, func);
    }
    
    /**
     * Execute a batch of transactions
     * @param dest Array of destination addresses
     * @param value Array of ETH amounts to transfer
     * @param func Array of data to pass to each destination
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        require(!liquidated, "Account already liquidated");
        require(dest.length == func.length && value.length == func.length, "Wrong array lengths");
        
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }
    
    /**
     * Check if liquidation conditions are met and execute liquidation if necessary
     * @return Whether liquidation was performed
     */
    function checkAndExecuteLiquidation() external returns (bool) {
        require(!liquidated, "Account already liquidated");
        require(block.timestamp >= lastPriceCheck + priceCheckInterval, "Check too soon");
        
        lastPriceCheck = block.timestamp;
        
        (uint256 price, bool valid) = oracle.fetchETHPrice();
        require(valid, "Invalid price from oracle");
        
        if (price <= triggerPrice) {
            // Liquidation condition met
            _liquidatePosition();
            return true;
        }
        
        return false;
    }
    
    /**
     * Manually trigger liquidation (emergency function)
     */
    function executeLiquidation() external {
        _requireFromEntryPointOrOwner();
        
        (uint256 price, bool valid) = oracle.fetchETHPrice();
        require(valid && price <= triggerPrice, "Condition not met");
        
        _liquidatePosition();
    }
    
    /**
     * Internal function to liquidate position
     */
    function _liquidatePosition() internal {
        require(!liquidated, "Account already liquidated");
        liquidated = true;
        
        uint256 balance = address(this).balance;
        emit PositionLiquidated(block.timestamp, triggerPrice, balance);
        
        // Transfer all ETH to rescue destination
        if (balance > 0) {
            (bool success, ) = rescueDestination.call{value: balance}("");
            require(success, "Transfer failed");
        }
    }
    
    /**
     * Validate user operation
     * @param userOp User operation to validate
     * @param userOpHash Hash of the user operation
     * @param missingAccountFunds Missing funds needed to pay for the operation
     * @return validationData 0 if valid, non-zero otherwise
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external virtual override returns (uint256 validationData) {
        _requireFromEntryPoint();
        
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (hash.recover(userOp.signature) != owner) {
            return SIG_VALIDATION_FAILED;
        }
        
        // Pay for the gas
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Failed to pay for gas");
        }
        
        return 0; // Signature is valid
    }
    
    /**
     * Internal utility function to make calls
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
     * Check if the caller is the entry point or owner
     */
    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == owner,
            "Caller is not EntryPoint or owner"
        );
    }
    
    /**
     * Return true if the contract is to be upgraded
     */
    function _authorizeUpgrade(address) internal view override {
        _requireFromEntryPointOrOwner();
    }
    
    /**
     * Check if account can be liquidated
     * @return canLiquidate Whether the account can be liquidated
     * @return currentPrice Current ETH price
     */
    function canBeLiquidated() external view returns (bool canLiquidate, uint256 currentPrice) {
        if (liquidated) {
            return (false, 0);
        }
        
        (uint256 price, bool valid) = oracle.fetchETHPrice();
        if (!valid) {
            return (false, price);
        }
        
        return (price <= triggerPrice, price);
    }
    
    /**
     * Receive function to accept ETH deposits
     */
    receive() external payable {
        if (msg.value > 0) {
            emit DepositReceived(msg.value);
        }
    }
} 