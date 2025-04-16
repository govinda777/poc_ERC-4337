import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import { useUserOperationContext } from '../context/UserOperationContext';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaGasPump, FaCheck } from 'react-icons/fa';

interface Transaction {
  id: string;
  to: string;
  value: string;
  data: string;
  isValid: boolean;
}

const BatchTransaction = () => {
  const { smartAccountAddress, hasSmartAccount } = useWeb3Context();
  const { buildCallData, createUserOperation, estimateGas, signUserOperation, sendUserOperation } = useUserOperationContext();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [estimatedGas, setEstimatedGas] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Adicionar transação vazia ao iniciar
  useEffect(() => {
    if (transactions.length === 0) {
      addTransaction();
    }
  }, []);
  
  // Função para adicionar uma nova transação
  const addTransaction = () => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      to: '',
      value: '0',
      data: '0x',
      isValid: false
    };
    
    setTransactions([...transactions, newTransaction]);
  };
  
  // Função para remover uma transação
  const removeTransaction = (id: string) => {
    if (transactions.length > 1) {
      setTransactions(transactions.filter(tx => tx.id !== id));
    } else {
      toast.info('Deve haver pelo menos uma transação');
    }
  };
  
  // Função para atualizar uma transação
  const updateTransaction = (id: string, field: keyof Transaction, value: string) => {
    const updatedTransactions = transactions.map(tx => {
      if (tx.id === id) {
        const updatedTx = { ...tx, [field]: value };
        
        // Validar a transação
        const isToValid = ethers.utils.isAddress(updatedTx.to);
        const isValueValid = !isNaN(parseFloat(updatedTx.value)) && parseFloat(updatedTx.value) >= 0;
        const isDataValid = updatedTx.data.startsWith('0x');
        
        updatedTx.isValid = isToValid && isValueValid && isDataValid;
        
        return updatedTx;
      }
      return tx;
    });
    
    setTransactions(updatedTransactions);
  };
  
  // Verificar se todas as transações são válidas
  const areAllTransactionsValid = () => {
    return transactions.every(tx => tx.isValid);
  };
  
  // Estimar gas para as transações em lote
  const estimateTransactionGas = async () => {
    if (!hasSmartAccount || !smartAccountAddress) {
      toast.error('Conta inteligente não encontrada');
      return;
    }
    
    if (!areAllTransactionsValid()) {
      toast.error('Todas as transações devem ser válidas');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Construir o callData para uma transação em lote
      // Este é um exemplo baseado no padrão ERC-4337, a implementação real
      // dependeria da interface específica da sua conta inteligente
      
      // Formato simplificado: executeBatch(address[] to, uint256[] value, bytes[] data)
      // Primeiro, precisamos construir os parâmetros para executeBatch
      
      const tos = transactions.map(tx => tx.to);
      const values = transactions.map(tx => ethers.utils.parseEther(tx.value || '0').toString());
      const datas = transactions.map(tx => tx.data);
      
      // Encodar a chamada a executeBatch - este é um exemplo simplificado
      // O método real e sua assinatura dependerão da implementação da sua conta
      const encodedFunction = ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'bytes[]'],
        [tos, values, datas]
      );
      
      const callData = buildCallData(
        smartAccountAddress, // self call
        '0',
        '0x9a0369b3' + encodedFunction.slice(2) // selector for executeBatch + params
      );
      
      // Criar UserOperation
      const userOp = createUserOperation({
        sender: smartAccountAddress,
        callData,
      });
      
      // Estimar gas
      const gasEstimate = await estimateGas(userOp);
      setEstimatedGas(ethers.utils.formatEther(gasEstimate));
      
      toast.success('Gas estimado com sucesso');
    } catch (error) {
      console.error('Erro ao estimar gas:', error);
      toast.error('Falha ao estimar gas');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enviar transações em lote
  const sendBatchTransaction = async () => {
    if (!hasSmartAccount || !smartAccountAddress) {
      toast.error('Conta inteligente não encontrada');
      return;
    }
    
    if (!areAllTransactionsValid()) {
      toast.error('Todas as transações devem ser válidas');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Construir o callData como fizemos na estimativa de gas
      const tos = transactions.map(tx => tx.to);
      const values = transactions.map(tx => ethers.utils.parseEther(tx.value || '0').toString());
      const datas = transactions.map(tx => tx.data);
      
      const encodedFunction = ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'bytes[]'],
        [tos, values, datas]
      );
      
      const callData = buildCallData(
        smartAccountAddress, // self call
        '0',
        '0x9a0369b3' + encodedFunction.slice(2) // selector for executeBatch + params
      );
      
      // Criar UserOperation
      const userOp = createUserOperation({
        sender: smartAccountAddress,
        callData,
      });
      
      // Assinar e enviar a UserOperation
      const signedOp = await signUserOperation(userOp);
      await sendUserOperation(signedOp);
      
      toast.success('Transações em lote enviadas com sucesso');
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao enviar transações:', error);
      toast.error('Falha ao enviar transações em lote');
    } finally {
      setIsSending(false);
    }
  };
  
  const resetForm = () => {
    setTransactions([{
      id: Date.now().toString(),
      to: '',
      value: '0',
      data: '0x',
      isValid: false
    }]);
    setEstimatedGas('0');
    setIsSuccess(false);
  };
  
  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center py-10">
            <div className="bg-green-100 dark:bg-green-900/20 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheck className="text-green-500 dark:text-green-400 text-5xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Transações Enviadas com Sucesso!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Suas transações em lote foram enviadas com sucesso através da sua conta ERC-4337.
            </p>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Enviar Novas Transações
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          Transações em Lote com ERC-4337
        </h1>
        
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">
            Como funciona?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Com contas ERC-4337, você pode enviar várias transações em uma única operação,
            economizando gas e tempo. Adicione múltiplas transações abaixo, estime o gas,
            e envie tudo de uma vez!
          </p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Transações ({transactions.length})
            </h2>
            <button
              onClick={addTransaction}
              className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
            >
              <FaPlus className="mr-1" /> Adicionar
            </button>
          </div>
          
          {transactions.map((tx, index) => (
            <div key={tx.id} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-700 dark:text-gray-300">Transação #{index + 1}</h3>
                <button
                  onClick={() => removeTransaction(tx.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  disabled={transactions.length === 1}
                >
                  <FaTrash />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Endereço de Destino
                  </label>
                  <input
                    type="text"
                    value={tx.to}
                    onChange={(e) => updateTransaction(tx.id, 'to', e.target.value)}
                    placeholder="0x..."
                    className={`w-full px-3 py-2 border ${tx.to && !ethers.utils.isAddress(tx.to) ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white`}
                  />
                  {tx.to && !ethers.utils.isAddress(tx.to) && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Endereço inválido
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor (ETH)
                  </label>
                  <input
                    type="text"
                    value={tx.value}
                    onChange={(e) => updateTransaction(tx.id, 'value', e.target.value)}
                    placeholder="0.0"
                    className={`w-full px-3 py-2 border ${tx.value && (isNaN(parseFloat(tx.value)) || parseFloat(tx.value) < 0) ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white`}
                  />
                  {tx.value && (isNaN(parseFloat(tx.value)) || parseFloat(tx.value) < 0) && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Valor inválido
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data (Hex)
                </label>
                <input
                  type="text"
                  value={tx.data}
                  onChange={(e) => updateTransaction(tx.id, 'data', e.target.value)}
                  placeholder="0x..."
                  className={`w-full px-3 py-2 border ${tx.data && !tx.data.startsWith('0x') ? 'border-red-300 dark:border-red-800' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white`}
                />
                {tx.data && !tx.data.startsWith('0x') && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Data deve começar com 0x
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Gas Estimado:
              </span>
              <span className="ml-2 text-lg font-semibold text-gray-800 dark:text-white">
                {estimatedGas} ETH
              </span>
            </div>
            
            <button
              onClick={estimateTransactionGas}
              disabled={isLoading || !hasSmartAccount || !areAllTransactionsValid()}
              className="flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Estimando...
                </>
              ) : (
                <>
                  <FaGasPump className="mr-2" />
                  Estimar Gas
                </>
              )}
            </button>
          </div>
        </div>
        
        <button
          onClick={sendBatchTransaction}
          disabled={isSending || !hasSmartAccount || !areAllTransactionsValid()}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando Transações...
            </>
          ) : (
            'Enviar Transações em Lote'
          )}
        </button>
        
        {!hasSmartAccount && (
          <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
            Você precisa de uma conta inteligente para usar esta funcionalidade.
          </p>
        )}
      </div>
    </div>
  );
};

export default BatchTransaction; 