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
 * Conta ERC-4337 com recursos de pagamentos recorrentes e assinaturas.
 * Permite automatizar transações periódicas sem intervenção manual.
 */
contract RecurringPaymentAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using EnumerableSet for EnumerableSet.UintSet;

    // Proprietário da conta
    address public owner;
    IEntryPoint private immutable _entryPoint;
    
    // Estrutura para assinatura de pagamento recorrente
    struct Subscription {
        address payee;           // Destinatário do pagamento
        uint256 amount;          // Valor a ser pago em cada ciclo
        uint256 periodSeconds;   // Intervalo entre pagamentos em segundos
        uint256 startTime;       // Quando a assinatura começa
        uint256 endTime;         // Quando a assinatura termina (0 = sem fim)
        uint256 lastExecuted;    // Última vez que foi executada
        bytes data;              // Dados adicionais da transação (ex: calldata)
        bool active;             // Se a assinatura está ativa
    }
    
    // Mapeamento de assinaturas por ID
    mapping(uint256 => Subscription) public subscriptions;
    uint256 public subscriptionCount;
    
    // Controle de quais assinaturas estão ativas
    EnumerableSet.UintSet private _activeSubscriptions;
    
    // Eventos
    event AccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed payee, uint256 amount, uint256 periodSeconds);
    event SubscriptionExecuted(uint256 indexed subscriptionId, address indexed payee, uint256 amount, uint256 executedAt);
    event SubscriptionCancelled(uint256 indexed subscriptionId);
    event SubscriptionModified(uint256 indexed subscriptionId);
    
    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "not owner");
        _;
    }
    
    modifier subscriptionExists(uint256 subscriptionId) {
        require(subscriptionId < subscriptionCount, "subscription does not exist");
        _;
    }
    
    modifier activeSubscription(uint256 subscriptionId) {
        require(subscriptions[subscriptionId].active, "subscription not active");
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
     * Inicializa a conta para um proprietário
     */
    function initialize(address anOwner) public virtual initializer {
        owner = anOwner;
        emit AccountInitialized(_entryPoint, anOwner);
    }

    /**
     * Valida a assinatura da operação do usuário
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    /**
     * Verifica se a chamada vem do entryPoint ou do proprietário
     */
    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "account: not authorized");
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
    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {
        (newImplementation);
    }

    /**
     * Executa uma transação (chamada por entryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * Executa um lote de transações
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }
    
    // ----- Funções de Assinaturas Recorrentes -----
    
    /**
     * Cria uma nova assinatura de pagamento recorrente
     * @param payee Destinatário do pagamento
     * @param amount Valor a ser pago em cada ciclo
     * @param periodSeconds Intervalo entre pagamentos em segundos
     * @param startTime Quando a assinatura começa (0 = imediatamente)
     * @param endTime Quando a assinatura termina (0 = sem fim)
     * @param data Dados adicionais da transação
     * @return subscriptionId ID da assinatura criada
     */
    function createSubscription(
        address payee,
        uint256 amount,
        uint256 periodSeconds,
        uint256 startTime,
        uint256 endTime,
        bytes calldata data
    ) external onlyOwner returns (uint256 subscriptionId) {
        require(payee != address(0), "invalid payee");
        require(amount > 0, "invalid amount");
        require(periodSeconds > 0, "invalid period");
        
        // Se startTime for 0, começar agora
        if (startTime == 0) {
            startTime = block.timestamp;
        } else {
            require(startTime >= block.timestamp, "start time in the past");
        }
        
        // Se endTime for diferente de 0, deve ser no futuro e depois do startTime
        if (endTime != 0) {
            require(endTime > startTime, "end time before start time");
        }
        
        subscriptionId = subscriptionCount;
        
        subscriptions[subscriptionId] = Subscription({
            payee: payee,
            amount: amount,
            periodSeconds: periodSeconds,
            startTime: startTime,
            endTime: endTime,
            lastExecuted: 0, // Nunca executada
            data: data,
            active: true
        });
        
        subscriptionCount++;
        _activeSubscriptions.add(subscriptionId);
        
        emit SubscriptionCreated(subscriptionId, payee, amount, periodSeconds);
        
        return subscriptionId;
    }
    
    /**
     * Cancela uma assinatura existente
     */
    function cancelSubscription(uint256 subscriptionId) 
        external 
        onlyOwner 
        subscriptionExists(subscriptionId)
        activeSubscription(subscriptionId)
    {
        subscriptions[subscriptionId].active = false;
        _activeSubscriptions.remove(subscriptionId);
        
        emit SubscriptionCancelled(subscriptionId);
    }
    
    /**
     * Modifica uma assinatura existente
     */
    function modifySubscription(
        uint256 subscriptionId,
        uint256 newAmount,
        uint256 newPeriodSeconds,
        uint256 newEndTime
    ) 
        external 
        onlyOwner 
        subscriptionExists(subscriptionId)
        activeSubscription(subscriptionId)
    {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (newAmount > 0) {
            sub.amount = newAmount;
        }
        
        if (newPeriodSeconds > 0) {
            sub.periodSeconds = newPeriodSeconds;
        }
        
        if (newEndTime > 0) {
            require(newEndTime > block.timestamp, "end time in the past");
            sub.endTime = newEndTime;
        }
        
        emit SubscriptionModified(subscriptionId);
    }
    
    /**
     * Executa uma assinatura específica, se estiver pronta para ser executada
     * @param subscriptionId ID da assinatura a ser executada
     * @return executed Se a assinatura foi executada
     */
    function executeSubscription(uint256 subscriptionId) 
        public 
        subscriptionExists(subscriptionId)
        activeSubscription(subscriptionId)
        returns (bool executed)
    {
        Subscription storage sub = subscriptions[subscriptionId];
        
        // Verifica se já está no período de início
        if (block.timestamp < sub.startTime) {
            return false;
        }
        
        // Verifica se não ultrapassou o período de término (se houver)
        if (sub.endTime != 0 && block.timestamp > sub.endTime) {
            // Desativa automaticamente assinaturas expiradas
            sub.active = false;
            _activeSubscriptions.remove(subscriptionId);
            emit SubscriptionCancelled(subscriptionId);
            return false;
        }
        
        // Verifica se já passou tempo suficiente desde a última execução
        uint256 nextExecutionTime = sub.lastExecuted == 0 
            ? sub.startTime 
            : sub.lastExecuted + sub.periodSeconds;
            
        if (block.timestamp < nextExecutionTime) {
            return false;
        }
        
        // Executa o pagamento
        sub.lastExecuted = block.timestamp;
        
        // Executa a transação
        _call(sub.payee, sub.amount, sub.data);
        
        emit SubscriptionExecuted(subscriptionId, sub.payee, sub.amount, block.timestamp);
        
        return true;
    }
    
    /**
     * Executa todas as assinaturas que estão prontas para serem processadas
     * @return executedCount Número de assinaturas executadas
     */
    function executeAllDueSubscriptions() external returns (uint256 executedCount) {
        uint256 count = 0;
        
        // Itera por todas as assinaturas ativas
        uint256[] memory activeIds = getActiveSubscriptions();
        
        for (uint256 i = 0; i < activeIds.length; i++) {
            uint256 subId = activeIds[i];
            
            // Tenta executar cada assinatura
            if (executeSubscription(subId)) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Lista todas as assinaturas ativas
     */
    function getActiveSubscriptions() public view returns (uint256[] memory) {
        uint256 count = _activeSubscriptions.length();
        uint256[] memory activeIds = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            activeIds[i] = _activeSubscriptions.at(i);
        }
        
        return activeIds;
    }
    
    /**
     * Retorna detalhes de uma assinatura
     */
    function getSubscriptionDetails(uint256 subscriptionId) 
        external 
        view 
        subscriptionExists(subscriptionId)
        returns (
            address payee,
            uint256 amount,
            uint256 periodSeconds,
            uint256 startTime,
            uint256 endTime,
            uint256 lastExecuted,
            bytes memory data,
            bool active,
            uint256 nextExecutionTime
        ) 
    {
        Subscription storage sub = subscriptions[subscriptionId];
        
        uint256 next = sub.lastExecuted == 0 
            ? sub.startTime 
            : sub.lastExecuted + sub.periodSeconds;
            
        if (sub.endTime != 0 && next > sub.endTime) {
            next = 0; // Não haverá mais execuções
        }
        
        return (
            sub.payee,
            sub.amount,
            sub.periodSeconds,
            sub.startTime,
            sub.endTime,
            sub.lastExecuted,
            sub.data,
            sub.active,
            next
        );
    }
    
    /**
     * Verifica quando ocorrerá o próximo pagamento de uma assinatura
     */
    function getNextExecutionTime(uint256 subscriptionId) 
        external 
        view 
        subscriptionExists(subscriptionId)
        returns (uint256)
    {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (!sub.active) {
            return 0; // Assinatura inativa
        }
        
        // Se nunca foi executada, o próximo é o tempo inicial
        if (sub.lastExecuted == 0) {
            return sub.startTime > block.timestamp ? sub.startTime : block.timestamp;
        }
        
        // Calcula o próximo tempo de execução
        uint256 next = sub.lastExecuted + sub.periodSeconds;
        
        // Verifica se já passou do tempo de término
        if (sub.endTime != 0 && next > sub.endTime) {
            return 0; // Não haverá mais execuções
        }
        
        return next;
    }
    
    /**
     * Retorna todas as assinaturas que precisam ser executadas neste momento
     */
    function getDueSubscriptions() external view returns (uint256[] memory) {
        uint256[] memory activeIds = getActiveSubscriptions();
        bool[] memory isDue = new bool[](activeIds.length);
        uint256 dueCount = 0;
        
        // Primeiro, identifica quais assinaturas estão devidas
        for (uint256 i = 0; i < activeIds.length; i++) {
            uint256 subId = activeIds[i];
            Subscription storage sub = subscriptions[subId];
            
            // Verifica se já está no período de início e não ultrapassou o fim
            if (block.timestamp < sub.startTime) {
                continue;
            }
            
            if (sub.endTime != 0 && block.timestamp > sub.endTime) {
                continue;
            }
            
            // Verifica se já passou tempo suficiente desde a última execução
            uint256 nextExecutionTime = sub.lastExecuted == 0 
                ? sub.startTime 
                : sub.lastExecuted + sub.periodSeconds;
                
            if (block.timestamp >= nextExecutionTime) {
                isDue[i] = true;
                dueCount++;
            }
        }
        
        // Agora cria o array de resultado
        uint256[] memory dueIds = new uint256[](dueCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeIds.length; i++) {
            if (isDue[i]) {
                dueIds[index] = activeIds[i];
                index++;
            }
        }
        
        return dueIds;
    }
} 