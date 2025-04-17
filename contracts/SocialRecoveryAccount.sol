// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

/**
 * Conta ERC-4337 com recursos de recuperação social.
 * Permitindo redefinir chaves perdidas usando guardians confiáveis.
 */
contract SocialRecoveryAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;
    
    // Estrutura de dados para guardiões (contatos confiáveis)
    mapping(address => bool) public guardians;
    uint256 public guardiansCount;
    uint256 public recoveryThreshold; // Número minimo de guardiões para recuperação
    
    // Estrutura para solicitação de recuperação
    struct RecoveryRequest {
        address newOwner;
        uint256 approvalCount;
        uint256 timestamp;
        mapping(address => bool) approvals;
        bool executed;
    }
    
    RecoveryRequest public recoveryRequest;
    uint256 public recoveryDelay = 1 days; // Período de espera para segurança

    // Eventos
    event SimpleAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryRequestCreated(address indexed requestedBy, address indexed newOwner);
    event RecoveryApproved(address indexed approvedBy, address indexed newOwner);
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event RecoveryThresholdChanged(uint256 newThreshold);
    event RecoveryDelayChanged(uint256 newDelay);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "not owner");
        _;
    }
    
    modifier onlyGuardian() {
        require(guardians[msg.sender], "not a guardian");
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
     * Inicializa a conta para um proprietario
     */
    function initialize(address anOwner) public virtual initializer {
        owner = anOwner;
        recoveryThreshold = 1; // Valor padrão
        emit SimpleAccountInitialized(_entryPoint, anOwner);
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
     * Verifica se a chamada vem do entryPoint ou do proprietario
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
        require(dest.length == func.length, unicode"tamanhos de arrays incompativeis");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    // ----- Funções de Recuperação Social -----

    /**
     * Adiciona um guardião (apenas o proprietario)
     */
    function addGuardian(address guardian) external onlyOwner {
        require(guardian != address(0), unicode"endereço zero nao permitido");
        require(!guardians[guardian], unicode"já é um guardião");
        
        guardians[guardian] = true;
        guardiansCount++;
        
        emit GuardianAdded(guardian);
    }
    
    /**
     * Remove um guardião (apenas o proprietario)
     */
    function removeGuardian(address guardian) external onlyOwner {
        require(guardians[guardian], unicode"nao é um guardião");
        require(guardiansCount > recoveryThreshold, unicode"nao pode reduzir abaixo do limite");
        
        guardians[guardian] = false;
        guardiansCount--;
        
        emit GuardianRemoved(guardian);
    }
    
    /**
     * Configura o limite minimo de guardiões para recuperação
     */
    function setRecoveryThreshold(uint256 threshold) external onlyOwner {
        require(threshold > 0 && threshold <= guardiansCount, unicode"limite inválido");
        recoveryThreshold = threshold;
        
        emit RecoveryThresholdChanged(threshold);
    }
    
    /**
     * Configura o período de espera para recuperação
     */
    function setRecoveryDelay(uint256 delay) external onlyOwner {
        require(delay <= 30 days, unicode"atraso máximo de 30 dias");
        recoveryDelay = delay;
        
        emit RecoveryDelayChanged(delay);
    }
    
    /**
     * Inicia uma solicitação de recuperação (apenas guardiões)
     */
    function initiateRecovery(address newOwner) external onlyGuardian {
        require(newOwner != address(0), unicode"novo dono nao pode ser endereço zero");
        
        // Reinicia solicitação anterior se houver
        delete recoveryRequest.approvals[msg.sender];
        
        // Cria nova solicitação
        recoveryRequest.newOwner = newOwner;
        recoveryRequest.timestamp = block.timestamp;
        recoveryRequest.approvalCount = 1;
        recoveryRequest.approvals[msg.sender] = true;
        recoveryRequest.executed = false;
        
        emit RecoveryRequestCreated(msg.sender, newOwner);
    }
    
    /**
     * Aprova uma solicitação de recuperação existente (apenas guardiões)
     */
    function approveRecovery() external onlyGuardian {
        require(recoveryRequest.timestamp > 0, unicode"nenhuma solicitação pendente");
        require(!recoveryRequest.approvals[msg.sender], unicode"já aprovado");
        require(!recoveryRequest.executed, unicode"recuperação já executada");
        
        recoveryRequest.approvals[msg.sender] = true;
        recoveryRequest.approvalCount++;
        
        emit RecoveryApproved(msg.sender, recoveryRequest.newOwner);
    }
    
    /**
     * Executa a recuperação após período de espera (qualquer guardião)
     */
    function executeRecovery() external onlyGuardian {
        require(recoveryRequest.timestamp > 0, unicode"nenhuma solicitação pendente");
        require(!recoveryRequest.executed, unicode"recuperação já executada");
        require(recoveryRequest.approvalCount >= recoveryThreshold, unicode"aprovações insuficientes");
        require(block.timestamp >= recoveryRequest.timestamp + recoveryDelay, unicode"período de espera nao concluído");
        
        address oldOwner = owner;
        address newOwner = recoveryRequest.newOwner;
        
        owner = newOwner;
        recoveryRequest.executed = true;
        
        emit RecoveryExecuted(oldOwner, newOwner);
    }
    
    /**
     * Cancela uma solicitação de recuperação (apenas proprietario)
     */
    function cancelRecovery() external onlyOwner {
        require(recoveryRequest.timestamp > 0, unicode"nenhuma solicitação pendente");
        require(!recoveryRequest.executed, unicode"recuperação já executada");
        
        delete recoveryRequest;
    }
    
    /**
     * Retorna o status atual de uma solicitação de recuperação
     */
    function getRecoveryStatus() external view returns (
        address newOwner,
        uint256 approvalCount,
        uint256 timestamp,
        bool canExecute
    ) {
        newOwner = recoveryRequest.newOwner;
        approvalCount = recoveryRequest.approvalCount;
        timestamp = recoveryRequest.timestamp;
        canExecute = (
            recoveryRequest.timestamp > 0 &&
            !recoveryRequest.executed &&
            recoveryRequest.approvalCount >= recoveryThreshold &&
            block.timestamp >= recoveryRequest.timestamp + recoveryDelay
        );
    }
    
    /**
     * Verifica se um endereço aprovou uma recuperação
     */
    function hasApproved(address guardian) external view returns (bool) {
        return recoveryRequest.approvals[guardian];
    }
} 