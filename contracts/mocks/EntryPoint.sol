// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

// Mock simples do EntryPoint para testes
// Em produção, seria usado o EntryPoint oficial do ERC-4337

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract EntryPoint is IEntryPoint {
    // Implementação mínima para o exemplo
    address private owner;

    constructor() {
        owner = msg.sender;
    }

    // Função de mock para simular validação
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external override {
        require(msg.sender == owner, "apenas o owner pode chamar");
    }

    function handleAggregatedOps(
        UserOpsPerAggregator[] calldata opsPerAggregator,
        address payable beneficiary
    ) external override {
        require(msg.sender == owner, "apenas o owner pode chamar");
    }

    function simulateValidation(UserOperation calldata userOp) external override {}

    function simulateHandleOp(UserOperation calldata op, address target, bytes calldata targetCallData) external override {}

    function deposit() external payable override {}

    function getDepositInfo(address account) external view override returns (DepositInfo memory info) {
        return DepositInfo(0, 0, false);
    }

    function balanceOf(address account) external view override returns (uint256) {
        return 0;
    }

    function getNonce(address sender, uint192 key) external view override returns (uint256) {
        return 0;
    }

    function getSenderAddress(bytes calldata initCode) external override {}

    function addStake(uint32 unstakeDelaySec) external payable override {}

    function unlockStake() external override {}

    function withdrawStake(address payable withdrawAddress) external override {}

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external override {}
} 