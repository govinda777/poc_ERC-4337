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
 * Conta ERC-4337 com recursos de multisignature e controles personalizados.
 * Implementa requisitos de múltiplas assinaturas e limites de transações.
 */
contract MultiSigAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Propriedades de gerenciamento de assinaturas
    EnumerableSet.AddressSet private _owners;
    uint256 public signatureThreshold;  // Número minimo de assinaturas necessárias
    
    // Estrutura para limites de transações
    struct TransactionLimit {
        uint256 dailyLimit;      // Limite de valor diario
        uint256 txLimit;         // Limite por transação
        uint256 dailyUsed;       // Valor usado hoje
        uint256 lastResetTime;   // Quando o limite diario foi redefinido
    }
    
    TransactionLimit public transactionLimit;
    
    // Estrutura para proposta de transação
    struct Transaction {
        address destination;     // Endereço de destino
        uint256 value;           // Valor em ETH
        bytes data;              // Dados da chamada
        bool executed;           // Se já foi executada
        uint256 numConfirmations;// Número de confirmações
        uint256 proposedAt;      // Quando foi proposta
        uint256 expiresAt;       // Quando expira
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    uint256 public transactionCount;
    uint256 public transactionExpiration = 2 days; // Padrão: transações expiram em 2 dias
    
    IEntryPoint private immutable _entryPoint;
    
    // Eventos
    event MultiSigAccountInitialized(IEntryPoint indexed entryPoint, address[] initialOwners, uint256 threshold);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 threshold);
    event DailyLimitChanged(uint256 dailyLimit);
    event TransactionLimitChanged(uint256 txLimit);
    event TransactionProposed(uint256 indexed txIndex, address indexed proposer, address indexed destination, uint256 value);
    event TransactionConfirmed(uint256 indexed txIndex, address indexed confirmer);
    event TransactionExecuted(uint256 indexed txIndex, address indexed executor);
    event TransactionCancelled(uint256 indexed txIndex);
    event TransactionExpired(uint256 indexed txIndex);
    
    // Modificadores
    modifier onlyOwner() {
        require(_owners.contains(msg.sender), "not an owner");
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
    
    modifier notExpired(uint256 txIndex) {
        require(block.timestamp <= transactions[txIndex].expiresAt, "tx expirada");
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
     * Inicializa a conta multi-assinatura
     * @param initialOwners Lista inicial de donos
     * @param initialThreshold Número minimo de assinaturas necessárias
     * @param initialDailyLimit Limite diario de transações (em wei)
     * @param initialTxLimit Limite por transação (em wei)
     */
    function initialize(
        address[] memory initialOwners,
        uint256 initialThreshold,
        uint256 initialDailyLimit,
        uint256 initialTxLimit
    ) public virtual initializer {
        require(initialOwners.length > 0, "pelo menos um dono");
        require(initialThreshold > 0 && initialThreshold <= initialOwners.length, "limite invalido");
        
        for (uint256 i = 0; i < initialOwners.length; i++) {
            address owner = initialOwners[i];
            require(owner != address(0), "dono nao pode ser endereco zero");
            require(!_owners.contains(owner), "donos nao podem ser duplicados");
            _owners.add(owner);
        }
        
        signatureThreshold = initialThreshold;
        
        // Configurar limites de transação
        transactionLimit.dailyLimit = initialDailyLimit;
        transactionLimit.txLimit = initialTxLimit;
        transactionLimit.dailyUsed = 0;
        transactionLimit.lastResetTime = block.timestamp;
        
        emit MultiSigAccountInitialized(_entryPoint, initialOwners, initialThreshold);
    }

    /**
     * Valida a assinatura da operação do usuário.
     * No modo multisig, aceita a assinatura de qualquer proprietario.
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        
        address recovered = hash.recover(userOp.signature);
        if (_owners.contains(recovered)) {
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
        onlyOwner 
        returns (uint256 txIndex) 
    {
        require(destination != address(0), "destino nao pode ser endereco zero");
        
        // Validar limites de transação, se nao forem zero
        if (transactionLimit.txLimit > 0) {
            require(value <= transactionLimit.txLimit, "excede o limite por transacao");
        }
        
        txIndex = transactionCount;
        
        transactions[txIndex] = Transaction({
            destination: destination,
            value: value,
            data: data,
            executed: false,
            numConfirmations: 1, // Auto-confirmação
            proposedAt: block.timestamp,
            expiresAt: block.timestamp + transactionExpiration
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
        onlyOwner 
        txExists(txIndex) 
        notExecuted(txIndex)
        notConfirmed(txIndex)
        notExpired(txIndex)
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
        onlyOwner 
        txExists(txIndex) 
        notExecuted(txIndex) 
        notExpired(txIndex)
    {
        Transaction storage transaction = transactions[txIndex];
        
        require(transaction.numConfirmations >= signatureThreshold, "confirmacoes insuficientes");
        
        // Verificar limites diarios
        if (transactionLimit.dailyLimit > 0) {
            // Resetar o contador diario, se necessário
            if (block.timestamp > transactionLimit.lastResetTime + 1 days) {
                transactionLimit.dailyUsed = 0;
                transactionLimit.lastResetTime = block.timestamp;
            }
            
            // Verificar se excede o limite diario
            require(transactionLimit.dailyUsed + transaction.value <= transactionLimit.dailyLimit, 
                    "excede limite diario");
            
            // Atualizar valor usado
            transactionLimit.dailyUsed += transaction.value;
        }
        
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
     * Adiciona um novo dono (requer Aprovacao multisig)
     */
    function addOwner(address newOwner) external onlySelf {
        require(newOwner != address(0), "dono nao pode ser endereco zero");
        require(!_owners.contains(newOwner), "ja e um dono");
        
        _owners.add(newOwner);
        
        emit OwnerAdded(newOwner);
    }
    
    /**
     * Remove um dono existente (requer Aprovacao multisig)
     */
    function removeOwner(address owner) external onlySelf {
        require(_owners.contains(owner), "nao e um dono");
        require(_owners.length() > signatureThreshold, "nao pode reduzir abaixo do limite");
        
        _owners.remove(owner);
        
        emit OwnerRemoved(owner);
    }
    
    /**
     * Altera o número minimo de assinaturas (requer Aprovacao multisig)
     */
    function changeThreshold(uint256 newThreshold) external onlySelf {
        require(newThreshold > 0, "limite deve ser positivo");
        require(newThreshold <= _owners.length(), "limite nao pode exceder numero de donos");
        
        signatureThreshold = newThreshold;
        
        emit ThresholdChanged(newThreshold);
    }
    
    /**
     * Altera o limite diario (requer Aprovacao multisig)
     */
    function changeDailyLimit(uint256 newLimit) external onlySelf {
        transactionLimit.dailyLimit = newLimit;
        
        emit DailyLimitChanged(newLimit);
    }
    
    /**
     * Altera o limite por transação (requer Aprovacao multisig)
     */
    function changeTransactionLimit(uint256 newLimit) external onlySelf {
        transactionLimit.txLimit = newLimit;
        
        emit TransactionLimitChanged(newLimit);
    }
    
    /**
     * Retorna a lista de donos atual
     */
    function getOwners() external view returns (address[] memory) {
        uint256 count = _owners.length();
        address[] memory ownersList = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            ownersList[i] = _owners.at(i);
        }
        
        return ownersList;
    }
    
    /**
     * Retorna o número de donos atual
     */
    function getOwnersCount() external view returns (uint256) {
        return _owners.length();
    }
    
    /**
     * Verifica se um endereço é dono
     */
    function isOwner(address account) external view returns (bool) {
        return _owners.contains(account);
    }
    
    /**
     * Retorna detalhes de uma transação
     */
    function getTransaction(uint256 txIndex) 
        external 
        view 
        txExists(txIndex) 
        returns (
            address destination,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint256 proposedAt,
            uint256 expiresAt
        ) 
    {
        Transaction storage transaction = transactions[txIndex];
        
        return (
            transaction.destination,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.proposedAt,
            transaction.expiresAt
        );
    }
} 