// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./RecurringPaymentAccount.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * Factory para criar contas com pagamentos recorrentes e assinaturas
 */
contract RecurringPaymentAccountFactory {
    RecurringPaymentAccount public immutable accountImplementation;

    constructor(IEntryPoint entryPoint) {
        accountImplementation = new RecurringPaymentAccount(entryPoint);
    }

    /**
     * Cria uma conta RecurringPayment, inicializando-a com o proprietário e salt
     */
    function createAccount(address owner, uint256 salt) public returns (RecurringPaymentAccount ret) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return RecurringPaymentAccount(payable(addr));
        }
        ret = RecurringPaymentAccount(payable(new ERC1967Proxy{salt: bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(RecurringPaymentAccount.initialize, (owner))
            )));
    }

    /**
     * Calcula o endereço de uma conta que seria criada por createAccount()
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(RecurringPaymentAccount.initialize, (owner))
                )
            ))
        );
    }
} 