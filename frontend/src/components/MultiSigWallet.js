import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useMultiSig } from '../hooks/useMultiSig';

const MultiSigWallet = () => {
  const { account } = useWeb3();
  const { 
    createMultiSig, 
    proposeTransaction, 
    confirmTransaction,
    executeTransaction,
    fetchTransactions,
    walletInfo 
  } = useMultiSig();
  
  const [owners, setOwners] = useState(['']);
  const [threshold, setThreshold] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [txLimit, setTxLimit] = useState(0.5);
  const [transactions, setTransactions] = useState([]);
  const [newTx, setNewTx] = useState({ destination: '', value: '', data: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (walletInfo && walletInfo.address) {
      loadTransactions();
    }
  }, [walletInfo]);
  
  const loadTransactions = async () => {
    try {
      const txList = await fetchTransactions();
      setTransactions(txList);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
      setError("nao foi possível carregar as transações. Tente novamente.");
    }
  };
  
  // Lógica para adicionar/remover proprietarios
  const addOwner = () => setOwners([...owners, '']);
  
  const removeOwner = (index) => {
    if (owners.length > 1) {
      const newOwners = [...owners];
      newOwners.splice(index, 1);
      setOwners(newOwners);
      
      // Ajuste o threshold para nao exceder o número de proprietarios
      if (threshold > newOwners.length) {
        setThreshold(newOwners.length);
      }
    }
  };
  
  // Lógica para atualizar endereço do proprietario
  const updateOwner = (index, address) => {
    const newOwners = [...owners];
    newOwners[index] = address;
    setOwners(newOwners);
  };
  
  // Criar carteira MultiSig
  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const validOwners = owners.filter(o => o !== '');
      
      if (validOwners.length < threshold) {
        throw new Error("O número de proprietarios nao pode ser menor que o threshold");
      }
      
      await createMultiSig(
        validOwners,
        threshold,
        dailyLimit,
        txLimit
      );
      
      // Resetar o formulário após criação bem-sucedida
      setOwners(['']);
      setThreshold(1);
      setDailyLimit(1);
      setTxLimit(0.5);
    } catch (err) {
      console.error("Erro ao criar carteira MultiSig:", err);
      setError(err.message || "Erro ao criar carteira MultiSig");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Propor nova transação
  const handleProposeTransaction = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await proposeTransaction(
        newTx.destination,
        newTx.value,
        newTx.data || '0x'
      );
      
      // Limpar formulário e recarregar transações
      setNewTx({ destination: '', value: '', data: '' });
      await loadTransactions();
    } catch (err) {
      console.error("Erro ao propor transação:", err);
      setError(err.message || "Erro ao propor transação");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Componente para criação de carteira
  const CreateWalletForm = () => (
    <div className="card mb-4">
      <div className="card-header">
        <h3>Criar Nova Carteira MultiSig</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleCreate}>
          <div className="form-group mb-3">
            <label>proprietarios</label>
            {owners.map((owner, index) => (
              <div key={index} className="input-group mb-2">
                <input 
                  type="text" 
                  className="form-control"
                  value={owner}
                  onChange={(e) => updateOwner(index, e.target.value)}
                  placeholder="Endereço do proprietario"
                />
                <button 
                  type="button" 
                  className="btn btn-outline-danger"
                  onClick={() => removeOwner(index)}
                  disabled={owners.length <= 1}
                >
                  Remover
                </button>
              </div>
            ))}
            <button 
              type="button" 
              className="btn btn-outline-primary"
              onClick={addOwner}
            >
              Adicionar proprietario
            </button>
          </div>
          
          <div className="form-group mb-3">
            <label htmlFor="threshold">Threshold (assinaturas necessárias)</label>
            <input 
              type="number" 
              id="threshold"
              className="form-control"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              min="1"
              max={owners.length}
            />
          </div>
          
          <div className="form-group mb-3">
            <label htmlFor="dailyLimit">Limite diario (ETH)</label>
            <input 
              type="number" 
              id="dailyLimit"
              className="form-control"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseFloat(e.target.value))}
              min="0"
              step="0.1"
            />
          </div>
          
          <div className="form-group mb-3">
            <label htmlFor="txLimit">Limite por Transação (ETH)</label>
            <input 
              type="number" 
              id="txLimit"
              className="form-control"
              value={txLimit}
              onChange={(e) => setTxLimit(parseFloat(e.target.value))}
              min="0"
              step="0.1"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Criando..." : "Criar Carteira MultiSig"}
          </button>
          
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
  
  // Componente para propor nova transação
  const ProposeTransactionForm = () => (
    <div className="card mb-4">
      <div className="card-header">
        <h3>Propor Nova Transação</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleProposeTransaction}>
          <div className="form-group mb-3">
            <label htmlFor="tx-destination">Endereço de Destino</label>
            <input
              id="tx-destination"
              type="text"
              className="form-control"
              value={newTx.destination}
              onChange={(e) => setNewTx({...newTx, destination: e.target.value})}
              placeholder="0x..."
              required
            />
          </div>
          
          <div className="form-group mb-3">
            <label htmlFor="tx-value">Valor (ETH)</label>
            <input
              id="tx-value"
              type="number"
              className="form-control"
              value={newTx.value}
              onChange={(e) => setNewTx({...newTx, value: e.target.value})}
              placeholder="0.1"
              step="0.01"
              min="0"
              required
            />
          </div>
          
          <div className="form-group mb-3">
            <label htmlFor="tx-data">Dados (opcional, em hex)</label>
            <input
              id="tx-data"
              type="text"
              className="form-control"
              value={newTx.data}
              onChange={(e) => setNewTx({...newTx, data: e.target.value})}
              placeholder="0x"
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Propor Transação"}
          </button>
        </form>
      </div>
    </div>
  );
  
  // Componente para listar transações pendentes
  const TransactionsList = () => (
    <div className="card">
      <div className="card-header">
        <h3>Transações Pendentes</h3>
      </div>
      <div className="card-body">
        {transactions.length === 0 ? (
          <p>Nenhuma transação pendente encontrada.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Destino</th>
                  <th>Valor</th>
                  <th>Confirmações</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.destination.substring(0, 10)}...</td>
                    <td>{tx.value} ETH</td>
                    <td>{tx.confirmations}/{threshold}</td>
                    <td>{tx.executed ? "Executada" : "Pendente"}</td>
                    <td>
                      {!tx.executed && (
                        <>
                          {!tx.confirmed && (
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => confirmTransaction(tx.id)}
                              disabled={isLoading}
                            >
                              Confirmar
                            </button>
                          )}
                          
                          {tx.confirmations >= threshold && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => executeTransaction(tx.id)}
                              disabled={isLoading}
                            >
                              Executar
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="multisig-wallet-container">
      <h2>Carteira MultiSig</h2>
      
      {!walletInfo ? <CreateWalletForm /> : (
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <h3>Informações da Carteira</h3>
            </div>
            <div className="card-body">
              <p><strong>Endereço:</strong> {walletInfo.address}</p>
              <p><strong>Threshold:</strong> {walletInfo.threshold}</p>
              <p><strong>proprietarios:</strong> {walletInfo.owners.length}</p>
              <p><strong>Limite diario:</strong> {walletInfo.dailyLimit} ETH</p>
              <p><strong>Limite por Transação:</strong> {walletInfo.transactionLimit} ETH</p>
            </div>
          </div>
          
          <ProposeTransactionForm />
          <TransactionsList />
        </div>
      )}
    </div>
  );
};

export default MultiSigWallet; 