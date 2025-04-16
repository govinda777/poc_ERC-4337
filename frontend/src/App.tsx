import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createConfig } from 'wagmi';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { sepolia } from 'wagmi/chains';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { Web3ContextProvider } from './context/Web3Context';
import { UserOperationContextProvider } from './context/UserOperationContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import SocialLogin from './pages/SocialLogin';
import DeFiInsurance from './pages/DeFiInsurance';
import BatchPayments from './pages/BatchPayments';
import CorporateRecovery from './pages/CorporateRecovery';
import EntryPointExplorer from './pages/EntryPointExplorer';
import NotFound from './pages/NotFound';

// Configuração do Wagmi para integração com carteiras
const chains = [sepolia];
const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'POC ERC-4337',
    alchemyId: import.meta.env.VITE_ALCHEMY_API_KEY,
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    chains
  })
);

function App() {
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se o dispositivo é móvel para ajustar o layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <WagmiConfig config={wagmiConfig}>
      <ConnectKitProvider>
        <Web3ContextProvider>
          <UserOperationContextProvider>
            <Router>
              <div className="flex flex-col min-h-screen bg-gray-50">
                <Header />
                
                <div className="flex flex-1">
                  {!isMobile && <Sidebar />}
                  
                  <main className="flex-1 p-4">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/social-login" element={<SocialLogin />} />
                      <Route path="/defi-insurance" element={<DeFiInsurance />} />
                      <Route path="/batch-payments" element={<BatchPayments />} />
                      <Route path="/corporate-recovery" element={<CorporateRecovery />} />
                      <Route path="/entry-point-explorer" element={<EntryPointExplorer />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
                
                <Footer />
              </div>
            </Router>
            
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </UserOperationContextProvider>
        </Web3ContextProvider>
      </ConnectKitProvider>
    </WagmiConfig>
  );
}

export default App; 