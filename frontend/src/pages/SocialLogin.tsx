import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import { useUserOperationContext } from '../context/UserOperationContext';
import { toast } from 'react-toastify';

// Componentes de UI
import { FaGoogle, FaFacebook, FaTwitter, FaKey, FaWallet } from 'react-icons/fa';

const SocialLogin = () => {
  const { 
    account, 
    isConnected, 
    smartAccountAddress, 
    hasSmartAccount,
    createSmartAccount 
  } = useWeb3Context();
  
  const { buildCallData, createUserOperation, signUserOperation, sendUserOperation } = useUserOperationContext();
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mockAuthCode, setMockAuthCode] = useState('');
  const [accountStatus, setAccountStatus] = useState<'none' | 'creating' | 'ready'>('none');

  useEffect(() => {
    if (hasSmartAccount) {
      setAccountStatus('ready');
    } else {
      setAccountStatus('none');
    }
  }, [hasSmartAccount]);

  // Função para iniciar o processo de login/criação de conta
  const handleSocialLogin = async (provider: string) => {
    if (!isConnected) {
      toast.error('Por favor, conecte sua carteira primeiro');
      return;
    }

    setSelectedProvider(provider);
    setIsLoading(true);
    
    try {
      // Simular Autenticacao com provedor social
      // Em produção, integraria com OAuth real
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Gerar código de Autenticacao mock
      const mockCode = `auth_${provider}_${Math.random().toString(36).substring(2, 10)}`;
      setMockAuthCode(mockCode);
      
      toast.success(`Autenticado com ${provider}`);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao autenticar:', error);
      toast.error('Falha na Autenticacao');
      setIsLoading(false);
      setSelectedProvider(null);
    }
  };

  // Função para criar a conta inteligente baseada no login social
  const handleCreateAccount = async () => {
    if (!mockAuthCode || !selectedProvider) {
      toast.error('Faça login social primeiro');
      return;
    }

    setIsLoading(true);
    setAccountStatus('creating');

    try {
      // Em um cenário real, enviaríamos o código de Autenticacao para um backend
      // para verificar e gerar uma assinatura que seria usada na criação da conta
      
      await createSmartAccount('social');
      
      toast.success('Conta inteligente criada com sucesso');
      setIsLoading(false);
      setAccountStatus('ready');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Falha ao criar conta inteligente');
      setIsLoading(false);
      setAccountStatus('none');
    }
  };

  // Função para assinar mensagem com a conta inteligente
  const handleSignMessage = async () => {
    if (!hasSmartAccount || !smartAccountAddress) {
      toast.error('Conta inteligente nao encontrada');
      return;
    }

    setIsLoading(true);
    
    try {
      // Criando uma mensagem para assinar
      const message = "Hello ERC-4337!";
      const messageHash = ethers.utils.hashMessage(message);
      
      // Aqui é onde usaríamos a UserOperation para assinar com a conta inteligente
      // Gerar callData para chamar a função personalizada na conta social
      // Este é um exemplo simplificado - a implementação real depende da interface do contrato
      const signMessageCallData = buildCallData(
        "0x0000000000000000000000000000000000000000", // Para self
        "0", // Sem valor
        "0x19ab453c" + ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)).slice(2) // selector de signMessage + mensagem
      );
      
      // Criar UserOperation
      const userOp = createUserOperation({
        sender: smartAccountAddress,
        callData: signMessageCallData,
      });
      
      // Assinar e enviar a UserOperation
      const signedOp = await signUserOperation(userOp);
      await sendUserOperation(signedOp);
      
      toast.success('Mensagem assinada com sucesso');
    } catch (error) {
      console.error('Erro ao assinar mensagem:', error);
      toast.error('Falha ao assinar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          Login Social com ERC-4337
        </h1>
        
        <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">
            Como funciona?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Este demo mostra como criar uma conta ERC-4337 com Autenticacao social.
            Conecte sua carteira, escolha um provedor social, e crie uma conta inteligente 
            que você pode usar sem precisar da carteira original novamente.
          </p>
        </div>

        {/* Status de conexão */}
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <div className="flex items-center mb-2">
            <FaWallet className="text-gray-500 dark:text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status da Carteira:
            </span>
            <span className={`ml-2 text-sm px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {isConnected ? `Conectado: ${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Desconectado'}
            </span>
          </div>
          
          <div className="flex items-center">
            <FaKey className="text-gray-500 dark:text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Conta Inteligente:
            </span>
            <span className={`ml-2 text-sm px-2 py-1 rounded ${hasSmartAccount ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
              {hasSmartAccount 
                ? `${smartAccountAddress?.slice(0, 6)}...${smartAccountAddress?.slice(-4)}` 
                : 'nao criada'}
            </span>
          </div>
        </div>

        {/* Etapa 1: Provedores sociais */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
            Etapa 1: Escolha um provedor social
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('Google')}
              disabled={isLoading || accountStatus === 'ready' || !isConnected}
              className={`flex items-center justify-center p-3 rounded-lg ${
                selectedProvider === 'Google' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              } border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <FaGoogle className="mr-2" />
              <span>Google</span>
            </button>
            
            <button
              onClick={() => handleSocialLogin('Facebook')}
              disabled={isLoading || accountStatus === 'ready' || !isConnected}
              className={`flex items-center justify-center p-3 rounded-lg ${
                selectedProvider === 'Facebook' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              } border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <FaFacebook className="mr-2" />
              <span>Facebook</span>
            </button>
            
            <button
              onClick={() => handleSocialLogin('Twitter')}
              disabled={isLoading || accountStatus === 'ready' || !isConnected}
              className={`flex items-center justify-center p-3 rounded-lg ${
                selectedProvider === 'Twitter' 
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              } border transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <FaTwitter className="mr-2" />
              <span>Twitter</span>
            </button>
          </div>
        </div>

        {/* Etapa 2: Criar conta */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
            Etapa 2: Criar conta inteligente
          </h2>
          
          {selectedProvider && mockAuthCode && accountStatus !== 'ready' && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-medium">Autenticado com {selectedProvider}!</span> 
                <br />Código: {mockAuthCode}
              </p>
            </div>
          )}
          
          <button
            onClick={handleCreateAccount}
            disabled={isLoading || !mockAuthCode || accountStatus === 'ready'}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading && accountStatus === 'creating' ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando Conta...
              </>
            ) : accountStatus === 'ready' ? (
              'Conta Criada com Sucesso!'
            ) : (
              'Criar Conta Inteligente'
            )}
          </button>
        </div>

        {/* Etapa 3: Usar a conta */}
        {accountStatus === 'ready' && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              Etapa 3: Usar sua conta inteligente
            </h2>
            
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-medium">Conta criada com sucesso!</span> 
                <br />Agora você pode usar sua conta inteligente para assinar mensagens.
              </p>
            </div>
            
            <button
              onClick={handleSignMessage}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assinando...
                </>
              ) : (
                'Assinar Mensagem'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialLogin; 