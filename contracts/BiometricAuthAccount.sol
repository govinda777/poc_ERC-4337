// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * BiometricAuthAccount - Uma conta ERC-4337 com autenticação biométrica
 * 
 * Esta conta permite autenticação via assinaturas de dispositivos biométricos
 * ao invés de usar frases de recuperação tradicionais.
 */
contract BiometricAuthAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    // Admin da conta (pode ser um serviço que gerencia biometrias)
    address public admin;
    
    // Dispositivos registrados para esta conta
    mapping(address => bool) public authorizedDevices;
    
    // Número total de dispositivos registrados
    uint public deviceCount;
    
    // Mínimo de dispositivos necessários para operações
    uint public minDevices;
    
    // EntryPoint do ERC-4337
    IEntryPoint private immutable _entryPoint;

    // Eventos
    event BiometricAuthAccountInitialized(IEntryPoint indexed entryPoint, address indexed admin);
    event DeviceAdded(address indexed device);
    event DeviceRemoved(address indexed device);
    event MinDevicesUpdated(uint minDevices);

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == address(this), "não é o admin");
        _;
    }

    modifier onlyAuthorizedDevice() {
        require(authorizedDevices[msg.sender] || msg.sender == address(this), "dispositivo não autorizado");
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * Inicializa a conta
     * @param anAdmin endereço do administrador inicial
     * @param initialDevices array de endereços de dispositivos iniciais
     * @param initialMinDevices número mínimo de dispositivos necessários
     */
    function initialize(address anAdmin, address[] calldata initialDevices, uint initialMinDevices) public initializer {
        admin = anAdmin;
        minDevices = initialMinDevices;
        
        // Registra os dispositivos iniciais
        for (uint i = 0; i < initialDevices.length; i++) {
            authorizedDevices[initialDevices[i]] = true;
            deviceCount++;
        }
        
        emit BiometricAuthAccountInitialized(_entryPoint, anAdmin);
    }
    
    /**
     * Adiciona um novo dispositivo autorizado
     * @param device endereço derivado da chave pública do dispositivo
     */
    function addDevice(address device) external onlyAdmin {
        require(!authorizedDevices[device], "dispositivo já autorizado");
        authorizedDevices[device] = true;
        deviceCount++;
        emit DeviceAdded(device);
    }
    
    /**
     * Remove um dispositivo autorizado
     * @param device endereço do dispositivo a ser removido
     */
    function removeDevice(address device) external onlyAdmin {
        require(authorizedDevices[device], "dispositivo não encontrado");
        require(deviceCount > minDevices, "mínimo de dispositivos necessário");
        authorizedDevices[device] = false;
        deviceCount--;
        emit DeviceRemoved(device);
    }
    
    /**
     * Atualiza o número mínimo de dispositivos necessários
     * @param newMinDevices novo número mínimo
     */
    function updateMinDevices(uint newMinDevices) external onlyAdmin {
        require(newMinDevices > 0, "mínimo deve ser maior que zero");
        require(newMinDevices <= deviceCount, "mínimo não pode ser maior que o total de dispositivos");
        minDevices = newMinDevices;
        emit MinDevicesUpdated(newMinDevices);
    }

    /**
     * Valida a assinatura de uma UserOperation
     * A assinatura deve ser de um dispositivo autorizado
     */
    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recoveredAddress = hash.recover(userOp.signature);
        
        if (!authorizedDevices[recoveredAddress])
            return SIG_VALIDATION_FAILED;
        return 0;
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
        require(dest.length == func.length, "tamanhos de arrays incompatíveis");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    /**
     * Implementação do método necessário para UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyAdmin();
    }

    /**
     * Método auxiliar para verificar o admin
     */
    function _onlyAdmin() internal view {
        require(msg.sender == admin || msg.sender == address(this), "não é o admin");
    }

    /**
     * Verifica se o chamador é o EntryPoint ou admin
     */
    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == admin, "acesso negado");
    }

    /**
     * Executa uma chamada para o destino
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
} 