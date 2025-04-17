import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Dashboard from './pages/Dashboard';
import './App.css';

// Placeholder pages - would be implemented in full app
const CreateAccount = () => (
  <div className="container mt-5">
    <h1>Criar Conta</h1>
    <p>Esta página será implementada em breve.</p>
  </div>
);

const Login = () => (
  <div className="container mt-5">
    <h1>Login</h1>
    <p>Esta página será implementada em breve.</p>
  </div>
);

const NotFound = () => (
  <div className="container mt-5 text-center">
    <h1>404 - Página nao Encontrada</h1>
    <p>A página que você procura nao existe.</p>
  </div>
);

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="app-container">
          <header className="app-header bg-dark text-white p-3">
            <div className="container">
              <div className="d-flex justify-content-between align-items-center">
                <h1 className="h3 mb-0">ERC-4337 Wallet</h1>
                <nav>
                  <a href="/" className="text-white me-3">Dashboard</a>
                  <a href="/create-account" className="text-white me-3">Criar Conta</a>
                  <a href="/login" className="text-white">Login</a>
                </nav>
              </div>
            </div>
          </header>
          
          <main className="app-content">
            <div className="container mt-4">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create-account" element={<CreateAccount />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
          
          <footer className="app-footer bg-light p-3 mt-5">
            <div className="container">
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-0">ERC-4337 Wallet &copy; 2023</p>
                </div>
                <div className="col-md-6 text-md-end">
                  <a href="https://github.com/govinda777/poc_ERC-4337" target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App; 