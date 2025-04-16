import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConnectKitButton } from 'connectkit';
import { HiMenu, HiX } from 'react-icons/hi';
import { useWeb3Context } from '../../context/Web3Context';

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { hasSmartAccount, smartAccountAddress } = useWeb3Context();

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo e título */}
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center">
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span className="ml-2 text-xl font-bold">POC ERC-4337</span>
            </Link>
          </div>

          {/* Links de navegação - visíveis apenas em telas maiores */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/social-login" className="hover:text-indigo-200 transition duration-200">
              Login Social
            </Link>
            <Link to="/defi-insurance" className="hover:text-indigo-200 transition duration-200">
              Seguro DeFi
            </Link>
            <Link to="/batch-payments" className="hover:text-indigo-200 transition duration-200">
              Pagamentos em Lote
            </Link>
            <Link to="/corporate-recovery" className="hover:text-indigo-200 transition duration-200">
              Recuperação
            </Link>
          </div>

          {/* Área de conexão e smart account */}
          <div className="flex items-center space-x-3">
            {hasSmartAccount && (
              <div className="hidden md:flex items-center bg-indigo-700 bg-opacity-40 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                <span className="text-xs font-medium truncate max-w-[100px]" title={smartAccountAddress}>
                  {smartAccountAddress?.substring(0, 6)}...{smartAccountAddress?.substring(smartAccountAddress.length - 4)}
                </span>
              </div>
            )}
            
            <ConnectKitButton />
            
            {/* Botão do menu mobile */}
            <button
              className="md:hidden text-white focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-2 pb-3">
            <Link
              to="/social-login"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-indigo-500 transition duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Login Social
            </Link>
            <Link
              to="/defi-insurance"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-indigo-500 transition duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Seguro DeFi
            </Link>
            <Link
              to="/batch-payments"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-indigo-500 transition duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pagamentos em Lote
            </Link>
            <Link
              to="/corporate-recovery"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-indigo-500 transition duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Recuperação
            </Link>
            
            {hasSmartAccount && (
              <div className="flex items-center bg-indigo-700 bg-opacity-40 px-3 py-2 rounded-md">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                <span className="text-xs font-medium truncate" title={smartAccountAddress}>
                  Smart Account: {smartAccountAddress?.substring(0, 6)}...{smartAccountAddress?.substring(smartAccountAddress.length - 4)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}; 