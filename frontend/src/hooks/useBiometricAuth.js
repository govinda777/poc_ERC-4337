import { useState, useEffect, useCallback } from 'react';
import BiometricService from '../services/BiometricService';
import { useWeb3 } from '../contexts/Web3Context';

export const useBiometricAuth = () => {
  const { createSmartWallet } = useWeb3();
  const [isSupported, setIsSupported] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);
  const [hasCredential, setHasCredential] = useState(false);
  
  // Verificar compatibilidade no carregamento
  useEffect(() => {
    const checkCompatibility = async () => {
      try {
        setIsChecking(true);
        const supported = await BiometricService.checkDeviceCompatibility();
        setIsSupported(supported);
        
        // Verificar se já existe credencial armazenada
        const hasExistingCredential = BiometricService.hasStoredCredential();
        setHasCredential(hasExistingCredential);
      } catch (err) {
        console.error('Erro ao verificar compatibilidade:', err);
        setError('Não foi possível verificar a compatibilidade do dispositivo');
        setIsSupported(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkCompatibility();
  }, []);
  
  // Registrar nova credencial biométrica e criar carteira
  const registerBiometric = useCallback(async (username = 'user') => {
    try {
      setIsRegistering(true);
      setError(null);
      
      // Verificar novamente se o dispositivo é compatível
      const isCompatible = await BiometricService.checkDeviceCompatibility();
      if (!isCompatible) {
        throw new Error('Seu dispositivo não suporta autenticação biométrica');
      }
      
      // Registrar biometria
      const result = await BiometricService.registerBiometric(username);
      
      // Criar carteira inteligente associada
      const walletAddress = await createSmartWallet();
      
      // Associar a credencial biométrica à carteira criada
      localStorage.setItem('bioWalletAddress', walletAddress);
      
      setHasCredential(true);
      return {
        credential: result,
        walletAddress
      };
    } catch (err) {
      console.error('Erro ao registrar biometria:', err);
      setError(err.message || 'Falha ao registrar autenticação biométrica');
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, [createSmartWallet]);
  
  // Autenticar usando credencial biométrica
  const authenticate = useCallback(async () => {
    try {
      setIsAuthenticating(true);
      setError(null);
      
      // Verificar se existe credencial
      if (!BiometricService.hasStoredCredential()) {
        throw new Error('Nenhuma credencial biométrica encontrada');
      }
      
      // Autenticar
      const result = await BiometricService.authenticate();
      
      // Recuperar endereço da carteira associada
      const walletAddress = localStorage.getItem('bioWalletAddress');
      if (!walletAddress) {
        throw new Error('Nenhuma carteira associada encontrada');
      }
      
      return {
        success: result.success,
        walletAddress
      };
    } catch (err) {
      console.error('Erro na autenticação biométrica:', err);
      setError(err.message || 'Falha na autenticação biométrica');
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);
  
  // Remover credencial biométrica
  const removeCredential = useCallback(() => {
    try {
      BiometricService.clearStoredCredential();
      localStorage.removeItem('bioWalletAddress');
      setHasCredential(false);
      return true;
    } catch (err) {
      console.error('Erro ao remover credencial:', err);
      setError('Falha ao remover credencial biométrica');
      return false;
    }
  }, []);
  
  return {
    isSupported,
    isChecking,
    isRegistering,
    isAuthenticating,
    hasCredential,
    error,
    registerBiometric,
    authenticate,
    removeCredential
  };
}; 