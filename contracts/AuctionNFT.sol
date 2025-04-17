// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * NFT para os leilões com pagamento composto
 */
contract AuctionNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Evento para rastrear criação de novos NFTs
    event NFTCreated(uint256 indexed tokenId, string name, string uri);
    
    constructor() ERC721("Auction NFT", "ANFT") {}
    
    /**
     * Cria um novo NFT com metadados específicos
     * @param to Endereço que receberá o NFT
     * @param name Nome do NFT
     * @param tokenURI URI dos metadados
     * @return uint256 ID do token criado
     */
    function createNFT(address to, string memory name, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        
        _mint(to, newItemId);
        _setTokenURI(newItemId, tokenURI);
        
        emit NFTCreated(newItemId, name, tokenURI);
        
        return newItemId;
    }
    
    /**
     * Cria um lote de NFTs para um Leilao
     * @param to Endereço que receberá os NFTs
     * @param count Número de NFTs a criar
     * @param baseURI URI base para os metadados
     * @return uint256[] Array com os IDs dos tokens criados
     */
    function createBatch(address to, uint256 count, string memory baseURI)
        public
        onlyOwner
        returns (uint256[] memory)
    {
        uint256[] memory tokenIds = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            _tokenIds.increment();
            uint256 newItemId = _tokenIds.current();
            
            _mint(to, newItemId);
            _setTokenURI(newItemId, string(abi.encodePacked(baseURI, "/", uint2str(newItemId))));
            
            tokenIds[i] = newItemId;
            emit NFTCreated(newItemId, string(abi.encodePacked("NFT #", uint2str(newItemId))), tokenURI(newItemId));
        }
        
        return tokenIds;
    }
    
    /**
     * Utilitário para converter uint para string
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
} 