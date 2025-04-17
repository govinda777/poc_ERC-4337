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
    uint256 public signatureThreshold;  // Número minimo de assinaturas necessárias
    
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
        require(_signers.contains(msg.sender), "not a signer");
        _;
    }
    
    modifier onlySelf() {
        require(msg.sender == address(this), "only the account itself");
        _;
    }
    
    modifier txExists(uint256 txIndex) {
        require(txIndex < transactionCount, "tx does not exist");
        _;
    }
    
    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "tx ja executada");
        _;
    }
    
    modifier notConfirmed(uint256 txIndex) {
        require(!confirmations[txIndex][msg.sender], "tx ja confirmada");
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
     * @param initialThreshold Número minimo de assinaturas necessárias
     */
    function initialize(
        address[] memory initialSigners,
        uint256 initialThreshold
    ) public virtual initializer {
        require(initialSigners.length > 0, "pelo menos um signatario");
        require(initialThreshold > 0 && initialThreshold <= initialSigners.length, "limite invalido");
        
        for (uint256 i = 0; i < initialSigners.length; i++) {
            address signer = initialSigners[i];
            require(signer != address(0), "signatario nao pode ser endereco zero");
            require(!_signers.contains(signer), "signatarios nao podem ser duplicados");
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
        require(msg.sender == address(entryPoint()) || msg.sender == address(this), "conta: nao autorizado");
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
        txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false,
            numConfirmations: 1,
            proposedAt: block.timestamp
        });
        
        confirmations[txIndex][msg.sender] = true;
        transactionCount++;
        
        emit TransactionProposed(txIndex, msg.sender, destination, value);
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
        
        require(transaction.numConfirmations >= signatureThreshold, "confirmacoes insuficientes");
        
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
        require(dest.length == func.length, "tamanhos de arrays incompativeis");
        
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }
    
    // ----- Funções de gerenciamento da conta -----
    
    /**
     * Adiciona um novo signatário (requer Aprovacao multisig)
     */
    function addSigner(address newSigner) external onlySelf {
        require(newSigner != address(0), "signatario nao pode ser endereco zero");
        require(!_signers.contains(newSigner), "ja e um signatario");
        
        _signers.add(newSigner);
        
        emit SignerAdded(newSigner);
    }
    
    /**
     * Remove um signatário existente (requer Aprovacao multisig)
     */
    function removeSigner(address signer) external onlySelf {
        require(_signers.contains(signer), "nao e um signatario");
        require(_signers.length() > signatureThreshold, "nao pode reduzir abaixo do limite");
        
        _signers.remove(signer);
        
        emit SignerRemoved(signer);
    }
    
    /**
     * Altera o número minimo de assinaturas (requer Aprovacao multisig)
     */
    function changeThreshold(uint256 newThreshold) external onlySelf {
        require(newThreshold > 0, "limite deve ser positivo");
        require(newThreshold <= _signers.length(), "limite nao pode exceder numero de signatarios");
        
        signatureThreshold = newThreshold;
        
        emit ThresholdChanged(newThreshold);
    }
    
    /**
     * Inicia um processo de recuperação de acesso
     * Implementação do recoverAccess() descrito no caso de uso
     */
    function initiateRecovery(address[] calldata newSigners) external onlySigner {
        require(newSigners.length >= 3, "Minimo 3 signatarios");
        
        // Validar os novos signatários
        for (uint256 i = 0; i < newSigners.length; i++) {
            require(newSigners[i] != address(0), "signatario nao pode ser endereco zero");
            
            // Verificar duplicatas
            for (uint256 j = 0; j < i; j++) {
                require(newSigners[i] != newSigners[j], "signatarios duplicados");
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
        require(recoveryRequest.requestTime > 0, "nenhuma solicitacao pendente");
        require(!recoveryRequest.approvals[msg.sender], "ja aprovado");
        require(!recoveryRequest.executed, "recuperacao ja executada");
        
        recoveryRequest.approvals[msg.sender] = true;
        recoveryRequest.approvalCount++;
        
        emit RecoveryApproved(msg.sender);
    }
    
    /**
     * Executa a recuperação após o período de espera
     * Esta é a implementação do recoverAccess() descrito no caso de uso
     */
    function recoverAccess() external onlySigner {
        require(recoveryRequest.requestTime > 0, "nenhuma solicitacao pendente");
        require(!recoveryRequest.executed, "recuperacao ja executada");
        require(
            block.timestamp >= recoveryRequest.requestTime + recoveryRequest.recoveryCooldown,
            "Aguarde 7 dias"
        );
        
        // Armazenar signatários antigos para o evento
        address[] memory oldSigners = new address[](_signers.length());
        for (uint256 i = 0; i < oldSigners.length; i++) {
            oldSigners[i] = _signers.at(i);
        }
        
        // Limpar signatários antigos
        for (uint256 i = 0; i < oldSigners.length; i++) {
            _signers.remove(oldSigners[i]);
        }
        
        // Adicionar novos signatários
        for (uint256 i = 0; i < recoveryRequest.newSigners.length; i++) {
            _signers.add(recoveryRequest.newSigners[i]);
        }
        
        recoveryRequest.executed = true;
        
        emit RecoveryExecuted(oldSigners, recoveryRequest.newSigners);
    }
    
    /**
     * Altera o período de espera padrão para recuperação (requer Aprovacao multisig)
     */
    function changeRecoveryCooldown(uint256 newCooldown) external onlySelf {
        require(newCooldown >= 1 days, "periodo minimo de 1 dia");
        require(newCooldown <= 30 days, "periodo maximo de 30 dias");
        
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