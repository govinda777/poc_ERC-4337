# Frontend da POC ERC-4337

Interface web para interação com a implementação do ERC-4337, permitindo demonstrar todas as funcionalidades da Account Abstraction de forma intuitiva e visual.

## Tecnologias

- React 18
- TypeScript
- Ethers.js v6
- TailwindCSS
- Vite
- React Router
- Wagmi Hooks
- Rainbowkit

## Estrutura do Projeto

```
frontend/
├── public/            # Arquivos estaticos
├── src/
│   ├── assets/        # Imagens, ícones, etc.
│   ├── components/    # Componentes reutilizáveis
│   │   ├── common/    # Componentes genéricos (botões, inputs, etc.)
│   │   ├── layout/    # Componentes de layout (header, footer, etc.)
│   │   └── web3/      # Componentes específicos de web3
│   ├── config/        # Configurações (redes, contratos, etc.)
│   ├── context/       # Contextos React (AuthContext, Web3Context, etc.)
│   ├── hooks/         # Custom hooks
│   ├── pages/         # Páginas da aplicação
│   │   ├── Home/
│   │   ├── SocialLogin/
│   │   ├── DeFiInsurance/
│   │   ├── BatchPayments/
│   │   └── CorporateRecovery/
│   ├── services/      # Serviços para chamadas API, web3, etc.
│   ├── types/         # Definições de tipos TypeScript
│   ├── utils/         # Funções utilitárias
│   ├── App.tsx        # Componente principal
│   ├── main.tsx       # Ponto de entrada
│   └── index.css      # Estilos globais
├── .env.example       # Exemplo de variáveis de ambiente
├── package.json       # Dependências e scripts
└── vite.config.ts     # Configuração do Vite
```

## Como executar

1. Instale as dependências:

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

2. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

3. Execute em modo de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

4. Acesse a aplicação:

```
http://localhost:5173
```

## Scripts disponíveis

- `dev`: Executa o aplicativo em modo de desenvolvimento
- `build`: Compila o aplicativo para produção
- `preview`: Visualiza a versão de produção localmente
- `lint`: Executa a verificação de linting
- `test`: Executa os testes unitários

## Conexão com a blockchain

A aplicação se conecta aos contratos implementados na POC ERC-4337 através da biblioteca ethers.js e suporta as seguintes funcionalidades:

- Criação e gerenciamento de contas ERC-4337
- Login via provedores sociais (Google, Apple)
- Sistema de seguro DeFi com resgate automático
- Sistema de pagamentos em lote
- Recuperação de conta corporativa
- Monitoramento de transações e operações 