// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./MultiSigAccount.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * Factory para criar contas multisig com controles personalizados
 */
contract MultiSigAccountFactory {
    MultiSigAccount public immutable accountImplementation;

    constructor(IEntryPoint entryPoint) {
        accountImplementation = new MultiSigAccount(entryPoint);
    }

    /**
     * Cria uma conta multisig, inicializando-a com múltiplos donos
     * @param owners Lista de endereços dos donos
     * @param threshold Número minimo de assinaturas necessárias
     * @param dailyLimit Limite diario de transações (em wei)
     * @param txLimit Limite por transação (em wei)
     * @param salt Valor para derivação do endereço
     */
    function createAccount(
        address[] memory owners,
        uint256 threshold,
        uint256 dailyLimit,
        uint256 txLimit,
        uint256 salt
    ) public returns (MultiSigAccount ret) {
        address addr = getAddress(owners, threshold, dailyLimit, txLimit, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return MultiSigAccount(payable(addr));
        }
        ret = MultiSigAccount(payable(new ERC1967Proxy{salt: bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(MultiSigAccount.initialize, (owners, threshold, dailyLimit, txLimit))
            )));
    }

    /**
     * Calcula o endereço de uma conta que seria criada por createAccount()
     */
    function getAddress(
        address[] memory owners,
        uint256 threshold,
        uint256 dailyLimit,
        uint256 txLimit,
        uint256 salt
    ) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(MultiSigAccount.initialize, (owners, threshold, dailyLimit, txLimit))
                )
            ))
        );
    }
} 