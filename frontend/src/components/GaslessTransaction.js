import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useSponsorPaymaster } from '../hooks/useSponsorPaymaster';

const GaslessTransaction = () => {
  const { account, smartWallet } = useWeb3();
  const { isSponsoredAccount, sendGaslessTransaction } = useSponsorPaymaster();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Verificar se a conta é patrocinada ao montar o componente
  }, [isSponsoredAccount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setStatus('sending');
      const tx = await sendGaslessTransaction(recipient, amount);
      setTxHash(tx.hash);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setError(error.message);
      console.error(error);
    }
  };

  return (
    <div className="gasless-transaction-container">
      <h2>Enviar Transação Sem Gas</h2>
      
      {!isSponsoredAccount && (
        <div className="alert alert-warning">
          Sua conta nao esta patrocinada. Transações exigirão ETH para gas.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="recipient-address">Endereço de Destino</label>
          <input
            id="recipient-address"
            className="form-control"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="transaction-amount">Valor (ETH)</label>
          <input
            id="transaction-amount"
            className="form-control"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.01"
            step="0.001"
            min="0"
            required
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Enviando...' : 'Enviar Transação'}
        </button>
      </form>
      
      {status === 'success' && (
        <div id="transaction-confirmation" className="alert alert-success mt-3">
          <p>Transação enviada com sucesso!</p>
          <p id="transaction-hash">Hash: {txHash}</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="alert alert-danger mt-3">
          <p>Erro ao enviar a transação: {error}</p>
          <p>Por favor, tente novamente.</p>
        </div>
      )}
    </div>
  );
};

export default GaslessTransaction; 