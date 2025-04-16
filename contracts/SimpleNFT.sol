// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SimpleNFT
 * @dev Contrato de NFT simples para fins de teste com o leilão
 */
contract SimpleNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(address initialOwner) ERC721("SimpleNFT", "SNFT") Ownable(initialOwner) {}

    /**
     * @dev Cria um novo NFT
     * @param recipient Endereço que receberá o NFT
     * @param tokenURI URI dos metadados do NFT
     * @return uint256 ID do token cunhado
     */
    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    /**
     * @dev Retorna o total de NFTs cunhados
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }
} 