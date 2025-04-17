import React, { useEffect, useState } from 'react';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

const BiometricAuth = () => {
  const { isSupported, isChecking, registerBiometric, authenticate } = useBiometricAuth();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verificar compatibilidade ao montar o componente
  }, []);

  const handleRegister = async () => {
    try {
      setStatus('registering');
      await registerBiometric();
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setError(error.message);
      console.error(error);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setStatus('authenticating');
      await authenticate();
      setStatus('authenticated');
    } catch (error) {
      setStatus('error');
      setError(error.message);
      console.error(error);
    }
  };

  if (isChecking) {
    return (
      <div className="biometric-auth-container">
        <div className="loading-spinner"></div>
        <p>Verificando compatibilidade do dispositivo...</p>
      </div>
    );
  }

  return (
    <div className="biometric-auth-container">
      <div id="compatibility-message">
        {!isSupported && (
          <div className="alert alert-warning">
            Seu dispositivo não suporta autenticação biométrica. 
            Por favor, use outro método de autenticação.
          </div>
        )}
        
        {isSupported && status === 'idle' && (
          <div className="alert alert-success">
            Seu dispositivo suporta autenticação biométrica.
          </div>
        )}
      </div>
      
      {isSupported && status === 'idle' && (
        <button 
          className="btn btn-primary btn-lg" 
          onClick={handleRegister}
        >
          Criar Conta com Biometria
        </button>
      )}
      
      {status === 'registering' && (
        <div className="auth-process">
          <div className="loading-spinner"></div>
          <p>Processando autenticação biométrica...</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="alert alert-success">
          <p>Conta registrada com sucesso!</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.href = '/dashboard'}
          >
            Ir para Dashboard
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="alert alert-danger">
          <p>Erro ao registrar biometria: {error}</p>
          <button 
            className="btn btn-secondary" 
            onClick={() => setStatus('idle')}
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default BiometricAuth; 