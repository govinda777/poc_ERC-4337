// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

// Mock simples do EntryPoint para testes
// Em produção, seria usado o EntryPoint oficial do ERC-4337

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/INonceManager.sol";
import "@account-abstraction/contracts/interfaces/UserOperation.sol";

contract EntryPoint is IEntryPoint {
    // Implementação mínima para o exemplo
    address private owner;
    
    // The UserOperationEvent is already defined in the IEntryPoint interface
    // so we don't need to redeclare it here

    constructor() {
        owner = msg.sender;
    }

    // Função para simular execução e emitir eventos sem tentar executar a operação real
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external override {
        for (uint256 i = 0; i < ops.length; i++) {
            // Extrair informações do UserOperation
            address sender = ops[i].sender;
            uint256 nonce = ops[i].nonce;
            bytes calldata paymasterAndData = ops[i].paymasterAndData;
            
            // Extrair o endereço do paymaster dos primeiros 20 bytes do paymasterAndData
            address paymaster = address(0);
            if (paymasterAndData.length >= 20) {
                paymaster = address(bytes20(paymasterAndData[:20]));
            }
            
            bytes32 userOpHash = keccak256(abi.encode(ops[i]));
            
            // Criar um hash baseado na operação
            uint256 gasUsed = ops[i].callGasLimit;
            uint256 gasCost = gasUsed * ops[i].maxFeePerGas;
            
            // Emitir evento para cada operação
            emit UserOperationEvent(
                userOpHash,
                sender,
                paymaster,
                nonce,
                true, // success
                gasCost, // actualGasCost
                gasUsed  // actualGasUsed
            );
        }
    }

    function handleAggregatedOps(
        UserOpsPerAggregator[] calldata opsPerAggregator,
        address payable beneficiary
    ) external override {
        // Simplified implementation - not used in the test
        revert("Not implemented");
    }

    function simulateValidation(UserOperation calldata userOp) external override {
        // Simplified implementation - not used in the test
        revert("Not implemented");
    }

    function simulateHandleOp(UserOperation calldata op, address target, bytes calldata targetCallData) external override {
        // Simplified implementation - not used in the test
        revert("Not implemented");
    }

    // Simplified implementation - just accept deposits
    function deposit() external payable {}
    
    function depositTo(address account) external payable {}

    function getDepositInfo(address account) external view override returns (DepositInfo memory info) {
        return DepositInfo(0, true, 0, 0, 0); // Set staked to true for tests
    }

    function balanceOf(address account) external view override returns (uint256) {
        return 1 ether; // Return 1 ETH balance for tests
    }

    function getNonce(address sender, uint192 key) external view override returns (uint256) {
        return 0;
    }

    function getSenderAddress(bytes calldata initCode) external override {
        // Simplified implementation - not used in the test
        revert("Not implemented");
    }

    function addStake(uint32 unstakeDelaySec) external payable override {}

    function unlockStake() external override {}

    function withdrawStake(address payable withdrawAddress) external override {}

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external override {}
    
    function getUserOpHash(UserOperation calldata userOp) external view override returns (bytes32) {
        return keccak256(abi.encode(userOp)); // Simple implementation for tests
    }
    
    function incrementNonce(uint192 key) external override {
        // No implementation needed for tests
    }
} 