import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useRecurringPayments } from '../hooks/useRecurringPayments';

const RecurringPayments = () => {
  const { account } = useWeb3();
  const { 
    createSubscription,
    getSubscriptions,
    cancelSubscription,
    modifySubscription,
    executeSubscription
  } = useRecurringPayments();
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [newSubscription, setNewSubscription] = useState({
    payee: '',
    amount: '',
    period: '30',
    startDate: null,
    endDate: null,
    data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Carregar assinaturas existentes
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        setIsLoading(true);
        const subs = await getSubscriptions();
        setSubscriptions(subs);
      } catch (err) {
        console.error('Erro ao carregar assinaturas:', err);
        setError('nao foi possível carregar suas assinaturas. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (account) {
      loadSubscriptions();
    }
  }, [account, getSubscriptions]);
  
  // Manipular criação de nova assinatura
  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      
      const periodInSeconds = parseInt(newSubscription.period) * 86400; // dias para segundos
      
      await createSubscription(
        newSubscription.payee,
        newSubscription.amount,
        periodInSeconds,
        newSubscription.startDate ? Math.floor(newSubscription.startDate.getTime() / 1000) : 0,
        newSubscription.endDate ? Math.floor(newSubscription.endDate.getTime() / 1000) : 0,
        newSubscription.data || '0x'
      );
      
      // Recarregar assinaturas
      const subs = await getSubscriptions();
      setSubscriptions(subs);
      
      // Limpar formulário
      setNewSubscription({
        payee: '',
        amount: '',
        period: '30',
        startDate: null,
        endDate: null,
        data: ''
      });
      
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      setError(error.message || 'Erro ao criar assinatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manipular cancelamento de assinatura
  const handleCancelSubscription = async (id) => {
    try {
      setIsLoading(true);
      await cancelSubscription(id);
      
      // Recarregar assinaturas após cancelamento
      const subs = await getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      setError(error.message || 'Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manipular execução manual de pagamento
  const handleExecuteSubscription = async (id) => {
    try {
      setIsLoading(true);
      await executeSubscription(id);
      
      // Recarregar assinaturas após execução
      const subs = await getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Erro ao executar pagamento:', error);
      setError(error.message || 'Erro ao executar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Converter timestamp para data formatada
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };
  
  return (
    <div className="recurring-payments-container">
      <h2>Pagamentos Recorrentes</h2>
      
      <div className="card mb-4">
        <div className="card-header">
          <h3>Nova Assinatura</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreateSubscription}>
            <div className="form-group mb-3">
              <label htmlFor="payee">Endereço do Beneficiário</label>
              <input
                id="payee"
                type="text"
                className="form-control"
                value={newSubscription.payee}
                onChange={(e) => setNewSubscription({...newSubscription, payee: e.target.value})}
                placeholder="0x..."
                required
              />
            </div>
            
            <div className="form-group mb-3">
              <label htmlFor="amount">Valor (ETH)</label>
              <input
                id="amount"
                type="number"
                className="form-control"
                value={newSubscription.amount}
                onChange={(e) => setNewSubscription({...newSubscription, amount: e.target.value})}
                placeholder="0.1"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div className="form-group mb-3">
              <label htmlFor="period">Período</label>
              <select
                id="period"
                className="form-control"
                value={newSubscription.period}
                onChange={(e) => setNewSubscription({...newSubscription, period: e.target.value})}
              >
                <option value="1">diario</option>
                <option value="7">Semanal</option>
                <option value="30">Mensal</option>
                <option value="365">Anual</option>
              </select>
            </div>
            
            <div className="form-group mb-3">
              <label htmlFor="startDate">Data de Início (opcional)</label>
              <input
                id="startDate"
                type="date"
                className="form-control"
                value={newSubscription.startDate ? newSubscription.startDate.toISOString().substring(0, 10) : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setNewSubscription({...newSubscription, startDate: date});
                }}
              />
            </div>
            
            <div className="form-group mb-3">
              <label htmlFor="endDate">Data de Término (opcional)</label>
              <input
                id="endDate"
                type="date"
                className="form-control"
                value={newSubscription.endDate ? newSubscription.endDate.toISOString().substring(0, 10) : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null;
                  setNewSubscription({...newSubscription, endDate: date});
                }}
              />
            </div>
            
            <div className="form-group mb-3">
              <label htmlFor="data">Dados (opcional, em hex)</label>
              <input
                id="data"
                type="text"
                className="form-control"
                value={newSubscription.data}
                onChange={(e) => setNewSubscription({...newSubscription, data: e.target.value})}
                placeholder="0x"
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Criar Assinatura"}
            </button>
          </form>
          
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>Assinaturas Ativas</h3>
        </div>
        <div className="card-body">
          {isLoading && (
            <div className="text-center my-3">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          )}
          
          {subscriptions.length === 0 && !isLoading ? (
            <p>Nenhuma assinatura encontrada.</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Beneficiário</th>
                    <th>Valor</th>
                    <th>Período</th>
                    <th>Próximo Pagamento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(sub => (
                    <tr key={sub.id}>
                      <td>{sub.id}</td>
                      <td>{sub.payee.substring(0, 10)}...</td>
                      <td>{sub.amount} ETH</td>
                      <td>{sub.period / 86400} dias</td>
                      <td>{formatDate(sub.nextPayment)}</td>
                      <td>{sub.active ? 'Ativa' : 'Inativa'}</td>
                      <td>
                        {sub.active && (
                          <>
                            <button 
                              className="btn btn-sm btn-primary me-2" 
                              onClick={() => handleExecuteSubscription(sub.id)} 
                              disabled={isLoading}
                            >
                              Executar
                            </button>
                            <button 
                              className="btn btn-sm btn-danger" 
                              onClick={() => handleCancelSubscription(sub.id)} 
                              disabled={isLoading}
                            >
                              Cancelar
                            </button>
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
    </div>
  );
};

export default RecurringPayments; 