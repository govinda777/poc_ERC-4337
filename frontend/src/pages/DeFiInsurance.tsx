import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import { toast } from 'react-toastify';

// Componentes
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import InfoBanner from '../components/common/InfoBanner';
import PriceDisplay from '../components/web3/PriceDisplay';
import AccountCreator from '../components/web3/AccountCreator';
import AssetDisplay from '../components/web3/AssetDisplay';

const DeFiInsurance = () => {
  const { 
    account, 
    isConnected, 
    hasSmartAccount, 
    smartAccountAddress, 
    createSmartAccount, 
    provider, 
    signer,
    getSmartAccountBalance 
  } = useWeb3Context();

  const [ethPrice, setEthPrice] = useState<number>(0);
  const [triggerPrice, setTriggerPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<string>('0.1');
  const [isLiquidated, setIsLiquidated] = useState<boolean>(false);
  const [accountBalance, setAccountBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastPriceCheck, setLastPriceCheck] = useState<string>('');
  const [rescueDestination, setRescueDestination] = useState<string>('');

  // Simular obtenção do preço do ETH de um oráculo
  useEffect(() => {
    const getEthPrice = async () => {
      // Em uma implementação real, buscaria o preço de um oráculo Chainlink
      const mockPrice = 2000 + Math.random() * 200;
      setEthPrice(mockPrice);
      
      // Triggar price é 20% abaixo do preço atual
      setTriggerPrice(mockPrice * 0.8);
    };
    
    getEthPrice();
    const interval = setInterval(getEthPrice, 30000); // Atualiza a cada 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  // Carregar dados da conta
  useEffect(() => {
    const loadAccountData = async () => {
      if (hasSmartAccount && smartAccountAddress && provider) {
        try {
          // Em uma implementação real, interagiria com o contrato real
          const balance = await getSmartAccountBalance();
          setAccountBalance(balance);
          
          // Simular status da conta (para demonstração)
          setIsLiquidated(false);
          setLastPriceCheck(new Date().toLocaleString());
          setRescueDestination(account || '');
        } catch (error) {
          console.error("Erro ao carregar dados da conta:", error);
        }
      }
    };
    
    loadAccountData();
  }, [hasSmartAccount, smartAccountAddress, provider, account, getSmartAccountBalance]);

  // Criar uma nova conta de seguro
  const handleCreateAccount = async () => {
    if (!isConnected || !account) {
      toast.error("Conecte sua carteira primeiro");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Parâmetros para criação da conta
      const params = {
        rescueDestination: account, // Usar o próprio endereço como destino de resgate
      };
      
      await createSmartAccount('deFiInsurance', params);
      toast.success("Conta de seguro DeFi criada com sucesso!");
      
      // Atualizar dados da conta
      const balance = await getSmartAccountBalance();
      setAccountBalance(balance);
      setIsLiquidated(false);
      setLastPriceCheck(new Date().toLocaleString());
      setRescueDestination(account);
    } catch (error) {
      console.error("Erro ao criar conta de seguro:", error);
      toast.error("Falha ao criar conta de seguro. Verifique o console para detalhes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Depositar ETH na conta de seguro
  const handleDeposit = async () => {
    if (!isConnected || !signer || !smartAccountAddress) {
      toast.error("Conecte sua carteira e crie uma conta de seguro primeiro");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Converter valor para Wei
      const amountWei = ethers.utils.parseEther(depositAmount);
      
      // Enviar ETH para a conta
      const tx = await signer.sendTransaction({
        to: smartAccountAddress,
        value: amountWei
      });
      
      await tx.wait();
      
      // Atualizar saldo
      const newBalance = await getSmartAccountBalance();
      setAccountBalance(newBalance);
      
      toast.success(`Depósito de ${depositAmount} ETH realizado com sucesso!`);
    } catch (error) {
      console.error("Erro ao depositar:", error);
      toast.error("Falha no depósito. Verifique o console para detalhes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Simular liquidação manual
  const handleManualLiquidation = async () => {
    if (!isConnected || !smartAccountAddress) {
      toast.error("Conecte sua carteira e crie uma conta de seguro primeiro");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Simulando chamada da função executeLiquidation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar estado local
      setIsLiquidated(true);
      setAccountBalance('0');
      
      toast.success("Liquidação executada com sucesso! Fundos enviados para o endereço de resgate.");
    } catch (error) {
      console.error("Erro ao executar liquidação:", error);
      toast.error("Falha na liquidação. Verifique o console para detalhes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar se a conta pode ser liquidada
  const handleCheckLiquidation = async () => {
    if (!isConnected || !smartAccountAddress) {
      toast.error("Conecte sua carteira e crie uma conta de seguro primeiro");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Simular verificação de condições de liquidação
      // Em uma implementação real, chamaria a função canBeLiquidated() no contrato
      const canLiquidate = ethPrice <= triggerPrice;
      setLastPriceCheck(new Date().toLocaleString());
      
      if (canLiquidate) {
        toast.warning("Condições de liquidação atingidas! A conta pode ser liquidada.");
      } else {
        toast.info("Condições de liquidação não atingidas. Seus fundos estão seguros.");
      }
    } catch (error) {
      console.error("Erro ao verificar liquidação:", error);
      toast.error("Erro ao verificar condições de liquidação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Seguro DeFi com Resgate Automático</h1>
      
      <InfoBanner
        type="info"
        title="Sobre o Seguro DeFi"
        message="Proteja seus investimentos contra quedas abruptas de preço. Seu ETH será automaticamente liquidado e enviado para um endereço seguro se o preço cair 20% em 24h."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Preços e métricas */}
        <Card title="Preços e Limites">
          <div className="space-y-4">
            <PriceDisplay
              label="Preço ETH Atual"
              value={ethPrice.toFixed(2)}
              currency="USD"
              change={+1.2}
              isLoading={false}
            />
            
            <PriceDisplay
              label="Preço de Liquidação (Trigger)"
              value={triggerPrice.toFixed(2)}
              currency="USD"
              isAlert={true}
              isLoading={false}
            />
            
            <div className="text-sm text-gray-500 mt-2">
              Última verificação: {lastPriceCheck || 'Nunca'}
            </div>
            
            <Button 
              onClick={handleCheckLiquidation}
              disabled={!hasSmartAccount || isLoading}
              variant="secondary"
              className="w-full mt-4"
            >
              Verificar Condições de Liquidação
            </Button>
          </div>
        </Card>
        
        {/* Status da conta */}
        <Card title="Status da Conta de Seguro">
          {!hasSmartAccount ? (
            <AccountCreator 
              onCreateAccount={handleCreateAccount}
              isLoading={isLoading}
              accountType="Seguro DeFi"
            />
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Endereço da Conta</div>
                <div className="font-mono text-sm truncate">
                  {smartAccountAddress}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Destino de Resgate</div>
                <div className="font-mono text-sm truncate">
                  {rescueDestination || account}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">
                    {isLiquidated ? (
                      <span className="text-red-500">Liquidado</span>
                    ) : (
                      <span className="text-green-500">Ativo</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Saldo</div>
                  <div className="font-medium">
                    {accountBalance} ETH
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Ações de depósito e liquidação */}
      {hasSmartAccount && !isLiquidated && (
        <Card title="Ações" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-2">
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700">
                  Quantidade a Depositar (ETH)
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <Button
                onClick={handleDeposit}
                disabled={isLoading}
                variant="primary"
                className="w-full"
              >
                Depositar ETH
              </Button>
            </div>
            
            <div>
              <div className="mb-2 text-sm text-gray-600">
                Liquidação manual só deve ser usada em emergências. O sistema detectará quedas de preço automaticamente.
              </div>
              
              <Button
                onClick={handleManualLiquidation}
                disabled={isLoading || ethPrice > triggerPrice}
                variant="danger"
                className="w-full"
              >
                Liquidação Manual
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Histórico de Liquidações (mockup) */}
      {isLiquidated && (
        <Card title="Histórico de Liquidação" className="mt-6">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800">Conta Liquidada</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Sua conta foi liquidada em {new Date().toLocaleString()}</p>
              <p className="mt-1">Preço de disparo: ${triggerPrice.toFixed(2)} USD</p>
              <p className="mt-1">Fundos resgatados: {accountBalance} ETH</p>
              <p className="mt-1">Enviados para: {rescueDestination || account}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateAccount}
            variant="primary"
            className="w-full mt-4"
          >
            Criar Nova Conta de Seguro
          </Button>
        </Card>
      )}
    </div>
  );
};

export default DeFiInsurance; 