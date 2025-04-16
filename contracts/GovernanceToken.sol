// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GovernanceToken
 * @dev Token de governança para demonstração de leilões com lances compostos
 */
contract GovernanceToken is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 tokenDecimals,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _decimals = tokenDecimals;
        _mint(initialOwner, initialSupply * 10**tokenDecimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Permite ao proprietário cunhar tokens adicionais
     * @param to Endereço do destinatário
     * @param amount Quantidade de tokens a serem cunhados
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
} 