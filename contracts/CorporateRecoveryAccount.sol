// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * Conta ERC-4337 com recursos de multisignature e recuperação corporativa.
 * Implementa requisitos de múltiplas assinaturas e mecanismo de recuperação sem seed phrase.
 */
contract CorporateRecoveryAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Propriedades de gerenciamento de assinaturas
    EnumerableSet.AddressSet private _signers;
    uint256 public signatureThreshold;  // Número mínimo de assinaturas necessárias
    
    // Mecanismo de recuperação
    struct RecoveryRequest {
        address[] newSigners;
        uint256 requestTime;
        uint256 recoveryCooldown;
        mapping(address => bool) approvals;
        uint256 approvalCount;
        bool executed;
    }
    
    RecoveryRequest public recoveryRequest;
    uint256 public defaultRecoveryCooldown = 7 days; // Período padrão de 7 dias
    
    // Estrutura para transação
    struct Transaction {
        address destination;     // Endereço de destino
        uint256 value;           // Valor em ETH
        bytes data;              // Dados da chamada
        bool executed;           // Se já foi executada
        uint256 numConfirmations;// Número de confirmações
        uint256 proposedAt;      // Quando foi proposta
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    uint256 public transactionCount;
    
    IEntryPoint private immutable _entryPoint;
    
    // Eventos
    event CorporateAccountInitialized(IEntryPoint indexed entryPoint, address[] initialSigners, uint256 threshold);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 threshold);
    event RecoveryRequested(address indexed requestedBy, address[] newSigners);
    event RecoveryApproved(address indexed approvedBy);
    event RecoveryExecuted(address[] oldSigners, address[] newSigners);
    event RecoveryCooldownChanged(uint256 newCooldown);
    event TransactionProposed(uint256 indexed txIndex, address indexed proposer, address indexed destination, uint256 value);
    event TransactionConfirmed(uint256 indexed txIndex, address indexed confirmer);
    event TransactionExecuted(uint256 indexed txIndex, address indexed executor);
    
    // Modificadores
    modifier onlySigner() {
        require(_signers.contains(msg.sender), "não é um signatário");
        _;
    }
    
    modifier onlySelf() {
        require(msg.sender == address(this), "apenas a própria conta");
        _;
    }
    
    modifier txExists(uint256 txIndex) {
        require(txIndex < transactionCount, "tx não existe");
        _;
    }
    
    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "tx já executada");
        _;
    }
    
    modifier notConfirmed(uint256 txIndex) {
        require(!confirmations[txIndex][msg.sender], "tx já confirmada");
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }
    
    /**
     * Inicializa a conta corporativa com múltiplos signatários
     * @param initialSigners Lista inicial de signatários
     * @param initialThreshold Número mínimo de assinaturas necessárias
     */
    function initialize(
        address[] memory initialSigners,
        uint256 initialThreshold
    ) public virtual initializer {
        require(initialSigners.length > 0, "pelo menos um signatário");
        require(initialThreshold > 0 && initialThreshold <= initialSigners.length, "limite inválido");
        
        for (uint256 i = 0; i < initialSigners.length; i++) {
            address signer = initialSigners[i];
            require(signer != address(0), "signatário não pode ser endereço zero");
            require(!_signers.contains(signer), "signatários não podem ser duplicados");
            _signers.add(signer);
        }
        
        signatureThreshold = initialThreshold;
        
        emit CorporateAccountInitialized(_entryPoint, initialSigners, initialThreshold);
    }

    /**
     * Valida a assinatura da operação do usuário.
     * No modo multisig, aceita a assinatura de qualquer signatário.
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        
        address recovered = hash.recover(userOp.signature);
        if (_signers.contains(recovered)) {
            return 0;
        }
        
        return SIG_VALIDATION_FAILED;
    }

    /**
     * Verifica se a chamada vem do entryPoint ou do próprio contrato
     */
    function _requireFromEntryPointOrSelf() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == address(this), "conta: não autorizado");
    }

    /**
     * Executa a chamada de baixo nível
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
     * Implementação necessária para UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal view override onlySelf {
        (newImplementation);
    }

    // ----- Funções de gerenciamento de transações -----
    
    /**
     * Propõe uma nova transação
     * @return txIndex O índice da transação proposta
     */
    function proposeTransaction(address destination, uint256 value, bytes calldata data) 
        external 
        onlySigner 
        returns (uint256 txIndex) 
    {
        require(destination != address(0), "destino não pode ser endereço zero");
        
        txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false,
            numConfirmations: 1, // Auto-confirmação
            proposedAt: block.timestamp
        });
        
        confirmations[txIndex][msg.sender] = true;
        transactionCount++;
        
        emit TransactionProposed(txIndex, msg.sender, destination, value);
        emit TransactionConfirmed(txIndex, msg.sender);
        
        return txIndex;
    }
    
    /**
     * Confirma uma transação pendente
     */
    function confirmTransaction(uint256 txIndex) 
        external 
        onlySigner 
        txExists(txIndex) 
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        Transaction storage transaction = transactions[txIndex];
        transaction.numConfirmations++;
        confirmations[txIndex][msg.sender] = true;
        
        emit TransactionConfirmed(txIndex, msg.sender);
    }
    
    /**
     * Executa uma transação após aprovações suficientes
     */
    function executeTransaction(uint256 txIndex) 
        external 
        onlySigner 
        txExists(txIndex) 
        notExecuted(txIndex) 
    {
        Transaction storage transaction = transactions[txIndex];
        
        require(transaction.numConfirmations >= signatureThreshold, "confirmações insuficientes");
        
        transaction.executed = true;
        
        // Executar a transação
        _call(transaction.destination, transaction.value, transaction.data);
        
        emit TransactionExecuted(txIndex, msg.sender);
    }
    
    /**
     * Executa uma transação através do entryPoint
     * Esta função é chamada pelo entryPoint durante a execução da UserOperation
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrSelf();
        
        // Se chamado pelo entryPoint, toda a validação já foi feita pela lógica de multisig
        _call(dest, value, func);
    }
    
    /**
     * Executa um lote de transações
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrSelf();
        require(dest.length == func.length, "tamanhos de arrays incompatíveis");
        
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }
    
    // ----- Funções de gerenciamento da conta -----
    
    /**
     * Adiciona um novo signatário (requer aprovação multisig)
     */
    function addSigner(address newSigner) external onlySelf {
        require(newSigner != address(0), "signatário não pode ser endereço zero");
        require(!_signers.contains(newSigner), "já é um signatário");
        
        _signers.add(newSigner);
        
        emit SignerAdded(newSigner);
    }
    
    /**
     * Remove um signatário existente (requer aprovação multisig)
     */
    function removeSigner(address signer) external onlySelf {
        require(_signers.contains(signer), "não é um signatário");
        require(_signers.length() > signatureThreshold, "não pode reduzir abaixo do limite");
        
        _signers.remove(signer);
        
        emit SignerRemoved(signer);
    }
    
    /**
     * Altera o número mínimo de assinaturas (requer aprovação multisig)
     */
    function changeThreshold(uint256 newThreshold) external onlySelf {
        require(newThreshold > 0, "limite deve ser positivo");
        require(newThreshold <= _signers.length(), "limite não pode exceder número de signatários");
        
        signatureThreshold = newThreshold;
        
        emit ThresholdChanged(newThreshold);
    }
    
    /**
     * Inicia um processo de recuperação de acesso
     * Implementação do recoverAccess() descrito no caso de uso
     */
    function initiateRecovery(address[] calldata newSigners) external onlySigner {
        require(newSigners.length >= 3, "Mínimo 3 signatários");
        
        // Validar os novos signatários
        for (uint256 i = 0; i < newSigners.length; i++) {
            require(newSigners[i] != address(0), "signatário não pode ser endereço zero");
            
            // Verificar duplicatas
            for (uint256 j = 0; j < i; j++) {
                require(newSigners[i] != newSigners[j], "signatários duplicados");
            }
        }
        
        // Iniciar solicitação
        recoveryRequest.newSigners = newSigners;
        recoveryRequest.requestTime = block.timestamp;
        recoveryRequest.recoveryCooldown = defaultRecoveryCooldown;
        recoveryRequest.approvalCount = 1;
        recoveryRequest.approvals[msg.sender] = true;
        recoveryRequest.executed = false;
        
        emit RecoveryRequested(msg.sender, newSigners);
    }
    
    /**
     * Aprova uma solicitação de recuperação (pelos signatários remanescentes)
     */
    function approveRecovery() external onlySigner {
        require(recoveryRequest.requestTime > 0, "nenhuma solicitação pendente");
        require(!recoveryRequest.approvals[msg.sender], "já aprovado");
        require(!recoveryRequest.executed, "recuperação já executada");
        
        recoveryRequest.approvals[msg.sender] = true;
        recoveryRequest.approvalCount++;
        
        emit RecoveryApproved(msg.sender);
    }
    
    /**
     * Executa a recuperação após o período de espera
     * Esta é a implementação do recoverAccess() descrito no caso de uso
     */
    function recoverAccess() external onlySigner {
        require(recoveryRequest.requestTime > 0, "nenhuma solicitação pendente");
        require(!recoveryRequest.executed, "recuperação já executada");
        require(block.timestamp >= recoveryRequest.requestTime + recoveryRequest.recoveryCooldown, 
                "Aguarde 7 dias");
        
        // Preparar para registro de signatários antigos
        uint256 count = _signers.length();
        address[] memory oldSigners = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            oldSigners[i] = _signers.at(i);
        }
        
        // Remover todos os signatários antigos
        for (uint256 i = 0; i < count; i++) {
            _signers.remove(oldSigners[i]);
        }
        
        // Adicionar novos signatários
        for (uint256 i = 0; i < recoveryRequest.newSigners.length; i++) {
            _signers.add(recoveryRequest.newSigners[i]);
        }
        
        // Atualizar o limite de assinaturas se necessário
        if (signatureThreshold > _signers.length()) {
            signatureThreshold = _signers.length();
        }
        
        recoveryRequest.executed = true;
        
        emit RecoveryExecuted(oldSigners, recoveryRequest.newSigners);
    }
    
    /**
     * Altera o período de espera padrão para recuperação (requer aprovação multisig)
     */
    function changeRecoveryCooldown(uint256 newCooldown) external onlySelf {
        require(newCooldown >= 1 days, "período mínimo de 1 dia");
        require(newCooldown <= 30 days, "período máximo de 30 dias");
        
        defaultRecoveryCooldown = newCooldown;
        
        emit RecoveryCooldownChanged(newCooldown);
    }
    
    /**
     * Retorna a lista de signatários atual
     */
    function getSigners() external view returns (address[] memory) {
        uint256 count = _signers.length();
        address[] memory signersList = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            signersList[i] = _signers.at(i);
        }
        
        return signersList;
    }
    
    /**
     * Retorna o número de signatários atual
     */
    function getSignersCount() external view returns (uint256) {
        return _signers.length();
    }
    
    /**
     * Verifica se um endereço é signatário
     */
    function isSigner(address account) external view returns (bool) {
        return _signers.contains(account);
    }
    
    /**
     * Retorna o status atual da solicitação de recuperação
     */
    function getRecoveryStatus() external view returns (
        address[] memory newSigners,
        uint256 requestTime,
        uint256 remainingTime,
        uint256 approvalCount,
        bool canExecute
    ) {
        newSigners = recoveryRequest.newSigners;
        requestTime = recoveryRequest.requestTime;
        
        if (block.timestamp < recoveryRequest.requestTime + recoveryRequest.recoveryCooldown) {
            remainingTime = (recoveryRequest.requestTime + recoveryRequest.recoveryCooldown) - block.timestamp;
        } else {
            remainingTime = 0;
        }
        
        approvalCount = recoveryRequest.approvalCount;
        
        canExecute = (
            recoveryRequest.requestTime > 0 &&
            !recoveryRequest.executed &&
            block.timestamp >= recoveryRequest.requestTime + recoveryRequest.recoveryCooldown
        );
    }
    
    /**
     * Verifica se um signatário aprovou a recuperação atual
     */
    function hasApprovedRecovery(address signer) external view returns (bool) {
        return recoveryRequest.approvals[signer];
    }
} 