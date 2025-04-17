import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import Web3Service from '../services/Web3Service';
import { SPONSOR_PAYMASTER_ADDRESS } from '../config/contracts';

export const useSponsorPaymaster = () => {
  const { account, smartWalletAddress, isInitialized } = useWeb3();
  const [isSponsoredAccount, setIsSponsoredAccount] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  
  // Verificar se a conta atual esta patrocinada
  useEffect(() => {
    const checkSponsorStatus = async () => {
      if (!isInitialized || !smartWalletAddress) {
        setIsSponsoredAccount(false);
        return;
      }
      
      try {
        setIsChecking(true);
        const status = await checkSponsorStatusForAddress(smartWalletAddress);
        setIsSponsoredAccount(status);
      } catch (err) {
        console.error('Erro ao verificar status do patrocínio:', err);
        setError('nao foi possível verificar se sua conta esta patrocinada');
        setIsSponsoredAccount(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSponsorStatus();
  }, [isInitialized, smartWalletAddress]);
  
  // Verificar se um endereço específico esta patrocinado
  const checkSponsorStatusForAddress = useCallback(async (address) => {
    try {
      // Em uma implementação real, faria uma chamada para o contrato Paymaster
      // ou para um serviço de backend para verificar se o endereço esta na lista de patrocinados
      
      // Exemplo simplificado para demonstração:
      // Simula que alguns endereços estão patrocinados com base em um hash simples
      const addressHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(address));
      const hashNum = parseInt(addressHash.slice(-8), 16);
      
      // Para demonstração, cerca de 70% dos endereços serão patrocinados
      return hashNum % 10 < 7;
      
      // Implementação real seria algo como:
      /*
      const paymasterContract = new ethers.Contract(
        SPONSOR_PAYMASTER_ADDRESS,
        PaymasterABI,
        Web3Service.provider
      );
      
      return await paymasterContract.isSponsoredAddress(address);
      */
    } catch (err) {
      console.error('Erro ao verificar status de patrocínio:', err);
      throw err;
    }
  }, []);
  
  // Enviar transação patrocinada (gasless)
  const sendGaslessTransaction = useCallback(async (recipient, amount, data = '0x') => {
    if (!isInitialized || !smartWalletAddress) {
      throw new Error('Carteira nao inicializada');
    }
    
    try {
      setError(null);
      
      // Verificar se a conta esta patrocinada
      if (!isSponsoredAccount) {
        throw new Error('Esta conta nao esta patrocinada para transações gasless');
      }
      
      // Aqui usaríamos o Web3Service para enviar a transação via EntryPoint
      // usando um Paymaster para pagar o gas
      const tx = await Web3Service.executeGaslessTransaction(
        recipient,
        amount,
        SPONSOR_PAYMASTER_ADDRESS,
        '0x' // Dados adicionais para o paymaster (se necessário)
      );
      
      return tx;
    } catch (err) {
      console.error('Erro ao enviar transação gasless:', err);
      setError(err.message || 'Falha ao enviar transação sem custos de gas');
      throw err;
    }
  }, [isInitialized, smartWalletAddress, isSponsoredAccount]);
  
  // Solicitar patrocínio para a conta atual
  const requestSponsorship = useCallback(async () => {
    if (!isInitialized || !smartWalletAddress) {
      throw new Error('Carteira nao inicializada');
    }
    
    try {
      setError(null);
      
      // Em uma implementação real, faria uma chamada para um backend
      // que adicionaria o endereço à lista de patrocinados no contrato Paymaster
      
      // Simulação para demonstração
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar status
      setIsSponsoredAccount(true);
      
      return true;
    } catch (err) {
      console.error('Erro ao solicitar patrocínio:', err);
      setError(err.message || 'Falha ao solicitar patrocínio');
      throw err;
    }
  }, [isInitialized, smartWalletAddress]);
  
  return {
    isSponsoredAccount,
    isChecking,
    error,
    checkSponsorStatus: checkSponsorStatusForAddress,
    sendGaslessTransaction,
    requestSponsorship
  };
}; 