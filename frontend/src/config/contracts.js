// Endereços dos contratos implantados
// Estes seriam substituídos pelos endereços reais após o deploy

// EntryPoint do ERC-4337
export const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Factory para criação de SimpleAccounts (carteiras)
export const FACTORY_ADDRESS = '0x9406Cc6185a346906296840746125a0E44976454';

// Paymaster para transações patrocinadas
export const SPONSOR_PAYMASTER_ADDRESS = '0xBF5C5E1BDd7b27bE849e4dB5E7F5E63FEAbC8c6F';

// MultiSig Factory
export const MULTISIG_FACTORY_ADDRESS = '0x8Fa3633020785Ff43Ae3411CE6Fe14663AdDF98C';

// RecurringPayments Factory
export const RECURRING_PAYMENTS_FACTORY_ADDRESS = '0x7D9c3BD1fDa55A2c9CB27431E5C38D61C4A3e7A9';

// Configurações da rede atual
export const NETWORK_CONFIG = {
  chainId: '0x5', // Goerli testnet
  chainName: 'Goerli',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
  blockExplorerUrls: ['https://goerli.etherscan.io']
};

// Configurações de ABIs
export const ABI_PATHS = {
  entryPoint: '/abis/EntryPoint.json',
  factory: '/abis/SimpleAccountFactory.json',
  account: '/abis/SimpleAccount.json',
  paymaster: '/abis/SponsorPaymaster.json',
  multisigFactory: '/abis/MultiSigFactory.json',
  multiSig: '/abis/MultiSig.json',
  recurringPaymentsFactory: '/abis/RecurringPaymentsFactory.json',
  recurringPayments: '/abis/RecurringPayments.json'
}; 