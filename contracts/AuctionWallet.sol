// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * Carteira compatível com ERC-4337 para leilões de NFTs
 * Permite dar lances combinando ETH + tokens em uma única transação
 */
contract AuctionWallet is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    // O EntryPoint único que valida as assinaturas
    IEntryPoint private immutable _entryPoint;

    // Endereço do proprietário da conta
    address public owner;

    // Nonce para evitar repetição de transações
    uint256 private _nonce;

    // Evento emitido quando ocorre uma transferência
    event SimpleAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    // Modificador para restringir ao proprietário
    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o proprietário pode chamar");
        _;
    }

    // Modificador para restringir ao entrypoint ou ao proprietário
    modifier onlyOwnerOrEntryPoint() {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "Apenas para proprietário ou entrypoint");
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // Erro personalizado para quando o chamador não é o EntryPoint
    error CallerIsNotEntryPoint();

    // Construtor para implantar a implementação
    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * Inicializa a conta.
     * @param anOwner O proprietário da conta
     */
    function initialize(address anOwner) public virtual initializer {
        _initialize(anOwner);
    }

    // Inicialização interna
    function _initialize(address anOwner) internal virtual {
        owner = anOwner;
        emit SimpleAccountInitialized(_entryPoint, owner);
    }

    /**
     * Executa uma transação (chamada pelo EntryPoint)
     * @param dest Destino da transação
     * @param value ETH a ser enviado
     * @param func Função para executar
     */
    function execute(address dest, uint256 value, bytes calldata func) external onlyOwnerOrEntryPoint {
        _call(dest, value, func);
    }

    /**
     * Executa várias transações (chamada pelo EntryPoint)
     * @param dest Destinos das transações
     * @param value ETH a ser enviado
     * @param func Funções para executar
     */
    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external onlyOwnerOrEntryPoint {
        require(dest.length == func.length && (value.length == 0 || value.length == func.length), "Arrays de parâmetros com tamanhos diferentes");
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
     * Implementa o caso de uso: Lance de Leilão Complexo
     * Permite dar um lance em leilão com ETH + tokens em uma única operação atômica
     * @param auctionContract Endereço do contrato de leilão
     * @param auctionId ID do leilão
     * @param ethAmount Quantidade de ETH para o lance
     * @param tokenContract Endereço do contrato do token
     * @param tokenAmount Quantidade de tokens para o lance
     */
    function placeBidWithTokens(
        address auctionContract,
        uint256 auctionId,
        uint256 ethAmount,
        address tokenContract,
        uint256 tokenAmount
    ) external onlyOwnerOrEntryPoint {
        // Aprova tokens para o contrato de leilão
        bytes memory approveData = abi.encodeWithSignature(
            "approve(address,uint256)",
            auctionContract,
            tokenAmount
        );
        _call(tokenContract, 0, approveData);

        // Dá o lance no leilão
        bytes memory bidData = abi.encodeWithSignature(
            "placeBidComplex(uint256,uint256,uint256)",
            auctionId,
            ethAmount,
            tokenAmount
        );
        _call(auctionContract, ethAmount, bidData);
    }

    /**
     * Função interna para executar chamadas
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
     * Verifica a assinatura de uma operação
     * @param userOp Operação do usuário a ser validada
     * @param userOpHash Hash da operação do usuário
     * @return validationData Dados de validação conforme definido por EIP-4337
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }

    /**
     * Obtém o nonce da conta
     */
    function getNonce() public view returns (uint256) {
        return _nonce;
    }

    /**
     * Implementação de ERC-1271
     * @param _hash Hash assinado
     * @param _signature Assinatura a verificar
     * @return Valor mágico se a assinatura for válida
     */
    function isValidSignature(bytes32 _hash, bytes memory _signature) external view returns (bytes4) {
        if (owner == ECDSA.recover(_hash.toEthSignedMessageHash(), _signature)) {
            return 0x1626ba7e; // bytes4(keccak256("isValidSignature(bytes32,bytes)"))
        } else {
            return 0xffffffff;
        }
    }

    /**
     * Saca ETH da conta para o proprietário
     * @param amount Quantidade a sacar
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Saldo insuficiente");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Falha na transferência");
    }

    /**
     * Saca tokens da conta para o proprietário
     * @param token Endereço do token
     * @param amount Quantidade a sacar
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20 tokenContract = IERC20(token);
        tokenContract.transfer(owner, amount);
    }

    /**
     * Implementação da função de upgrade para UUPSUpgradeable
     */
    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == owner, "Apenas o proprietário pode atualizar");
    }

    receive() external payable {}
} 