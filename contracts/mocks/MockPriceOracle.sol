// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/**
 * @title MockPriceOracle
 * @dev Simple mock oracle for testing the DeFi insurance protocol
 */
contract MockPriceOracle {
    // Price data with timestamp
    uint256 public latestPrice;
    uint256 public lastUpdateTimestamp;
    bool public priceValidity = true;
    address public owner;
    
    event PriceUpdated(uint256 indexed price, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        latestPrice = 2000 * 10**18; // Example: ETH at $2000
        lastUpdateTimestamp = block.timestamp;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Update the price - for testing purposes
     * @param _price The new price
     * @param _valid Whether the price is valid
     */
    function updatePrice(uint256 _price, bool _valid) external onlyOwner {
        latestPrice = _price;
        priceValidity = _valid;
        lastUpdateTimestamp = block.timestamp;
        emit PriceUpdated(_price, block.timestamp);
    }
    
    /**
     * @dev Fetch the latest ETH price
     * @return price The latest price
     * @return valid Whether the price is valid
     */
    function fetchETHPrice() external view returns (uint256 price, bool valid) {
        return (latestPrice, priceValidity);
    }
    
    /**
     * @dev Get the price and timestamp
     * @return price The latest price
     * @return timestamp When the price was last updated
     * @return valid Whether the price is valid
     */
    function getLatestPriceData() external view returns (
        uint256 price,
        uint256 timestamp,
        bool valid
    ) {
        return (latestPrice, lastUpdateTimestamp, priceValidity);
    }
} 