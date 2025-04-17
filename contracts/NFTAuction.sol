// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTAuction
 * @dev Contrato para leilões de NFTs que aceita ETH + tokens de governança como pagamento
 */
contract NFTAuction is ReentrancyGuard, Ownable {
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 minEthAmount;
        uint256 minTokenAmount;
        uint256 endTime;
        address highestBidder;
        uint256 highestEthBid;
        uint256 highestTokenBid;
        bool ended;
        bool claimed;
    }

    // Token de governança usado para lances
    IERC20 public governanceToken;
    
    // ID do Leilao => Estrutura do Leilao
    mapping(uint256 => Auction) public auctions;
    
    // Contador de leilões
    uint256 public auctionCounter;
    
    // Armazena os lances de tokens para devolução em caso de superação
    mapping(uint256 => mapping(address => uint256)) public tokenBids;
    
    // Eventos
    event AuctionCreated(uint256 auctionId, address seller, address nftContract, uint256 tokenId, uint256 minEthAmount, uint256 minTokenAmount, uint256 endTime);
    event BidPlaced(uint256 auctionId, address bidder, uint256 ethAmount, uint256 tokenAmount);
    event AuctionEnded(uint256 auctionId, address winner, uint256 ethAmount, uint256 tokenAmount);
    event AuctionCancelled(uint256 auctionId);
    event NFTClaimed(uint256 auctionId, address winner);
    event FundsClaimed(uint256 auctionId, address seller, uint256 ethAmount, uint256 tokenAmount);

    constructor(address _governanceToken, address initialOwner) {
        governanceToken = IERC20(_governanceToken);
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Cria um novo Leilao
     * @param nftContract Endereço do contrato NFT
     * @param tokenId ID do token a ser leiloado
     * @param minEthAmount Valor minimo em ETH para o lance inicial
     * @param minTokenAmount Valor minimo em tokens de governança para o lance inicial
     * @param duration Duração do Leilao em segundos
     * @return auctionId ID do Leilao criado
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minEthAmount,
        uint256 minTokenAmount,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(duration > 0, "Duracao deve ser maior que zero");
        
        // Transfere o NFT para o contrato
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        auctionId = auctionCounter++;
        uint256 endTime = block.timestamp + duration;
        
        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            minEthAmount: minEthAmount,
            minTokenAmount: minTokenAmount,
            endTime: endTime,
            highestBidder: address(0),
            highestEthBid: 0,
            highestTokenBid: 0,
            ended: false,
            claimed: false
        });
        
        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, minEthAmount, minTokenAmount, endTime);
        return auctionId;
    }

    /**
     * @dev Permite um usuário fazer um lance com ETH + tokens
     * @param auctionId ID do Leilao
     * @param tokenAmount Quantidade de tokens de governança incluídos no lance
     */
    function placeBid(uint256 auctionId, uint256 tokenAmount) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Leilao ja encerrado");
        require(block.timestamp < auction.endTime, "Leilao expirado");
        require(msg.value >= auction.minEthAmount, "ETH insuficiente");
        require(tokenAmount >= auction.minTokenAmount, "Tokens insuficientes");
        
        // Verifica se o lance é maior que o atual
        bool isHigherBid = (msg.value > auction.highestEthBid) || 
                          (msg.value == auction.highestEthBid && tokenAmount > auction.highestTokenBid);
        
        require(isHigherBid, "Lance inferior ao atual");
        
        // Transfere os tokens para o contrato
        require(governanceToken.transferFrom(msg.sender, address(this), tokenAmount), "Falha na transferencia de tokens");
        
        // Devolve o lance anterior de tokens
        if (auction.highestBidder != address(0)) {
            // Devolve ETH para o lance anterior
            (bool sent, ) = auction.highestBidder.call{value: auction.highestEthBid}("");
            require(sent, "Falha ao devolver ETH");
            
            // Devolve tokens para o lance anterior
            require(governanceToken.transfer(auction.highestBidder, auction.highestTokenBid), "Falha ao devolver tokens");
        }
        
        // Atualiza o maior lance
        auction.highestBidder = msg.sender;
        auction.highestEthBid = msg.value;
        auction.highestTokenBid = tokenAmount;
        
        // Armazena o lance de tokens para possível devolução futura
        tokenBids[auctionId][msg.sender] = tokenAmount;
        
        emit BidPlaced(auctionId, msg.sender, msg.value, tokenAmount);
    }

    /**
     * @dev Encerra um Leilao após o tempo expirar
     * @param auctionId ID do Leilao a ser encerrado
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Leilao ja encerrado");
        require(block.timestamp >= auction.endTime, "Leilao ainda em andamento");
        
        auction.ended = true;
        
        emit AuctionEnded(auctionId, auction.highestBidder, auction.highestEthBid, auction.highestTokenBid);
    }
    
    /**
     * @dev Permite o vencedor reivindicar o NFT após o fim do Leilao
     * @param auctionId ID do Leilao
     */
    function claimNFT(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.ended, "Leilao nao encerrado");
        require(msg.sender == auction.highestBidder, "Apenas o vencedor pode reivindicar");
        require(!auction.claimed, "NFT ja reivindicado");
        
        auction.claimed = true;
        
        // Transfere o NFT para o vencedor
        IERC721(auction.nftContract).transferFrom(address(this), auction.highestBidder, auction.tokenId);
        
        emit NFTClaimed(auctionId, auction.highestBidder);
    }
    
    /**
     * @dev Permite o vendedor reivindicar os fundos após o fim do Leilao
     * @param auctionId ID do Leilao
     */
    function claimFunds(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.ended, "Leilao nao encerrado");
        require(msg.sender == auction.seller, "Apenas o vendedor pode reivindicar");
        
        uint256 ethAmount = auction.highestEthBid;
        uint256 tokenAmount = auction.highestTokenBid;
        
        // Zera os valores para evitar reentrância
        auction.highestEthBid = 0;
        auction.highestTokenBid = 0;
        
        // Transfere ETH para o vendedor
        (bool sent, ) = auction.seller.call{value: ethAmount}("");
        require(sent, "Falha ao enviar ETH");
        
        // Transfere tokens para o vendedor
        require(governanceToken.transfer(auction.seller, tokenAmount), "Falha ao transferir tokens");
        
        emit FundsClaimed(auctionId, auction.seller, ethAmount, tokenAmount);
    }
    
    /**
     * @dev Cancela um Leilao (apenas vendedor ou sem lances)
     * @param auctionId ID do Leilao
     */
    function cancelAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(!auction.ended, "Leilao ja encerrado");
        require(msg.sender == auction.seller || auction.highestBidder == address(0), "Nao autorizado");
        
        auction.ended = true;
        
        // Se houver um lance, devolve ao licitante
        if (auction.highestBidder != address(0)) {
            // Devolve ETH
            (bool sent, ) = auction.highestBidder.call{value: auction.highestEthBid}("");
            require(sent, "Falha ao devolver ETH");
            
            // Devolve tokens
            require(governanceToken.transfer(auction.highestBidder, auction.highestTokenBid), "Falha ao devolver tokens");
        }
        
        // Devolve o NFT ao vendedor
        IERC721(auction.nftContract).transferFrom(address(this), auction.seller, auction.tokenId);
        
        emit AuctionCancelled(auctionId);
    }
} 