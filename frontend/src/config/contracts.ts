/**
 * Configuração de endereços de contratos para a POC ERC-4337
 * Por rede (Sepolia, Goerli)
 */

export const ERC4337_CONTRACTS = {
  // Rede Sepolia
  sepolia: {
    // Componentes principais do ERC-4337
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint oficial da rede Sepolia
    
    // Factories para cada tipo de conta
    deFiInsuranceFactory: '0x1234567890123456789012345678901234567890', // Mock para testes
    socialLoginFactory: '0x2345678901234567890123456789012345678901', // Mock para testes
    batchPaymentFactory: '0x3456789012345678901234567890123456789012', // Mock para testes
    corporateRecoveryFactory: '0x4567890123456789012345678901234567890123', // Mock para testes
    
    // Implementações
    deFiInsuranceAccount: '0x5678901234567890123456789012345678901234', // Mock para testes
    socialLoginAccount: '0x6789012345678901234567890123456789012345', // Mock para testes
    batchPaymentAccount: '0x7890123456789012345678901234567890123456', // Mock para testes
    corporateRecoveryAccount: '0x8901234567890123456789012345678901234567', // Mock para testes
    
    // Paymasters
    verifyingPaymaster: '0x9012345678901234567890123456789012345678', // Mock para testes
    tokenPaymaster: '0x0123456789012345678901234567890123456789', // Mock para testes
    
    // Contratos auxiliares
    mockPriceOracle: '0xa123456789012345678901234567890123456789', // Mock para testes
  },
  
  // Rede Goerli
  goerli: {
    // Componentes principais do ERC-4337
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint oficial da rede Goerli
    
    // Factories para cada tipo de conta
    deFiInsuranceFactory: '0xb123456789012345678901234567890123456789', // Mock para testes
    socialLoginFactory: '0xc123456789012345678901234567890123456789', // Mock para testes
    batchPaymentFactory: '0xd123456789012345678901234567890123456789', // Mock para testes
    corporateRecoveryFactory: '0xe123456789012345678901234567890123456789', // Mock para testes
    
    // Implementações
    deFiInsuranceAccount: '0xf123456789012345678901234567890123456789', // Mock para testes
    socialLoginAccount: '0x1234567890123456789012345678901234567891', // Mock para testes
    batchPaymentAccount: '0x1234567890123456789012345678901234567892', // Mock para testes
    corporateRecoveryAccount: '0x1234567890123456789012345678901234567893', // Mock para testes
    
    // Paymasters
    verifyingPaymaster: '0x1234567890123456789012345678901234567894', // Mock para testes
    tokenPaymaster: '0x1234567890123456789012345678901234567895', // Mock para testes
    
    // Contratos auxiliares
    mockPriceOracle: '0x1234567890123456789012345678901234567896', // Mock para testes
  },
  
  // Função de utilidade para obter endereços por chainId
  getAddressesByChainId: (chainId: number) => {
    switch (chainId) {
      case 11155111: // Sepolia
        return ERC4337_CONTRACTS.sepolia;
      case 5: // Goerli
        return ERC4337_CONTRACTS.goerli;
      default:
        throw new Error(`Chain ID ${chainId} não suportado para ERC-4337`);
    }
  }
};

// Tipos de contas suportadas
export enum AccountType {
  DEFI_INSURANCE = 'deFiInsurance',
  SOCIAL_LOGIN = 'socialLogin',
  BATCH_PAYMENT = 'batchPayment',
  CORPORATE_RECOVERY = 'corporateRecovery'
}

// ABI mínimo para o EntryPoint
export const ENTRY_POINT_ABI_MINIMAL = [
  'function getNonce(address sender, uint192 key) view returns (uint256)',
  'function depositTo(address account) payable',
  'function balanceOf(address account) view returns (uint256)',
  'function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] calldata ops, address beneficiary) payable'
]; 