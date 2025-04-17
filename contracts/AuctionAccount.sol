// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title AuctionAccount
 * @dev Conta ERC-4337 com funcionalidades específicas para participar em leilões de NFTs
 * Permite fazer lances em leilões com pagamentos compostos (ETH + tokens)
 */
contract AuctionAccount is BaseAccount, IERC721Receiver, Ownable {
    using ECDSA for bytes32;

    // EntryPoint singleton que será autorizado a chamar esta conta
    IEntryPoint private immutable _entryPoint;
    
    // Nonce para operações
    uint256 private _nonce;
    
    // Evento disparado quando a conta recebe um NFT
    event NFTReceived(address operator, address from, uint256 tokenId, bytes data);
    
    // Evento disparado quando um lance é feito
    event BidPlaced(address auction, uint256 nftId, uint256 ethAmount, address tokenAddress, uint256 tokenAmount);

    /**
     * @dev Construtor que inicializa a conta 
     * @param entryPointAddress Endereço do contrato EntryPoint
     * @param owner_ proprietario da conta
     */
    constructor(address entryPointAddress, address owner_) {
        _entryPoint = IEntryPoint(entryPointAddress);
        _transferOwnership(owner_);
    }
    
    /**
     * @dev Retorna o singleton do EntryPoint
     */
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Implementação para BaseAccount.getNonce()
     */
    function getNonce() public view virtual override returns (uint256) {
        return _nonce;
    }

    /**
     * @dev Implementação para validação de assinatura
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash) 
        internal virtual override returns (uint256) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner() != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }
    
    /**
     * @dev Função para executar transações (chamada pelo EntryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }
    
    /**
     * @dev Função para executar transações em lote
     */
    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length && (value.length == 0 || value.length == func.length), "wrong array lengths");
        
        if (value.length == 0) {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], 0, func[i]);
            }
        } else {
            for (uint256 i = 0; i < dest.length; i++) {
                _call(dest[i], value[i], func[i]);
            }
        }
    }
    
    /**
     * @dev Função especializada para fazer lances em leilões com ETH + tokens
     * @param auction Endereço do contrato de Leilao
     * @param nftId ID do NFT no Leilao
     * @param ethAmount Quantidade de ETH para o lance
     * @param governanceToken Endereço do token de governança
     * @param tokenAmount Quantidade de tokens para o lance
     */
    function placeBid(
        address auction,
        uint256 nftId,
        uint256 ethAmount,
        address governanceToken,
        uint256 tokenAmount
    ) external {
        _requireFromEntryPointOrOwner();
        
        // Aprova tokens para o contrato de Leilao
        if (tokenAmount > 0 && governanceToken != address(0)) {
            bytes memory approveCall = abi.encodeWithSelector(
                IERC20.approve.selector,
                auction,
                tokenAmount
            );
            _call(governanceToken, 0, approveCall);
        }
        
        // Faz o lance no Leilao
        bytes memory bidCall = abi.encodeWithSelector(
            bytes4(keccak256("placeBid(uint256,address,uint256)")),
            nftId,
            governanceToken,
            tokenAmount
        );
        _call(auction, ethAmount, bidCall);
        
        emit BidPlaced(auction, nftId, ethAmount, governanceToken, tokenAmount);
    }
    
    /**
     * @dev Função para receber NFTs (implementação de IERC721Receiver)
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        emit NFTReceived(operator, from, tokenId, data);
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /**
     * @dev Função para sacar fundos da conta
     */
    function withdrawEther(address payable recipient, uint256 amount) external {
        _requireFromEntryPointOrOwner();
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Failed to withdraw ether");
    }
    
    /**
     * @dev Função para sacar tokens da conta
     */
    function withdrawTokens(address token, address recipient, uint256 amount) external {
        _requireFromEntryPointOrOwner();
        IERC20(token).transfer(recipient, amount);
    }
    
    /**
     * @dev Requer que o chamador seja o EntryPoint ou o proprietario
     */
    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner(), "account: not Owner or EntryPoint");
    }
    
    /**
     * @dev Função auxiliar para executar chamadas
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
     * @dev Função para adicionar depósito ao EntryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }
    
    /**
     * @dev Função para receber ETH
     */
    receive() external payable {}
    
    /**
     * @dev Função de inicialização que será chamada pelo proxy
     */
    function initialize(address owner_) external {
        _transferOwnership(owner_);
    }
}

/**
 * @title AuctionAccountFactory
 * @dev Factory para criar contas de Leilao compatíveis com ERC-4337
 */
contract AuctionAccountFactory {
    AuctionAccount public immutable accountImplementation;
    
    event AccountCreated(address indexed account, address indexed owner);
    
    constructor(IEntryPoint entryPoint) {
        accountImplementation = new AuctionAccount(address(entryPoint), msg.sender);
    }
    
    /**
     * @dev Cria uma nova conta para o proprietario dado
     * @param owner O proprietario da conta
     * @param salt Salt para o endereço da conta
     * @return ret A nova conta
     */
    function createAccount(address owner, uint256 salt) public returns (AuctionAccount ret) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return AuctionAccount(payable(addr));
        }
        
        ret = AuctionAccount(payable(
            Create2.deploy(
                0, 
                bytes32(salt),
                abi.encodePacked(
                    type(ERC1967Proxy).creationCode,
                    abi.encode(
                        address(accountImplementation),
                        abi.encodeCall(AuctionAccount.initialize, (owner))
                    )
                )
            )
        ));
        
        emit AccountCreated(address(ret), owner);
    }
    
    /**
     * @dev Calcula o endereço da conta para um proprietario e salt
     * @param owner O proprietario da conta
     * @param salt Salt para a criação
     * @return O endereço da conta
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(
                abi.encodePacked(
                    type(ERC1967Proxy).creationCode,
                    abi.encode(
                        address(accountImplementation),
                        abi.encodeCall(AuctionAccount.initialize, (owner))
                    )
                )
            )
        );
    }
}

// Interface simplificada do NFTAuction para evitar dependências circulares
interface INFTAuction {
    function governanceToken() external view returns (address);
    function placeBid(uint256 auctionId, uint256 tokenAmount) external payable;
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 minimumBid,
        uint256 duration,
        uint256 requiredTokens,
        bool includesToken
    ) external;
    function endAuction(uint256 auctionId) external;
    function cancelAuction(uint256 auctionId) external;
} 