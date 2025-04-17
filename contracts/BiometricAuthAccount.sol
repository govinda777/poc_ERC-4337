// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * Conta ERC-4337 com recursos de Autenticacao biométrica para pagamentos diarios.
 * Permite transações abaixo de um limite sem confirmação manual adicional.
 */
contract BiometricAuthAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    // proprietario da conta
    address public owner;
    
    // Dispositivos autorizados para Autenticacao biométrica
    struct BiometricDevice {
        bytes32 deviceId;       // ID único do dispositivo (hash)
        string deviceName;      // Nome amigável do dispositivo
        uint256 registeredAt;   // Timestamp de registro
        bool active;            // Status do dispositivo
    }
    
    // Mapeamento de dispositivos autorizados
    mapping(bytes32 => BiometricDevice) public devices;
    bytes32[] public deviceIds;
    
    // Limites diarios por dispositivo
    mapping(bytes32 => uint256) public dailyLimit;
    
    // Controle de utilização diária por dispositivo
    struct DailyUsage {
        uint256 used;          // Valor utilizado hoje
        uint256 lastResetTime; // Timestamp do último reset
    }
    
    mapping(bytes32 => DailyUsage) public dailyUsage;
    
    // Estratégia de verificação biométrica (ECDSA)
    bytes32 public biometricVerificationHash;
    
    // EntryPoint para compatibilidade ERC-4337
    IEntryPoint private immutable _entryPoint;
    
    // Eventos
    event BiometricAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
    event DeviceRegistered(bytes32 indexed deviceId, string deviceName);
    event DeviceRemoved(bytes32 indexed deviceId);
    event DailyLimitChanged(bytes32 indexed deviceId, uint256 newLimit);
    event BiometricTransactionExecuted(bytes32 indexed deviceId, address indexed destination, uint256 amount);
    event ManualTransactionExecuted(address indexed destination, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "not owner");
        _;
    }
    
    modifier deviceActive(bytes32 deviceId) {
        require(devices[deviceId].active, "device inactive or not registered");
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
     * Inicializa a conta com o proprietario
     */
    function initialize(address anOwner) public virtual initializer {
        owner = anOwner;
        emit BiometricAccountInitialized(_entryPoint, anOwner);
    }

    /**
     * Valida a assinatura da operação do usuário.
     * Aceita assinatura do proprietario ou verificação biométrica para transações abaixo do limite.
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        
        // Estrutura da assinatura para transações biométricas:
        // Primeiros 32 bytes: deviceId
        // Restante: assinatura padrão ECDSA
        
        if (userOp.signature.length > 65) {
            // Formato de assinatura biométrica
            bytes32 deviceId;
            bytes memory signature;
            bytes memory sig = userOp.signature;
            
            // Extrair deviceId e assinatura
            assembly {
                deviceId := mload(add(sig, 32))
                signature := add(sig, 32)
            }
            
            // Verificar se o dispositivo esta ativo
            if (!devices[deviceId].active) {
                return SIG_VALIDATION_FAILED;
            }
            
            // Verificar se a assinatura é válida (biometria simulada via ECDSA)
            bytes memory actualSignature = new bytes(userOp.signature.length - 32);
            for (uint i = 0; i < actualSignature.length; i++) {
                actualSignature[i] = userOp.signature[i + 32];
            }
            
            address recovered = hash.recover(actualSignature);
            if (recovered != owner) {
                return SIG_VALIDATION_FAILED;
            }
            
            return 0;
        } else {
            // Assinatura padrão do proprietario
            if (owner != hash.recover(userOp.signature)) {
                return SIG_VALIDATION_FAILED;
            }
            return 0;
        }
    }

    /**
     * Executa chamada de baixo nível
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
     * Registra um novo dispositivo para Autenticacao biométrica
     */
    function registerDevice(bytes32 deviceId, string calldata deviceName, uint256 initialDailyLimit) 
        external 
        onlyOwner 
    {
        require(devices[deviceId].deviceId == bytes32(0), "device already registered");
        require(initialDailyLimit > 0, "limite diario deve ser positivo");
        
        devices[deviceId] = BiometricDevice({
            deviceId: deviceId,
            deviceName: deviceName,
            registeredAt: block.timestamp,
            active: true
        });
        
        deviceIds.push(deviceId);
        dailyLimit[deviceId] = initialDailyLimit;
        
        // Inicializa uso diario
        dailyUsage[deviceId] = DailyUsage({
            used: 0,
            lastResetTime: block.timestamp
        });
        
        emit DeviceRegistered(deviceId, deviceName);
    }
    
    /**
     * Remove um dispositivo
     */
    function removeDevice(bytes32 deviceId) 
        external 
        onlyOwner 
        deviceActive(deviceId) 
    {
        devices[deviceId].active = false;
        
        emit DeviceRemoved(deviceId);
    }
    
    /**
     * Define o limite diario para um dispositivo
     */
    function setDailyLimit(bytes32 deviceId, uint256 newLimit) 
        external 
        onlyOwner 
        deviceActive(deviceId) 
    {
        require(newLimit > 0, "limite diario deve ser positivo");
        dailyLimit[deviceId] = newLimit;
        
        emit DailyLimitChanged(deviceId, newLimit);
    }
    
    /**
     * Executa transação com verificação biométrica e limite diario
     * @param deviceId ID do dispositivo utilizado
     * @param dest Endereço de destino
     * @param value Valor da transação
     * @param func Dados da transação
     * @param biometricSignature Assinatura biométrica (verificada off-chain)
     */
    function executeBiometric(
        bytes32 deviceId,
        address dest,
        uint256 value,
        bytes calldata func,
        bytes calldata biometricSignature
    ) 
        external 
        deviceActive(deviceId) 
    {
        require(msg.sender == owner || msg.sender == address(entryPoint()), "nao autorizado");
        
        // Resetar contagem diária se necessário
        if (block.timestamp > dailyUsage[deviceId].lastResetTime + 1 days) {
            dailyUsage[deviceId].used = 0;
            dailyUsage[deviceId].lastResetTime = block.timestamp;
        }
        
        // Verificar se esta dentro do limite diario
        require(dailyUsage[deviceId].used + value <= dailyLimit[deviceId], "Excede limite diario");
        
        // Verificar assinatura biométrica (simplificado para exemplo)
        // Em produção, isso seria uma verificação complexa incluindo challenge-response
        require(_verifyBiometricSignature(deviceId, biometricSignature), "Autenticacao falhou");
        
        // Atualizar uso diario
        dailyUsage[deviceId].used += value;
        
        // Executar a transação
        _call(dest, value, func);
        
        emit BiometricTransactionExecuted(deviceId, dest, value);
    }
    
    /**
     * Modifier que verifica limites diarios e Autenticacao biométrica
     */
    modifier biometricCheck(bytes32 deviceId, uint256 amount, bytes calldata biometricSignature) {
        // Resetar contagem diária se necessário
        if (block.timestamp > dailyUsage[deviceId].lastResetTime + 1 days) {
            dailyUsage[deviceId].used = 0;
            dailyUsage[deviceId].lastResetTime = block.timestamp;
        }
        
        require(amount <= dailyLimit[deviceId], "Excede limite");
        require(_verifyBiometricSignature(deviceId, biometricSignature), "Autenticacao falhou");
        _;
    }
    
    /**
     * Verifica assinatura biométrica (simulado para exemplo)
     * Na implementação real, isso usaria um oráculo de verificação biométrica
     * ou um sistema de desafio-resposta com o hardware seguro do dispositivo
     */
    function _verifyBiometricSignature(bytes32 deviceId, bytes calldata signature) 
        internal 
        view 
        returns (bool) 
    {
        // Para fins de teste, aceita qualquer assinatura que não seja vazia
        if (signature.length == 0) {
            return false;
        }
        
        // Em produção, isso seria uma verificação real de dados biométricos
        return true;
    }
    
    /**
     * Executa uma transação padrão (sem verificação biométrica)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        require(msg.sender == owner || msg.sender == address(entryPoint()), "nao autorizado");
        _call(dest, value, func);
        
        emit ManualTransactionExecuted(dest, value);
    }
    
    /**
     * Executa um lote de transações
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        require(msg.sender == owner || msg.sender == address(entryPoint()), "nao autorizado");
        require(dest.length == func.length, "tamanhos de arrays incompativeis");
        
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }
    
    /**
     * Retorna uma lista de todos os dispositivos registrados
     */
    function getDevices() external view returns (BiometricDevice[] memory) {
        BiometricDevice[] memory result = new BiometricDevice[](deviceIds.length);
        
        for (uint256 i = 0; i < deviceIds.length; i++) {
            result[i] = devices[deviceIds[i]];
        }
        
        return result;
    }
    
    /**
     * Retorna uso diario atual e limite para um dispositivo
     */
    function getDailyUsage(bytes32 deviceId) 
        external 
        view 
        deviceActive(deviceId)
        returns (uint256 used, uint256 limit, uint256 remaining) 
    {
        // Calcular uso considerando possível reset diario
        uint256 currentUsed = dailyUsage[deviceId].used;
        if (block.timestamp > dailyUsage[deviceId].lastResetTime + 1 days) {
            currentUsed = 0;
        }
        
        return (
            currentUsed,
            dailyLimit[deviceId],
            dailyLimit[deviceId] > currentUsed ? dailyLimit[deviceId] - currentUsed : 0
        );
    }
} 