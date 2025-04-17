// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * Contrato de Leilao de NFTs que aceita combinação de ETH + tokens de governança
 */
contract ComplexNFTAuction is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Token de governança aceito como parte do pagamento
    IERC20 public govToken;
    
    // Estrutura para armazenar informações do Leilao
    struct Auction {
        uint256 tokenId;        // ID do NFT sendo leiloado
        address nftContract;    // Contrato do NFT
        address payable seller; // Endereço do vendedor
        uint256 startingPrice;  // preco inicial em ETH
        uint256 minTokenAmount; // Quantidade mínima de tokens de governança
        uint256 endTime;        // Timestamp de fim do Leilao
        bool active;            // Se o Leilao esta ativo
        
        // Informações do lance atual
        address payable highestBidder;
        uint256 highestEthBid;
        uint256 highestTokenBid;
    }
    
    // Estrutura para armazenar um lance
    struct Bid {
        address bidder;
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 timestamp;
    }
    
    // Mapeamento de auctions por ID
    mapping(uint256 => Auction) public auctions;
    
    // Histórico de lances por Leilao
    mapping(uint256 => Bid[]) public auctionBids;
    
    // Contador de leilões
    uint256 public auctionIdCounter;
    
    // Taxa do marketplace (5%)
    uint256 public constant PLATFORM_FEE = 500; // 5%
    uint256 public constant PERCENTAGE_BASE = 10000; // 100%
    
    // Taxa usada para queimar tokens (desvalorizá-los)
    uint256 public burnRatio = 5000; // 50% dos tokens são queimados, 50% vão para o vendedor
    
    // Eventos
    event AuctionCreated(uint256 indexed auctionId, uint256 indexed tokenId, address indexed nftContract, uint256 startingPrice, uint256 minTokenAmount, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 ethAmount, uint256 tokenAmount);
    event AuctionCancelled(uint256 indexed auctionId);
    event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 ethAmount, uint256 tokenAmount);
    event BurnRatioChanged(uint256 newRatio);
    
    constructor(address _govToken) {
        govToken = IERC20(_govToken);
    }
    
    /**
     * Cria um novo Leilao
     */
    function createAuction(
        uint256 tokenId,
        address nftContract,
        uint256 startingPrice,
        uint256 minTokenAmount,
        uint256 duration
    ) external returns (uint256) {
        require(startingPrice > 0, "Starting price must be greater than zero");
        require(minTokenAmount > 0, "Token amount must be greater than zero");
        require(duration >= 1 hours, "Minimum duration is 1 hour");
        require(duration <= 30 days, "Maximum duration is 30 days");
        
        // Transfere o NFT para o contrato
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        // Cria o Leilao
        uint256 auctionId = auctionIdCounter++;
        uint256 endTime = block.timestamp + duration;
        
        auctions[auctionId] = Auction({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: payable(msg.sender),
            startingPrice: startingPrice,
            minTokenAmount: minTokenAmount,
            endTime: endTime,
            active: true,
            highestBidder: payable(address(0)),
            highestEthBid: 0,
            highestTokenBid: 0
        });
        
        emit AuctionCreated(auctionId, tokenId, nftContract, startingPrice, minTokenAmount, endTime);
        
        return auctionId;
    }
    
    /**
     * Dá um lance no Leilao usando ETH + tokens de governança
     */
    function placeBid(uint256 auctionId, uint256 tokenAmount) 
        external
        payable
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.active, "Auction is not active");
        require(block.timestamp < auction.endTime, "Leilao encerrado");
        require(msg.sender != auction.seller, "Vendedor nao pode dar lance");
        require(msg.value >= auction.startingPrice, "Lance em ETH abaixo do preco minimo");
        require(tokenAmount >= auction.minTokenAmount, "Quantidade de tokens insuficiente");
        
        // Verifica se o lance atual é maior que o anterior
        require(
            msg.value > auction.highestEthBid || 
            (msg.value == auction.highestEthBid && tokenAmount > auction.highestTokenBid),
            "Lance nao supera o maior lance atual"
        );
        
        // Verifica se o usuário tem tokens suficientes e permitiu o contrato a transferi-los
        require(govToken.balanceOf(msg.sender) >= tokenAmount, "Saldo de tokens insuficiente");
        require(govToken.allowance(msg.sender, address(this)) >= tokenAmount, "Aprovacao de tokens insuficiente");
        
        // Devolve o lance anterior
        if (auction.highestBidder != address(0)) {
            // Devolve o ETH para o lance anterior
            auction.highestBidder.transfer(auction.highestEthBid);
            
            // Devolve os tokens para o lance anterior
            govToken.safeTransfer(auction.highestBidder, auction.highestTokenBid);
        }
        
        // Registra o novo lance
        auction.highestBidder = payable(msg.sender);
        auction.highestEthBid = msg.value;
        auction.highestTokenBid = tokenAmount;
        
        // Transfere os tokens para o contrato
        govToken.safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Registra o lance no histórico
        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            ethAmount: msg.value,
            tokenAmount: tokenAmount,
            timestamp: block.timestamp
        }));
        
        // Estende o Leilao se estiver nos últimos 10 minutos
        if (auction.endTime - block.timestamp < 10 minutes) {
            auction.endTime += 10 minutes;
        }
        
        emit BidPlaced(auctionId, msg.sender, msg.value, tokenAmount);
    }
    
    /**
     * Função implementada pelo caso de uso
     * Permite dar lance via contrato compatível com ERC-4337
     */
    function placeBidComplex(uint256 auctionId, uint256 ethAmount, uint256 tokenAmount)
        external
        nonReentrant
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.active, "Leilao nao esta ativo");
        require(block.timestamp < auction.endTime, "Leilao encerrado");
        require(msg.sender != auction.seller, "Vendedor nao pode dar lance");
        require(ethAmount >= auction.startingPrice, "Lance em ETH abaixo do preco minimo");
        require(tokenAmount >= auction.minTokenAmount, "Quantidade de tokens insuficiente");
        
        // Verifica se o lance atual é maior que o anterior
        require(
            ethAmount > auction.highestEthBid || 
            (ethAmount == auction.highestEthBid && tokenAmount > auction.highestTokenBid),
            "Lance nao supera o maior lance atual"
        );
        
        // Verifica se o usuário tem tokens suficientes e permitiu o contrato a transferi-los
        require(govToken.balanceOf(msg.sender) >= tokenAmount, "Saldo de tokens insuficiente");
        require(govToken.allowance(msg.sender, address(this)) >= tokenAmount, "Aprovacao de tokens insuficiente");
        
        // Devolve o lance anterior
        if (auction.highestBidder != address(0)) {
            // Devolve o ETH para o lance anterior
            auction.highestBidder.transfer(auction.highestEthBid);
            
            // Devolve os tokens para o lance anterior
            govToken.safeTransfer(auction.highestBidder, auction.highestTokenBid);
        }
        
        // Registra o novo lance
        auction.highestBidder = payable(msg.sender);
        auction.highestEthBid = ethAmount;
        auction.highestTokenBid = tokenAmount;
        
        // Transfere ETH do usuário para o contrato
        require(msg.sender.balance >= ethAmount, "Saldo ETH insuficiente");
        (bool success, ) = address(this).call{value: ethAmount}("");
        require(success, "transferencia de ETH falhou");
        
        // Transfere os tokens para o contrato
        govToken.safeTransferFrom(msg.sender, address(this), tokenAmount);
        
        // Registra o lance no histórico
        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            ethAmount: ethAmount,
            tokenAmount: tokenAmount,
            timestamp: block.timestamp
        }));
        
        // Estende o Leilao se estiver nos últimos 10 minutos
        if (auction.endTime - block.timestamp < 10 minutes) {
            auction.endTime += 10 minutes;
        }
        
        emit BidPlaced(auctionId, msg.sender, ethAmount, tokenAmount);
    }
    
    /**
     * Finaliza um Leilao
     */
    function finalizeAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.active, "Leilao nao esta ativo");
        require(
            block.timestamp >= auction.endTime || 
            msg.sender == owner() || 
            msg.sender == auction.seller,
            "Leilao ainda nao encerrado"
        );
        
        auction.active = false;
        
        // Se houve lances
        if (auction.highestBidder != address(0)) {
            // Calcular a taxa do marketplace
            uint256 fee = (auction.highestEthBid * PLATFORM_FEE) / PERCENTAGE_BASE;
            uint256 sellerAmount = auction.highestEthBid - fee;
            
            // Transferir o NFT para o vencedor
            IERC721(auction.nftContract).transferFrom(address(this), auction.highestBidder, auction.tokenId);
            
            // Transferir ETH para o vendedor
            auction.seller.transfer(sellerAmount);
            
            // Queimar uma parte dos tokens e enviar o resto para o vendedor
            uint256 tokensToSeller = (auction.highestTokenBid * (PERCENTAGE_BASE - burnRatio)) / PERCENTAGE_BASE;
            uint256 tokensToBurn = auction.highestTokenBid - tokensToSeller;
            
            if (tokensToSeller > 0) {
                govToken.safeTransfer(auction.seller, tokensToSeller);
            }
            
            if (tokensToBurn > 0) {
                // Queimar tokens (transferir para endereço morto)
                govToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), tokensToBurn);
            }
            
            emit AuctionFinalized(auctionId, auction.highestBidder, auction.highestEthBid, auction.highestTokenBid);
        } else {
            // Sem lances, devolver NFT para o vendedor
            IERC721(auction.nftContract).transferFrom(address(this), auction.seller, auction.tokenId);
            
            emit AuctionCancelled(auctionId);
        }
    }
    
    /**
     * Cancela um Leilao (apenas vendedor ou admin)
     */
    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        
        require(auction.active, "Leilao nao esta ativo");
        require(msg.sender == auction.seller || msg.sender == owner(), "Apenas vendedor ou admin");
        
        auction.active = false;
        
        // Devolver NFT para o vendedor
        IERC721(auction.nftContract).transferFrom(address(this), auction.seller, auction.tokenId);
        
        // Devolver lance atual, se houver
        if (auction.highestBidder != address(0)) {
            auction.highestBidder.transfer(auction.highestEthBid);
            govToken.safeTransfer(auction.highestBidder, auction.highestTokenBid);
        }
        
        emit AuctionCancelled(auctionId);
    }
    
    /**
     * Modifica a proporção de tokens que são queimados vs. enviados ao vendedor
     */
    function setBurnRatio(uint256 newRatio) external onlyOwner {
        require(newRatio <= PERCENTAGE_BASE, "Razao nao pode exceder 100%");
        burnRatio = newRatio;
        
        emit BurnRatioChanged(newRatio);
    }
    
    /**
     * Retorna todos os lances de um Leilao
     */
    function getAuctionBids(uint256 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }
    
    /**
     * Retorna detalhes de um Leilao
     */
    function getAuction(uint256 auctionId) external view returns (
        uint256 tokenId,
        address nftContract,
        address seller,
        uint256 startingPrice,
        uint256 minTokenAmount,
        uint256 endTime,
        bool active,
        address highestBidder,
        uint256 highestEthBid,
        uint256 highestTokenBid
    ) {
        Auction storage auction = auctions[auctionId];
        
        return (
            auction.tokenId,
            auction.nftContract,
            auction.seller,
            auction.startingPrice,
            auction.minTokenAmount,
            auction.endTime,
            auction.active,
            auction.highestBidder,
            auction.highestEthBid,
            auction.highestTokenBid
        );
    }
    
    /**
     * Retorna os leilões ativos
     */
    function getActiveAuctions(uint256 offset, uint256 limit) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Primeiro, conte quantos leilões ativos existem
        for (uint256 i = 0; i < auctionIdCounter; i++) {
            if (auctions[i].active) {
                count++;
            }
        }
        
        // Ajustar o limite se necessário
        if (limit > count - offset) {
            limit = count > offset ? count - offset : 0;
        }
        
        uint256[] memory activeAuctions = new uint256[](limit);
        uint256 index = 0;
        
        // Agora, colete os IDs
        for (uint256 i = 0; i < auctionIdCounter && index < limit; i++) {
            if (auctions[i].active) {
                if (offset > 0) {
                    offset--;
                } else {
                    activeAuctions[index++] = i;
                }
            }
        }
        
        return activeAuctions;
    }
    
    /**
     * Saca taxas acumuladas (apenas owner)
     */
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
} 