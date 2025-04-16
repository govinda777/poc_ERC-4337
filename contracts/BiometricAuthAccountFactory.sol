// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./BiometricAuthAccount.sol";

/**
 * Factory para criar contas BiometricAuthAccount
 */
contract BiometricAuthAccountFactory {
    BiometricAuthAccount public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new BiometricAuthAccount(_entryPoint);
    }

    /**
     * Cria uma conta com autenticação biométrica.
     * @param admin administrador da conta
     * @param devices lista de dispositivos autorizados iniciais
     * @param minDevices número mínimo de dispositivos necessários
     * @param salt valor de salt para geração do endereço
     * @return ret o endereço da conta criada
     */
    function createAccount(
        address admin,
        address[] calldata devices,
        uint minDevices,
        uint256 salt
    ) public returns (BiometricAuthAccount ret) {
        address addr = getAddress(admin, devices, minDevices, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return BiometricAuthAccount(payable(addr));
        }
        
        ret = BiometricAuthAccount(payable(
            new ERC1967Proxy{salt: bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(BiometricAuthAccount.initialize, (admin, devices, minDevices))
            )
        ));
    }

    /**
     * Calcula o endereço da conta que seria criada
     * @param admin administrador da conta
     * @param devices lista de dispositivos autorizados iniciais 
     * @param minDevices número mínimo de dispositivos necessários
     * @param salt valor de salt para geração do endereço
     * @return o endereço da conta
     */
    function getAddress(
        address admin,
        address[] calldata devices,
        uint minDevices,
        uint256 salt
    ) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(BiometricAuthAccount.initialize, (admin, devices, minDevices))
                )
            ))
        );
    }
} 