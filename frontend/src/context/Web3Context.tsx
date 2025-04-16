import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { toast } from 'react-toastify';
import { ERC4337_CONTRACTS } from '../config/contracts';
import type { DeFiInsuranceAccount, DeFiInsuranceAccountFactory } from '../types/contracts';

interface Web3ContextType {
  provider: ethers.providers.Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  isConnected: boolean;
  chainId: number | null;
  hasSmartAccount: boolean;
  smartAccountAddress: string | null;
  entryPointAddress: string | null;
  createSmartAccount: (accountType: string, params: any) => Promise<string>;
  sendUserOp: (userOp: any) => Promise<string>;
  getSmartAccountBalance: () => Promise<string>;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  account: null,
  isConnected: false,
  chainId: null,
  hasSmartAccount: false,
  smartAccountAddress: null,
  entryPointAddress: null,
  createSmartAccount: async () => '',
  sendUserOp: async () => '',
  getSmartAccountBalance: async () => '0',
});

export const useWeb3Context = () => useContext(Web3Context);

interface Web3ContextProviderProps {
  children: ReactNode;
}

export const Web3ContextProvider = ({ children }: Web3ContextProviderProps) => {
  const { address, isConnected } = useAccount();
  const wagmiProvider = useProvider();
  const { data: wagmiSigner } = useSigner();
  
  const [provider, setProvider] = useState<ethers.providers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [hasSmartAccount, setHasSmartAccount] = useState<boolean>(false);
  const [entryPointAddress, setEntryPointAddress] = useState<string | null>(null);

  // Inicializar provider e signer quando wagmi conectar
  useEffect(() => {
    if (wagmiProvider) {
      setProvider(wagmiProvider as ethers.providers.Provider);
    }
    
    if (wagmiSigner) {
      setSigner(wagmiSigner as unknown as ethers.Signer);
    }
  }, [wagmiProvider, wagmiSigner]);

  // Obter chainId quando provider mudar
  useEffect(() => {
    const getChainId = async () => {
      if (provider) {
        try {
          const network = await provider.getNetwork();
          setChainId(network.chainId);
          
          // Configurar endereço do EntryPoint baseado na rede
          if (network.chainId === 11155111) { // Sepolia
            setEntryPointAddress(ERC4337_CONTRACTS.sepolia.entryPoint);
          } else if (network.chainId === 5) { // Goerli
            setEntryPointAddress(ERC4337_CONTRACTS.goerli.entryPoint);
          } else {
            console.warn("Rede não suportada para ERC-4337");
            setEntryPointAddress(null);
          }
        } catch (error) {
          console.error("Erro ao obter chainId:", error);
        }
      }
    };
    
    getChainId();
  }, [provider]);

  // Verificar se o usuário já tem uma smart account
  useEffect(() => {
    const checkSmartAccount = async () => {
      if (!address || !signer || !chainId) return;
      
      try {
        // Determinar o factory contract correto para o tipo de conta padrão (ex: DeFiInsurance)
        const factoryAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].deFiInsuranceFactory;
        
        if (!factoryAddress) {
          console.warn("Factory address não encontrado para esta rede");
          return;
        }
        
        const factoryAbi = ["function getAddress(address owner, address oracle, address rescueDestination, uint256 salt) view returns (address)"];
        const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
        
        // Parâmetros genéricos para verificação (pode ser ajustado conforme necessário)
        const mockOracleAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].mockPriceOracle;
        const salt = ethers.BigNumber.from(0); // Salt padrão
        
        const smartAccAddr = await factory.getAddress(
          address,
          mockOracleAddress,
          address, // Usar o próprio endereço como destino de resgate
          salt
        );
        
        // Verificar se a conta existe verificando o código
        const code = await provider?.getCode(smartAccAddr);
        
        if (code && code !== '0x') {
          setSmartAccountAddress(smartAccAddr);
          setHasSmartAccount(true);
        } else {
          setSmartAccountAddress(null);
          setHasSmartAccount(false);
        }
      } catch (error) {
        console.error("Erro ao verificar smart account:", error);
        setSmartAccountAddress(null);
        setHasSmartAccount(false);
      }
    };
    
    checkSmartAccount();
  }, [address, signer, chainId, provider]);

  // Criar uma nova smart account
  const createSmartAccount = async (accountType: string, params: any): Promise<string> => {
    if (!signer || !address || !chainId) {
      toast.error("Conecte sua carteira primeiro");
      throw new Error("Wallet não conectada");
    }
    
    try {
      let factoryAddress: string;
      let factoryAbi: any[];
      let createAccountMethod: string;
      let createAccountParams: any[];
      
      // Configurar baseado no tipo de conta
      switch (accountType) {
        case 'deFiInsurance':
          factoryAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].deFiInsuranceFactory;
          factoryAbi = [
            "function createAccount(address owner, address oracle, address rescueDestination, uint256 salt) returns (address)"
          ];
          createAccountMethod = "createAccount";
          createAccountParams = [
            address,
            params.oracleAddress || ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].mockPriceOracle,
            params.rescueDestination || address,
            params.salt || ethers.BigNumber.from(0)
          ];
          break;
          
        case 'socialLogin':
          factoryAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].socialLoginFactory;
          factoryAbi = [
            "function createAccount(bytes32 socialAuthId, address owner, uint256 salt) returns (address)"
          ];
          createAccountMethod = "createAccount";
          createAccountParams = [
            params.socialAuthId,
            address,
            params.salt || ethers.BigNumber.from(0)
          ];
          break;
          
        case 'batchPayment':
          factoryAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].batchPaymentFactory;
          factoryAbi = [
            "function createAccount(address owner, uint256 salt) returns (address)"
          ];
          createAccountMethod = "createAccount";
          createAccountParams = [
            address,
            params.salt || ethers.BigNumber.from(0)
          ];
          break;
          
        case 'corporateRecovery':
          factoryAddress = ERC4337_CONTRACTS[chainId === 11155111 ? 'sepolia' : 'goerli'].corporateRecoveryFactory;
          factoryAbi = [
            "function createAccount(address[] initialSigners, uint256 threshold, uint256 salt) returns (address)"
          ];
          createAccountMethod = "createAccount";
          createAccountParams = [
            params.initialSigners || [address],
            params.threshold || 1,
            params.salt || ethers.BigNumber.from(0)
          ];
          break;
          
        default:
          throw new Error(`Tipo de conta não suportado: ${accountType}`);
      }
      
      // Criar a conta
      const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);
      const tx = await factory[createAccountMethod](...createAccountParams);
      await tx.wait();
      
      // Obter o endereço da nova conta
      const getAddressMethod = "getAddress";
      const newSmartAccountAddress = await factory[getAddressMethod](...createAccountParams);
      
      // Atualizar o estado
      setSmartAccountAddress(newSmartAccountAddress);
      setHasSmartAccount(true);
      
      toast.success("Conta inteligente criada com sucesso!");
      return newSmartAccountAddress;
    } catch (error) {
      console.error("Erro ao criar smart account:", error);
      toast.error("Erro ao criar conta inteligente. Verifique o console para detalhes.");
      throw error;
    }
  };

  // Enviar uma UserOperation
  const sendUserOp = async (userOp: any): Promise<string> => {
    if (!signer || !entryPointAddress) {
      toast.error("Configuração incompleta para enviar operação");
      throw new Error("Configuração incompleta");
    }
    
    try {
      // Implementação simplificada - na prática, integraria com um bundler via RPC
      toast.info("Enviando UserOperation para o bundler...");
      
      // Exemplo de simulação - na implementação real, integraria com um bundler
      // e usaria o método eth_sendUserOperation
      
      // Simular resposta de sucesso
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockOpHash = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      toast.success("UserOperation enviada com sucesso!");
      
      return mockOpHash;
    } catch (error) {
      console.error("Erro ao enviar UserOperation:", error);
      toast.error("Erro ao enviar operação. Verifique o console para detalhes.");
      throw error;
    }
  };

  // Obter saldo da smart account
  const getSmartAccountBalance = async (): Promise<string> => {
    if (!provider || !smartAccountAddress) {
      return "0";
    }
    
    try {
      const balance = await provider.getBalance(smartAccountAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Erro ao obter saldo da smart account:", error);
      return "0";
    }
  };

  const value = {
    provider,
    signer,
    account: address || null,
    isConnected,
    chainId,
    hasSmartAccount,
    smartAccountAddress,
    entryPointAddress,
    createSmartAccount,
    sendUserOp,
    getSmartAccountBalance,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}; 