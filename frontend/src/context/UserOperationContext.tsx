import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from './Web3Context';
import { toast } from 'react-toastify';

// Definindo a estrutura de uma UserOperation
interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

// Definindo a estrutura do histórico de operações
interface OperationHistoryItem {
  id: string;
  type: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  userOp: UserOperation;
  hash?: string;
  receipt?: any;
}

// Interface do contexto
interface UserOperationContextType {
  pendingOperations: OperationHistoryItem[];
  operationHistory: OperationHistoryItem[];
  createUserOperation: (params: Partial<UserOperation>) => UserOperation;
  signUserOperation: (userOp: UserOperation) => Promise<UserOperation>;
  sendUserOperation: (userOp: UserOperation) => Promise<string>;
  buildCallData: (to: string, value: string, data: string) => string;
  estimateGas: (userOp: Partial<UserOperation>) => Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }>;
  clearHistory: () => void;
}

// Criando o contexto
const UserOperationContext = createContext<UserOperationContextType>({
  pendingOperations: [],
  operationHistory: [],
  createUserOperation: () => ({} as UserOperation),
  signUserOperation: async () => ({} as UserOperation),
  sendUserOperation: async () => '',
  buildCallData: () => '',
  estimateGas: async () => ({
    callGasLimit: '0',
    verificationGasLimit: '0',
    preVerificationGas: '0',
  }),
  clearHistory: () => {},
});

// Hook para usar o contexto
export const useUserOperationContext = () => useContext(UserOperationContext);

// Propriedades do provedor
interface UserOperationContextProviderProps {
  children: ReactNode;
}

// Provedor do contexto
export const UserOperationContextProvider = ({
  children,
}: UserOperationContextProviderProps) => {
  const { signer, smartAccountAddress, entryPointAddress, sendUserOp } = useWeb3Context();

  const [pendingOperations, setPendingOperations] = useState<OperationHistoryItem[]>([]);
  const [operationHistory, setOperationHistory] = useState<OperationHistoryItem[]>([]);

  // Criar uma nova UserOperation
  const createUserOperation = (params: Partial<UserOperation>): UserOperation => {
    // Valores padrão
    const defaultOp: UserOperation = {
      sender: smartAccountAddress || ethers.constants.AddressZero,
      nonce: '0x0',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x30000',
      verificationGasLimit: '0x200000',
      preVerificationGas: '0x30000',
      maxFeePerGas: '0x' + (3e9).toString(16), // 3 gwei
      maxPriorityFeePerGas: '0x' + (1e9).toString(16), // 1 gwei
      paymasterAndData: '0x',
      signature: '0x',
    };

    // Mesclar com os parâmetros fornecidos
    return {
      ...defaultOp,
      ...params,
    };
  };

  // Assinar uma UserOperation
  const signUserOperation = async (userOp: UserOperation): Promise<UserOperation> => {
    if (!signer || !entryPointAddress) {
      toast.error('Carteira ou EntryPoint nao configurados');
      throw new Error('Configuração incompleta');
    }

    try {
      // Em uma implementação real, você usaria o pacote userop.js ou lógica específica 
      // para calcular o hash da UserOperation e assinar
      
      // Exemplo simplificado:
      const userOpHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          [
            'address', 'uint256', 'bytes', 'bytes',
            'uint256', 'uint256', 'uint256',
            'uint256', 'uint256', 'bytes', 'bytes',
          ],
          [
            userOp.sender, userOp.nonce, userOp.initCode, userOp.callData,
            userOp.callGasLimit, userOp.verificationGasLimit, userOp.preVerificationGas,
            userOp.maxFeePerGas, userOp.maxPriorityFeePerGas, userOp.paymasterAndData, '0x',
          ]
        )
      );

      // Adicionar prefixo (isso é uma simplificação, o processo real é mais complexo)
      const message = ethers.utils.arrayify(userOpHash);
      
      // Assinar a mensagem
      const signature = await signer.signMessage(message);
      
      return {
        ...userOp,
        signature,
      };
    } catch (error) {
      console.error('Erro ao assinar UserOperation:', error);
      toast.error('Falha ao assinar operação');
      throw error;
    }
  };

  // Enviar UserOperation
  const sendUserOperation = async (userOp: UserOperation): Promise<string> => {
    try {
      // Criar um item no histórico de operações pendentes
      const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newOperation: OperationHistoryItem = {
        id: operationId,
        type: 'call', // Tipo padrão
        status: 'pending',
        timestamp: Date.now(),
        userOp,
      };

      // Adicionar à lista de operações pendentes
      setPendingOperations((prev) => [...prev, newOperation]);

      // Enviar a UserOperation através do Web3Context
      const opHash = await sendUserOp(userOp);

      // Atualizar o status da operação
      const updatedOperation: OperationHistoryItem = {
        ...newOperation,
        status: 'success',
        hash: opHash,
      };

      // Remover das operações pendentes
      setPendingOperations((prev) => prev.filter((op) => op.id !== operationId));

      // Adicionar ao histórico
      setOperationHistory((prev) => [updatedOperation, ...prev]);

      return opHash;
    } catch (error) {
      console.error('Erro ao enviar UserOperation:', error);
      toast.error('Falha ao enviar operação');
      throw error;
    }
  };

  // Construir callData para uma operação de chamada
  const buildCallData = (to: string, value: string, data: string): string => {
    // Em uma implementação real, você utilizaria a interface do contrato de conta para codificar a chamada
    // Esse é um exemplo simplificado
    const executeSelector = '0b93381b'; // selector para execute(address,uint256,bytes)
    
    // Codificar os parâmetros da função execute
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes'],
      [to, value, data]
    ).slice(2); // remover 0x
    
    return `0x${executeSelector}${encodedParams}`;
  };

  // Estimar gas para uma UserOperation
  const estimateGas = async (
    userOp: Partial<UserOperation>
  ): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> => {
    // Em uma implementação real, você chamaria o RPC do bundler com eth_estimateUserOperationGas
    // Esse é um exemplo simplificado
    
    // Valores padrão baseados em operações típicas
    return {
      callGasLimit: '0x30000',
      verificationGasLimit: '0x200000',
      preVerificationGas: '0x30000',
    };
  };

  // Limpar histórico de operações
  const clearHistory = () => {
    setOperationHistory([]);
  };

  const value = {
    pendingOperations,
    operationHistory,
    createUserOperation,
    signUserOperation,
    sendUserOperation,
    buildCallData,
    estimateGas,
    clearHistory,
  };

  return (
    <UserOperationContext.Provider value={value}>
      {children}
    </UserOperationContext.Provider>
  );
}; 