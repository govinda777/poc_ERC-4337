## Diagrama de Classes

Nessa seção, você encontrará diagramas que representam as principais estruturas do projeto ERC-4337.

### Diagrama de Classes do Projeto ERC-4337

```mermaid
classDiagram
    %% Core Account Abstraction
    class EntryPoint {
        +handleOps(UserOperation[] ops)
        +depositTo(address account)
    }
    
    %% Base Accounts
    class BaseAccount {
        <<abstract>>
        +validateUserOp(UserOperation userOp, bytes32 userOpHash) returns (uint256)
        +getNonce() returns (uint256)
    }
    
    %% Auction Related Contracts
    class NFTAuction {
        +Auction[] auctions
        +uint256 auctionCounter
        +IERC20 governanceToken
        +createAuction(address nftContract, uint256 tokenId, uint256 minEthAmount, uint256 minTokenAmount, uint256 duration)
        +placeBid(uint256 auctionId, uint256 tokenAmount)
        +endAuction(uint256 auctionId)
        +claimNFT(uint256 auctionId)
        +claimFunds(uint256 auctionId)
    }
    
    class AccountFactory {
        +EntryPoint entryPoint
        +mapping(address => bool) accountCreated
        +createAccount(address owner, uint256 salt) returns (address)
        +getAddress(address owner, bytes32 salt) returns (address)
    }
    
    class AuctionAccount {
        +IEntryPoint _entryPoint
        +uint256 _nonce
        +execute(address dest, uint256 value, bytes func)
        +executeBatch(address[] dest, uint256[] value, bytes[] func)
        +placeBid(address auction, uint256 nftId, uint256 ethAmount, address governanceToken, uint256 tokenAmount)
        +withdrawEther(address payable recipient, uint256 amount)
        +withdrawTokens(address token, address recipient, uint256 amount)
        +onERC721Received(address operator, address from, uint256 tokenId, bytes data)
    }
    
    %% Other Account Types
    class BiometricAuthAccount {
        +IEntryPoint _entryPoint
        +bytes32[] biometricHashes
        +address[] recoveryAddresses
        +authenticate(bytes biometricData)
        +recoverAccount(bytes32 newBiometricHash)
    }
    
    class SocialRecoveryAccount {
        +IEntryPoint _entryPoint
        +address[] guardians
        +uint256 threshold
        +initiateRecovery(address newOwner)
        +approveRecovery(address newOwner)
        +executeRecovery(address newOwner)
    }
    
    class MultiSigAccount {
        +IEntryPoint _entryPoint
        +address[] signers
        +uint256 threshold
        +proposeTransaction(address dest, uint256 value, bytes data)
        +approveTransaction(uint256 txId)
        +executeTransaction(uint256 txId)
    }
    
    class RecurringPaymentAccount {
        +IEntryPoint _entryPoint
        +mapping paymentSchedules
        +addPaymentSchedule(address receiver, uint256 amount, uint256 interval)
        +executeScheduledPayment(uint256 scheduleId)
        +cancelPaymentSchedule(uint256 scheduleId)
    }

    %% Factory Contracts
    class BiometricAuthAccountFactory {
        +EntryPoint entryPoint
        +createAccount(address owner, bytes32 biometricHash, uint256 salt)
    }
    
    class SocialRecoveryAccountFactory {
        +EntryPoint entryPoint
        +createAccount(address owner, address[] guardians, uint256 threshold, uint256 salt)
    }
    
    class MultiSigAccountFactory {
        +EntryPoint entryPoint
        +createAccount(address[] signers, uint256 threshold, uint256 salt)
    }
    
    class RecurringPaymentAccountFactory {
        +EntryPoint entryPoint
        +createAccount(address owner, uint256 salt)
    }
    
    %% NFT Related Contracts
    class SimpleNFT {
        +mint(address to, string tokenURI)
        +burn(uint256 tokenId)
    }
    
    class AuctionNFT {
        +mint(address to, string tokenURI, uint256 startingPrice)
        +getStartingPrice(uint256 tokenId)
    }
    
    %% Token Contract
    class GovernanceToken {
        +mint(address to, uint256 amount)
        +burn(address from, uint256 amount)
    }
    
    %% Relationships
    BaseAccount <|-- AuctionAccount
    BaseAccount <|-- BiometricAuthAccount
    BaseAccount <|-- SocialRecoveryAccount
    BaseAccount <|-- MultiSigAccount
    BaseAccount <|-- RecurringPaymentAccount
    
    AccountFactory --> AuctionAccount : creates
    BiometricAuthAccountFactory --> BiometricAuthAccount : creates
    SocialRecoveryAccountFactory --> SocialRecoveryAccount : creates
    MultiSigAccountFactory --> MultiSigAccount : creates
    RecurringPaymentAccountFactory --> RecurringPaymentAccount : creates
    
    AuctionAccount --> NFTAuction : interacts
    NFTAuction --> SimpleNFT : manages
    NFTAuction --> AuctionNFT : manages
    NFTAuction --> GovernanceToken : uses
    
    EntryPoint --> BaseAccount : validates & calls
```

## Diagramas de Sequência para ERC-4337

Esta seção contém diagramas de sequência para os principais componentes e fluxos do projeto ERC-4337.

### 1. Fundamentos ERC-4337: Fluxo de Transação

```mermaid
sequenceDiagram
    actor User
    participant Wallet as Carteira (Dapp)
    participant Bundler
    participant EntryPoint
    participant Account as Smart Account
    participant Destination as Contrato Destino
    
    User->>Wallet: Solicita transação
    Wallet->>Wallet: Cria UserOperation
    Wallet->>Wallet: Assina UserOperation
    Wallet->>Bundler: Envia eth_sendUserOperation
    Bundler->>EntryPoint: Simula validateUserOp()
    EntryPoint->>Account: validateUserOp()
    Account->>Account: Verifica assinatura
    Account-->>EntryPoint: Resultado da validação
    EntryPoint-->>Bundler: Resultado da simulação
    
    Bundler->>Bundler: Agrupa UserOperations
    Bundler->>EntryPoint: handleOps([UserOperation])
    EntryPoint->>Account: validateUserOp()
    Account-->>EntryPoint: Ok
    EntryPoint->>Account: execute()
    Account->>Destination: Chama função alvo
    Destination-->>Account: Resultado
    Account-->>EntryPoint: Resultado
    EntryPoint-->>Bundler: Transação completa
    Bundler-->>Wallet: Recibo da operação
    Wallet-->>User: Notifica conclusão
```

### 2. Config: Processo de Deployment de Smart Accounts

```mermaid
sequenceDiagram
    actor Developer
    participant IDE as Ambiente Desenvolvimento
    participant Hardhat
    participant Config as Configuração
    participant Network as Rede Blockchain
    participant Explorer as Block Explorer
    
    Developer->>IDE: Configura ambiente
    Developer->>Config: Define .env e variáveis
    Developer->>Config: Configura networks em hardhat.config.js
    
    Developer->>Hardhat: Inicia deployment
    Hardhat->>Config: Carrega configurações
    Hardhat->>Network: Deploy EntryPoint
    Network-->>Hardhat: Endereço EntryPoint
    
    Hardhat->>Network: Deploy AccountFactory
    Network-->>Hardhat: Endereço AccountFactory
    
    Hardhat->>Network: Deploy Paymaster
    Network-->>Hardhat: Endereço Paymaster
    
    Hardhat->>Network: Configura relações entre contratos
    Network-->>Hardhat: Confirmação
    
    Hardhat-->>Developer: Log de deployment
    Developer->>Explorer: Verifica contratos
    Explorer-->>Developer: Mostra contratos verificados
    
    Developer->>Config: Salva endereços no config
```

### 3. Contratos Inteligentes: Criação e Uso de Smart Account

```mermaid
sequenceDiagram
    actor User
    participant Client as Cliente Web/Mobile
    participant Factory as AccountFactory
    participant SmartAccount
    participant EntryPoint
    participant Paymaster
    
    User->>Client: Solicita criação de conta
    Client->>Client: Gera chaves
    Client->>Factory: createAccount(owner, salt)
    Factory->>Factory: getAddress(owner, salt)
    Factory->>Factory: Verifica se conta já existe
    
    alt Conta nao existe
        Factory->>SmartAccount: CREATE2 deploy
        SmartAccount->>SmartAccount: Inicializa
        SmartAccount-->>Factory: Conta criada
    else Conta já existe
        Factory->>Factory: Retorna endereço existente
    end
    
    Factory-->>Client: Endereço da Smart Account
    Client-->>User: Conta pronta para uso
    
    User->>Client: Solicita transação
    Client->>Client: Cria UserOperation
    Client->>Client: Configura paymasterAndData
    Client->>Paymaster: Solicita patrocínio
    Paymaster->>Paymaster: Valida condições (subsídio/token)
    Paymaster-->>Client: Dados de patrocínio
    
    Client->>EntryPoint: eth_sendUserOperation
    EntryPoint->>SmartAccount: validateUserOp
    SmartAccount-->>EntryPoint: Validação OK
    EntryPoint->>SmartAccount: execute
    SmartAccount-->>EntryPoint: Resultado
    EntryPoint-->>Client: Transação concluída
    Client-->>User: Notifica conclusão
```

### 4. Implementações Práticas: Carteira com Login Social

```mermaid
sequenceDiagram
    actor User
    participant MobileApp as App Móvel
    participant AuthServer as Servidor Auth
    participant Factory as SocialLoginAccountFactory
    participant SocialAccount as SocialLoginAccount
    participant EntryPoint
    participant Target as Contrato Destino
    
    User->>MobileApp: Login com Google
    MobileApp->>AuthServer: Solicita Autenticacao
    AuthServer->>AuthServer: Verifica credenciais
    AuthServer-->>MobileApp: Retorna JWT
    
    MobileApp->>AuthServer: Solicita criação de conta
    AuthServer->>Factory: createAccount(userID, salt)
    Factory->>SocialAccount: Deploy via CREATE2
    SocialAccount-->>Factory: Conta criada
    Factory-->>AuthServer: Endereço da conta
    AuthServer-->>MobileApp: Detalhes da conta
    
    User->>MobileApp: Solicita transação
    MobileApp->>AuthServer: Envia detalhes da transação
    AuthServer->>AuthServer: Cria UserOperation
    AuthServer->>AuthServer: Assina com JWT/proof
    
    AuthServer->>EntryPoint: eth_sendUserOperation
    EntryPoint->>SocialAccount: validateUserOp
    SocialAccount->>SocialAccount: Verifica JWT/proof
    SocialAccount-->>EntryPoint: Validação OK
    
    EntryPoint->>SocialAccount: execute(target, value, data)
    SocialAccount->>Target: Executa ação 
    Target-->>SocialAccount: Resultado
    SocialAccount-->>EntryPoint: Resultado
    EntryPoint-->>AuthServer: Confirmação
    AuthServer-->>MobileApp: Notifica sucesso
    MobileApp-->>User: Mostra confirmação
```

### 5. Bundler e Infraestrutura: Processamento de UserOperation

```mermaid
sequenceDiagram
    participant Client as Cliente (Dapp/SDK)
    participant RPC as Endpoint RPC
    participant Mempool as Mempool Alt
    participant Bundler
    participant Blockchain
    participant EntryPoint
    participant Monitoring as Sistema Monitoramento
    
    Client->>RPC: eth_sendUserOperation
    RPC->>RPC: Validação básica
    RPC->>Mempool: Armazena UserOperation
    Mempool-->>RPC: Aceito para processamento
    RPC-->>Client: Operação recebida
    
    loop Processo Contínuo
        Bundler->>Mempool: Busca operações pendentes
        Mempool-->>Bundler: Lista de UserOperations
        Bundler->>Bundler: Simula operações
        Bundler->>Bundler: Seleciona operações viáveis
        Bundler->>Bundler: Agrupa em lote
        
        Bundler->>Blockchain: Submete handleOps([UserOperations])
        Blockchain->>EntryPoint: Executa handleOps
        EntryPoint-->>Blockchain: Resultado
        Blockchain-->>Bundler: Transação minerada
        
        Bundler->>Mempool: Atualiza status
        Bundler->>Monitoring: Envia métricas
    end
    
    Client->>RPC: eth_getUserOperationReceipt
    RPC->>Mempool: Busca status
    Mempool-->>RPC: Status da operação
    RPC-->>Client: Recibo ou status
    
    Monitoring->>Monitoring: Agrega dados
    Monitoring->>Monitoring: Gera alertas (se necessário)
```

### 6. Integrações: Frontend Web3 com Account Abstraction

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Frontend Web3
    participant SDK as ERC-4337 SDK
    participant Backend as Backend Service
    participant Bundler as Bundler Node
    participant EntryPoint
    participant SmartAccount
    
    User->>Frontend: Conecta carteira
    Frontend->>SDK: initializeAccount()
    SDK->>Backend: Solicita detalhes do usuário
    Backend-->>SDK: Info do usuário (smart account)
    SDK-->>Frontend: Carteira iniciada
    
    User->>Frontend: Interage com DApp
    Frontend->>SDK: createUserOp(target, data)
    SDK->>SDK: Constrói UserOperation
    
    alt Tem subsídio de gas
        SDK->>Backend: Solicita patrocínio
        Backend->>Backend: Verifica elegibilidade
        Backend-->>SDK: Retorna paymasterAndData
    else Sem subsídio
        SDK->>SDK: Configura para pagamento direto
    end
    
    SDK->>SDK: Finaliza UserOperation
    SDK->>Bundler: eth_sendUserOperation
    Bundler->>EntryPoint: handleOps([userOp])
    EntryPoint->>SmartAccount: validateUserOp + execute
    SmartAccount-->>EntryPoint: Resultado
    EntryPoint-->>Bundler: Confirmação
    Bundler-->>SDK: Recibo
    SDK-->>Frontend: Status da transação
    Frontend-->>User: Notifica conclusão
    
    Backend->>Backend: Atualiza analytics
    Backend->>User: Envia notificação push (opcional)
```

### 7. Testes e Validação: Processo de Teste End-to-End

```mermaid
sequenceDiagram
    participant CI as CI/CD Pipeline
    participant UnitTest as Testes Unitários
    participant IntegrationTest as Testes Integração
    participant TestEnv as Ambiente de Teste
    participant HardhatNode as Hardhat Node
    participant Contracts as Contratos Implantados
    participant StressTest as Teste de Estresse
    
    CI->>UnitTest: Executa testes unitários
    UnitTest->>Contracts: Testa contratos individualmente
    UnitTest->>UnitTest: Verifica comportamento isolado
    UnitTest-->>CI: Resultados + cobertura
    
    CI->>TestEnv: Prepara ambiente de teste
    TestEnv->>HardhatNode: Inicia node local
    TestEnv->>Contracts: Deploy de contratos
    TestEnv->>TestEnv: Configura EntryPoint
    TestEnv->>TestEnv: Configura Bundler de teste
    
    CI->>IntegrationTest: Executa testes integração
    IntegrationTest->>TestEnv: Simula UserOperations
    IntegrationTest->>TestEnv: Verifica fluxo completo
    TestEnv-->>IntegrationTest: Resultados
    IntegrationTest-->>CI: Relatório de integração
    
    CI->>StressTest: Executa testes de carga
    StressTest->>TestEnv: Simula alto volume de ops
    StressTest->>StressTest: Monitora performance
    StressTest->>StressTest: Analisa limites do sistema
    StressTest-->>CI: Relatório de performance
    
    CI->>CI: Compila resultados
    CI->>CI: Verifica critérios de Aprovacao
    CI->>CI: Gera relatório completo
```

Este diagrama de classes representa a estrutura do projeto ERC-4337, mostrando as classes principais e suas relações.



