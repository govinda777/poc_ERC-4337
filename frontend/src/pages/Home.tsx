import { Link } from 'react-router-dom';
import { FaWallet, FaShieldAlt, FaLayerGroup, FaUsers, FaServer } from 'react-icons/fa';
import { useWeb3Context } from '../context/Web3Context';

const Home = () => {
  const { isConnected, account, hasSmartAccount, smartAccountAddress } = useWeb3Context();

  const features = [
    {
      id: 'social-login',
      name: 'Login Social',
      description: 'Autenticação via Google/Apple sem seed phrases.',
      icon: <FaWallet className="w-10 h-10 text-indigo-500" />,
      path: '/social-login',
      color: 'bg-indigo-50 border-indigo-200',
    },
    {
      id: 'defi-insurance',
      name: 'Seguro DeFi',
      description: 'Proteção automática contra quedas de preço.',
      icon: <FaShieldAlt className="w-10 h-10 text-green-500" />,
      path: '/defi-insurance',
      color: 'bg-green-50 border-green-200',
    },
    {
      id: 'batch-payments',
      name: 'Pagamentos em Lote',
      description: 'Execute múltiplas transações em uma operação.',
      icon: <FaLayerGroup className="w-10 h-10 text-purple-500" />,
      path: '/batch-payments',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'corporate-recovery',
      name: 'Recuperação Corporativa',
      description: 'Multisig 3/5 com sistema de recuperação avançado.',
      icon: <FaUsers className="w-10 h-10 text-blue-500" />,
      path: '/corporate-recovery',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'entry-point-explorer',
      name: 'Explorer EntryPoint',
      description: 'Visualize transações e operações no EntryPoint.',
      icon: <FaServer className="w-10 h-10 text-red-500" />,
      path: '/entry-point-explorer',
      color: 'bg-red-50 border-red-200',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-10 text-white shadow-lg">
        <h1 className="text-4xl font-bold mb-4">POC ERC-4337: Account Abstraction</h1>
        <p className="text-xl mb-6">
          Implementação completa do padrão ERC-4337 demonstrando casos de uso práticos,
          interfaces intuitivas e integração com Account Abstraction.
        </p>
        
        {/* Status do usuário */}
        <div className="mt-6 bg-white bg-opacity-10 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Seu Status</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white bg-opacity-10 rounded-lg p-3">
              <div className="text-sm opacity-80">Wallet EOA</div>
              <div className="font-mono text-sm truncate">
                {isConnected ? account : 'Não conectado'}
              </div>
            </div>
            <div className="flex-1 bg-white bg-opacity-10 rounded-lg p-3">
              <div className="text-sm opacity-80">Smart Account</div>
              <div className="font-mono text-sm truncate">
                {hasSmartAccount ? smartAccountAddress : 'Não criada'}
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          {!isConnected ? (
            <button
              className="py-3 px-6 bg-white text-indigo-600 rounded-lg font-medium shadow-md hover:bg-opacity-90 transition-all"
              onClick={() => document.getElementById('connect-wallet-btn')?.click()}
            >
              Conectar Carteira
            </button>
          ) : !hasSmartAccount ? (
            <Link
              to="/defi-insurance"
              className="py-3 px-6 bg-white text-indigo-600 rounded-lg font-medium shadow-md hover:bg-opacity-90 transition-all text-center"
            >
              Criar Smart Account
            </Link>
          ) : (
            <Link
              to="/entry-point-explorer"
              className="py-3 px-6 bg-white text-indigo-600 rounded-lg font-medium shadow-md hover:bg-opacity-90 transition-all text-center"
            >
              Explorar Funcionalidades
            </Link>
          )}
          
          <a
            href="https://github.com/ethereum/ercs/blob/master/ERCS/erc-4337.md"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-6 border border-white text-white rounded-lg font-medium hover:bg-white hover:bg-opacity-10 transition-all text-center"
          >
            Documentação ERC-4337
          </a>
        </div>
      </div>
      
      {/* Destaques */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Casos de Uso Implementados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link 
              key={feature.id}
              to={feature.path}
              className={`border rounded-xl p-6 ${feature.color} transition-all hover:shadow-md`}
            >
              <div className="flex flex-col h-full">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.name}</h3>
                <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
                <div className="text-indigo-600 font-medium">
                  Explorar &rarr;
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Diagrama */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Arquitetura ERC-4337</h2>
        <div className="border rounded-xl p-6 bg-gray-50">
          <div className="relative overflow-auto">
            <div className="flex flex-col items-center text-center">
              {/* Diagrama simplificado */}
              <div className="w-full max-w-3xl">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="font-medium">Aplicação</div>
                    <div className="text-sm text-gray-600">SDK Cliente</div>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="font-medium">Bundle</div>
                    <div className="text-sm text-gray-600">UserOperation</div>
                  </div>
                  <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="font-medium">Mempool Alt.</div>
                    <div className="text-sm text-gray-600">P2P UserOps</div>
                  </div>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="h-10 border-l-2 border-dashed border-gray-400"></div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="bg-purple-100 border border-purple-200 rounded-lg p-3">
                    <div className="font-medium">EntryPoint</div>
                    <div className="text-sm text-gray-600">Singleton Contrato</div>
                  </div>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="h-10 border-l-2 border-dashed border-gray-400"></div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                    <div className="font-medium">Smart Accounts</div>
                    <div className="text-sm text-gray-600">Contas Inteligentes</div>
                  </div>
                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
                    <div className="font-medium">Paymaster</div>
                    <div className="text-sm text-gray-600">Patrocínio de Taxas</div>
                  </div>
                  <div className="bg-indigo-100 border border-indigo-200 rounded-lg p-3">
                    <div className="font-medium">Aggregator</div>
                    <div className="text-sm text-gray-600">Verificação em Lote</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Vantagens */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Vantagens da Account Abstraction</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-xl p-6 bg-indigo-50">
            <h3 className="text-xl font-bold mb-3">Para Usuários</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Login via redes sociais sem seed phrases</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Pagamento de taxas em tokens (ERC-20)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Mecanismos avançados de recuperação</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Transações em lote com economia de gas</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Automações programáveis como liquidações</span>
              </li>
            </ul>
          </div>
          
          <div className="border rounded-xl p-6 bg-purple-50">
            <h3 className="text-xl font-bold mb-3">Para Desenvolvedores</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Melhoria na UX sem alterações no protocolo</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Lógica de validação personalizada por aplicação</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Modelos de patrocínio de taxas para onboarding</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Lógica de segurança personalizada por conta</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Suporte a plugins e extensibilidade</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 