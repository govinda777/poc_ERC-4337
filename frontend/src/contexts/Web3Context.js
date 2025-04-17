import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Service from '../services/Web3Service';

const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [account, setAccount] = useState(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [smartWalletBalance, setSmartWalletBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        setIsConnecting(true);
        const success = await Web3Service.initialize();
        
        if (success) {
          setIsInitialized(true);
          setAccount(Web3Service.account);
          
          // Tentar recuperar carteira existente
          const storedWallet = localStorage.getItem(`wallet_${Web3Service.account}`);
          if (storedWallet) {
            try {
              const walletAddress = JSON.parse(storedWallet).address;
              setSmartWalletAddress(walletAddress);
              Web3Service.smartWalletAddress = walletAddress;
              await Web3Service.initializeSmartWallet(walletAddress);
            } catch (err) {
              console.error('Erro ao recuperar carteira:', err);
            }
          }
          
          // Configurar listener para mudanças de conta
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', () => window.location.reload());
          
          // Atualizar saldos
          await updateBalances();
        }
      } catch (error) {
        console.error('Erro ao inicializar Web3:', error);
        setError('Falha ao conectar com a blockchain. Verifique se você tem uma carteira instalada.');
      } finally {
        setIsConnecting(false);
      }
    };
    
    init();
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);
  
  // Atualizar saldos periodicamente
  useEffect(() => {
    if (isInitialized && account) {
      updateBalances();
      
      const intervalId = setInterval(() => {
        updateBalances();
      }, 30000); // Atualizar a cada 30 segundos
      
      return () => clearInterval(intervalId);
    }
  }, [isInitialized, account, smartWalletAddress]);
  
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // Usuário desconectou a carteira
      setAccount(null);
      setSmartWalletAddress(null);
      setBalance('0');
      setSmartWalletBalance('0');
    } else {
      // Atualizar conta
      setAccount(accounts[0]);
      Web3Service.account = accounts[0];
      
      // Tentar recuperar carteira para nova conta
      const storedWallet = localStorage.getItem(`wallet_${accounts[0]}`);
      if (storedWallet) {
        try {
          const walletAddress = JSON.parse(storedWallet).address;
          setSmartWalletAddress(walletAddress);
          Web3Service.smartWalletAddress = walletAddress;
          await Web3Service.initializeSmartWallet(walletAddress);
        } catch (err) {
          console.error('Erro ao recuperar carteira:', err);
        }
      } else {
        setSmartWalletAddress(null);
        Web3Service.smartWallet = null;
        Web3Service.smartWalletAddress = null;
      }
      
      // Atualizar saldos
      await updateBalances();
    }
  };
  
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const success = await Web3Service.initialize();
      
      if (success) {
        setIsInitialized(true);
        setAccount(Web3Service.account);
        await updateBalances();
        
        // Tentar recuperar carteira existente
        const storedWallet = localStorage.getItem(`wallet_${Web3Service.account}`);
        if (storedWallet) {
          try {
            const walletAddress = JSON.parse(storedWallet).address;
            setSmartWalletAddress(walletAddress);
            Web3Service.smartWalletAddress = walletAddress;
            await Web3Service.initializeSmartWallet(walletAddress);
          } catch (err) {
            console.error('Erro ao recuperar carteira:', err);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      setError('Falha ao conectar com a carteira. Tente novamente.');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const createSmartWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!isInitialized || !account) {
        await connectWallet();
      }
      
      const address = await Web3Service.createSmartWallet();
      setSmartWalletAddress(address);
      
      // Armazenar referência da carteira para o usuário atual
      localStorage.setItem(`wallet_${account}`, JSON.stringify({ address }));
      
      await updateBalances();
      return address;
    } catch (error) {
      console.error('Erro ao criar carteira:', error);
      setError('Falha ao criar carteira inteligente. Tente novamente.');
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };
  
  const updateBalances = async () => {
    if (Web3Service.provider && account) {
      try {
        const bal = await Web3Service.provider.getBalance(account);
        setBalance(ethers.utils.formatEther(bal));
        
        if (smartWalletAddress) {
          const smartBal = await Web3Service.provider.getBalance(smartWalletAddress);
          setSmartWalletBalance(ethers.utils.formatEther(smartBal));
        }
      } catch (error) {
        console.error('Erro ao atualizar saldos:', error);
      }
    }
  };
  
  const disconnectWallet = () => {
    setAccount(null);
    setSmartWalletAddress(null);
    setBalance('0');
    setSmartWalletBalance('0');
    setIsInitialized(false);
    Web3Service.reset();
  };
  
  const value = {
    isInitialized,
    isConnecting,
    account,
    smartWalletAddress,
    balance,
    smartWalletBalance,
    error,
    connectWallet,
    createSmartWallet,
    updateBalances,
    disconnectWallet
  };
  
  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 deve ser usado dentro de um Web3Provider');
  }
  return context;
}; 