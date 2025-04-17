import React, { useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import BiometricAuth from '../components/BiometricAuth';
import GaslessTransaction from '../components/GaslessTransaction';
import MultiSigWallet from '../components/MultiSigWallet';
import RecurringPayments from '../components/RecurringPayments';

const Dashboard = () => {
  const { 
    isInitialized, 
    account, 
    smartWalletAddress,
    balance,
    smartWalletBalance,
    isConnecting,
    error,
    connectWallet,
    updateBalances
  } = useWeb3();
  
  // Atualizar saldos ao montar o componente
  useEffect(() => {
    if (isInitialized && account) {
      updateBalances();
    }
  }, [isInitialized, account, updateBalances]);
  
  if (isConnecting) {
    return (
      <div className="dashboard-container d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-3">Conectando à blockchain</p>
        </div>
      </div>
    );
  }
  
  if (!isInitialized || !account) {
    return (
      <div className="dashboard-container d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <div className="text-center">
          <h2>Conecte sua carteira</h2>
          <p>Para acessar o dashboard, conecte uma carteira Ethereum compatível.</p>
          <button 
            className="btn btn-primary btn-lg"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Conectando...' : 'Conectar Carteira'}
          </button>
          
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-container">
      <h1 className="text-center mb-4">Dashboard</h1>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h3>Informações da Carteira</h3>
            </div>
            <div className="card-body">
              <p><strong>Endereço EOA:</strong> {account}</p>
              <p id="wallet-balance"><strong>Saldo EOA:</strong> {balance} ETH</p>
              
              {smartWalletAddress ? (
                <>
                  <hr />
                  <p><strong>Endereço Smart Wallet:</strong> {smartWalletAddress}</p>
                  <p><strong>Saldo Smart Wallet:</strong> {smartWalletBalance} ETH</p>
                </>
              ) : (
                <p className="text-warning">Você ainda nao possui uma carteira inteligente.</p>
              )}
            </div>
            <div className="card-footer">
              <button 
                className="btn btn-outline-primary"
                onClick={updateBalances}
              >
                Atualizar Saldos
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header">
              <h3>Autenticacao Biométrica</h3>
            </div>
            <div className="card-body">
              {!smartWalletAddress && <BiometricAuth />}
              {smartWalletAddress && (
                <div className="alert alert-success">
                  <p>Sua carteira biométrica já esta configurada.</p>
                  <p>Endereço: {smartWalletAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3>Transações Sem Gas</h3>
            </div>
            <div className="card-body">
              {smartWalletAddress ? (
                <GaslessTransaction />
              ) : (
                <div className="alert alert-warning">
                  Você precisa criar uma carteira inteligente para usar transações sem gas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3>Carteira MultiSig</h3>
              <button 
                className="btn btn-sm btn-outline-secondary"
                data-bs-toggle="collapse" 
                data-bs-target="#multiSigSection"
                aria-expanded="false"
              >
                Expandir/Colapsar
              </button>
            </div>
            <div id="multiSigSection" className="collapse">
              <div className="card-body">
                {smartWalletAddress ? (
                  <MultiSigWallet />
                ) : (
                  <div className="alert alert-warning">
                    Você precisa criar uma carteira inteligente primeiro.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3>Pagamentos Recorrentes</h3>
              <button 
                className="btn btn-sm btn-outline-secondary"
                data-bs-toggle="collapse" 
                data-bs-target="#recurringPaymentsSection"
                aria-expanded="false"
              >
                Expandir/Colapsar
              </button>
            </div>
            <div id="recurringPaymentsSection" className="collapse">
              <div className="card-body">
                {smartWalletAddress ? (
                  <RecurringPayments />
                ) : (
                  <div className="alert alert-warning">
                    Você precisa criar uma carteira inteligente primeiro.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 id="transaction-history">Histórico de Transações</h3>
            </div>
            <div className="card-body">
              <p className="text-muted">O histórico de transações será implementado em breve.</p>
              {/* Tabela com histórico de transações */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 