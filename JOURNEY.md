# Jornadas de Implementação do ERC-4337

Este documento apresenta jornadas de usuários e desenvolvedores na implementação completa da especificação ERC-4337 para account abstraction, explorando diferentes perfis e casos de uso técnicos.

## Jornada 1: Desenvolvedor Implementando Smart Contract Wallets

### Persona: Rafael, Engenheiro de Blockchain

Rafael é um desenvolvedor Solidity experiente trabalhando em uma empresa de DeFi que quer adotar conta abstraída para seus usuários.

### Fase 1: Pesquisa e Planejamento

**Ações:**
- Estuda a especificação ERC-4337 completa
- Analisa implementações de referência como a da Infinitism
- Identifica requisitos específicos da aplicação DeFi

**Aspectos Técnicos:**
- Compreende a arquitetura de componentes principais:
  - `EntryPoint` como singleton compartilhado
  - Contas inteligentes que seguem interface `IAccount`
  - Paymasters para patrocínio de gás
  - Bundle de transações via UserOperation
  - Modelo de mempool alternativo

### Fase 2: Implementação do Contrato da Conta

**Ações:**
- Desenvolve contrato modular `DeFiAccount` implementando `BaseAccount`
- Implementa função `validateUserOp` com verificação personalizada
- Adiciona hooks para autorização de transações via multisig

**Código Chave:**
```solidity
function validateUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external returns (uint256 validationData) {
    // Valida assinatura usando ECDSA ou multisig
    _validateSignature(userOp, userOpHash);
    
    // Paga ao EntryPoint pelos custos de gás
    if (missingAccountFunds > 0) {
        (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
        require(success, "DeFiAccount: failed to pay for gas");
    }
    
    return 0; // Validação bem-sucedida
}
```

### Fase 3: Factory e Implantação

**Ações:**
- Implementa `DeFiAccountFactory` usando Create2 para endereços determinísticos
- Desenvolve método de inicialização que configura proprietarios e parâmetros
- Implementa proxy para atualizações

**Código Chave:**
```solidity
function createAccount(
    address[] calldata owners,
    uint256 threshold, 
    uint256 salt
) external returns (DeFiAccount) {
    address addr = getAddress(owners, threshold, salt);
    uint codeSize = addr.code.length;
    if (codeSize > 0) {
        return DeFiAccount(payable(addr));
    }
    
    // Inicialização da conta
    bytes memory initData = abi.encodeCall(
        DeFiAccount.initialize,
        (owners, threshold)
    );
    
    // Implantação usando CREATE2
    DeFiAccount account = DeFiAccount(payable(
        new ERC1967Proxy{salt: bytes32(salt)}(
            address(accountImplementation),
            initData
        )
    ));
    
    emit AccountCreated(address(account), owners);
    return account;
}
```

### Fase 4: Integração com Bundler e Paymaster

**Ações:**
- Configura node bundler ou usa serviço como Stackup ou Alchemy
- Implementa Paymaster para subsidiar transações de novos usuários
- Desenvolve APIs de backend para assinar UserOperations

**Aspectos Técnicos:**
- Configura RPC de bundler para enviar UserOperations
- Implementa verificação off-chain para UserOperation
- Gerencia pool ETH para Paymaster
- Monitora eventos de aceitação de UserOperation

### Fase 5: Testes e Auditoria

**Ações:**
- Desenvolve testes unitários para verificar conformidade com ERC-4337
- Conduz testes de integração com bundler real
- Realiza auditoria de segurança

**Resultado:**
Rafael implementa com sucesso uma carteira inteligente compatível com ERC-4337 que permite aos usuários DeFi realizar transações sem ETH, utilizar multisig e realizar atualizações sem perder fundos.

---

## Jornada 2: Empresa Implementando Experiência de Login Social

### Persona: Empresa CredFi e Isabella (CTO)

CredFi é uma startup de crédito DeFi que busca atrair usuários nao-técnicos, enquanto Isabella lidera a implementação técnica.

### Fase 1: Identificação do Problema

**Situação:**
- 70% dos usuários abandonam o processo de onboarding ao precisar comprar ETH
- Usuários nao técnicos têm dificuldade em entender seed phrases

**Metas de Implementação:**
- Login com contas Google/Apple em vez de seed phrases
- Transações gasless para novos usuários
- Recuperação de conta simples

### Fase 2: Desenvolvimento do Contract Account

**Ações Técnicas:**
- Implementa `SocialLoginAccount` compatível com ERC-4337
- Desenvolve verificação de assinatura que aceita JWT do OAuth
- Implementa sistema de recuperação via guardiões sociais

**Código Chave:**
```solidity
// Em validateUserOp
if (userOp.signature.length > 65) {
    // Validação do JWT/Proof de Autenticacao social
    bytes memory socialAuthProof = userOp.signature;
    bytes32 providerId = extractProviderFromProof(socialAuthProof);
    
    if (_verifyLoginProof(providerId, socialAuthProof)) {
        return 0; // Autenticacao social válida
    }
} else {
    // Validação padrão via ECDSA
    // Para dispositivos já autenticados
}
```

### Fase 3: Implementação de Paymaster Patrocinado

**Ações Técnicas:**
- Desenvolve `OnboardingPaymaster` que subsidia primeiras 10 transações
- Implementa controle de gastos e limites por usuário
- Integra sistema de analytics para mensurar conversão

**Código Chave:**
```solidity
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external override returns (bytes memory context, uint256 validationData) {
    // Verifica se usuário esta elegível para subsídio
    require(isNewUser[userOp.sender] && transactionCount[userOp.sender] < 10, 
            "nao elegível para subsídio");
    
    // Limita custo máximo por transação
    require(maxCost <= maxSubsidyPerTransaction, "Custo excede limite");
    
    // Contexto para pós-processamento
    return (abi.encode(userOp.sender, maxCost), 0);
}
```

### Fase 4: Implementação Frontend e Backend

**Ações Técnicas:**
- Desenvolve componentes React para login social integrado à Web3
- Implementa servidor de Autenticacao que converte JWT em assinaturas
- Desenvolve sistema de recuperação por email
- Implementa tracking de métricas

**Fluxo Técnico:**
1. Usuário faz login com Google
2. Backend valida JWT e gera endereço de carteira determinístico
3. Backend assina UserOperation em nome do usuário
4. Paymaster patrocina gastos
5. Bundler envia transação para EntryPoint

### Fase 5: Implantação e Monitoramento

**Ações:**
- Implanta solução em testnet e depois mainnet
- Configura dashboard de métricas:
  - Taxa de conversão
  - Gastos com subsídio
  - Retenção de usuários
  - Ativações por wallet

**Resultados:**
- Taxa de conversão subiu de 30% para 82%
- 94% dos usuários completam seu primeiro empréstimo

---

## Jornada 3: Implementação Técnica do Seguro DeFi com Resgate Automático

### Persona: Carla, Arquiteta Blockchain

Carla esta implementando tecnicamente o sistema de seguro DeFi com resgate automático baseado em conta abstraída.

### Fase 1: Arquitetura do Sistema

**Componentes Técnicos:**
- `DeFiInsuranceAccount`: Conta ERC-4337 que monitora precos via oráculos
- `InsuranceFactory`: Deploy de contas determinísticas
- `PriceMonitoringService`: Serviço off-chain para chamar liquidação
- `ChainlinkPriceAdapter`: Integrando oráculos de preco

### Fase 2: Implementação da Conta de Seguro

**Ações Técnicas:**
- Desenvolve `DeFiInsuranceAccount` que implementa `BaseAccount`
- Adiciona lógica para monitorar preco via oráculos Chainlink
- Implementa função de liquidação automática

**Código Chave:**
```solidity
function _liquidatePosition() internal {
    require(!liquidated, "Account already liquidated");
    liquidated = true;
    
    (uint256 price, bool valid) = oracle.fetchETHPrice();
    require(valid && price <= triggerPrice, "Condição nao atingida");
    
    // Registra evento com detalhes da liquidação
    emit PositionLiquidated(block.timestamp, price, address(this).balance);
    
    // Transfere fundos para destino de resgate
    (bool success, ) = rescueDestination.call{value: address(this).balance}("");
    require(success, "Failed to transfer funds");
}
```

### Fase 3: Sistema de Monitoramento de preco

**Implementação Técnica:**
- Desenvolve serviço em NodeJS que monitora precos e triggers
- Implementa lógica para construir UserOperation para chamada externa
- Cria sistema de alerta e notificações

**Código Chave (Backend):**
```javascript
async function checkAccounts() {
  // Busca contas ativas
  const accounts = await db.getActiveInsuranceAccounts();
  
  // Busca preco atual do ETH
  const ethPrice = await priceOracle.getEthPrice();
  
  for (const account of accounts) {
    if (ethPrice <= account.triggerPrice) {
      // preco abaixo do trigger, executa liquidação
      const userOp = buildUserOperation({
        sender: account.address,
        callData: insuranceInterface.encodeFunctionData("executeLiquidation", []),
        // outros campos necessários
      });
      
      // Assina com chave do serviço e envia ao bundler
      await signAndSendUserOperation(userOp);
      
      // Notifica usuário
      await notificationService.alertUser(account.owner, {
        type: "liquidation",
        price: ethPrice,
        timestamp: Date.now()
      });
    }
  }
}
```

### Fase 4: Integração com Bundler ERC-4337

**Ações Técnicas:**
- Configura serviço bundler próprio ou usa solução gerenciada
- Implementa verificação de UserOperation específica para liquidações
- Configura mempool alternativo que prioriza operações de liquidação

**Requisitos Críticos:**
- Alta disponibilidade para executar liquidações tempestivas
- Fast-lane para operações de emergência
- Redundância para garantir execução mesmo com congestionamento

### Fase 5: Testes de Estresse e Segurança

**Ações Técnicas:**
- Realiza testes de simulação de queda de preco abrupta
- Verifica comportamento sob congestionamento de rede
- Testa tentativas de front-running ou manipulação
- Audita segurança dos contratos

**Resultado:**
Carla implementa uma solução técnica completa que permite:
1. Criação de contas de seguro compatíveis com ERC-4337
2. Monitoramento contínuo de precos
3. Execução automatizada de liquidações via Account Abstraction
4. Notificações em tempo real aos usuários

---

## Jornada 4: Upgrade de Aplicação DeFi Existente para ERC-4337

### Persona: Equipe DevOps da DeFiLendX

DeFiLendX é uma plataforma de empréstimo DeFi com 50.000 usuários que deseja migrar para uma solução baseada em Account Abstraction.

### Fase 1: Avaliação e Planejamento

**Análise Técnica:**
- Mapeamento dos contratos atuais e interfaces
- Identificação de pontos de integração com ERC-4337
- Estratégia de migração com compatibilidade retroativa
- Análise de risco e impacto em fundos existentes

### Fase 2: Desenvolvimento de Camada de Compatibilidade

**Ações Técnicas:**
- Cria adaptador que mapeia contratos EOA para smart accounts
- Desenvolve proxy inteligente que redireciona chamadas
- Implementa bridge contract para migração gradual

**Código Chave:**
```solidity
contract DeFiLendXAdapter {
    mapping(address => address) public smartAccountOf;
    
    function executeViaSmartAccount(
        address target,
        uint256 value,
        bytes calldata data
    ) external returns (bytes memory) {
        address smartAccount = smartAccountOf[msg.sender];
        if (smartAccount == address(0)) {
            // Cria conta inteligente on-demand
            smartAccount = _deployNewSmartAccountFor(msg.sender);
        }
        
        // Executa chamada via conta inteligente
        return IAccount(smartAccount).execute(target, value, data);
    }
}
```

### Fase 3: Integração de EntryPoint e Bundler

**Ações Técnicas:**
- Implementa singleton EntryPoint compatível com especificação ERC-4337
- Configura nós bundler dedicados para alto throughput
- Desenvolve sistema de fallback entre bundlers
- Implementa escalabilidade com suporte a L2/rollups

**Configuração:**
- Deploy de nodes Geth modificados para mempool alternativo
- Implementação de sistema de reputação para bundlers
- Criação de sentry nodes para proteção contra ataques

### Fase 4: Paymaster e Tokenomics

**Ações Técnicas:**
- Implementa Token Paymaster que aceita token nativo LDX
- Desenvolve mecanismos de estímulo para migração
- Cria pool de liquidez para conversão de gas token

**Código Chave:**
```solidity
function validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
) external override returns (bytes memory context, uint256 validationData) {
    // Extrai dados específicos do Paymaster
    bytes calldata paymasterAndData = userOp.paymasterAndData;
    (address token, uint256 tokenAmount) = _decodeTokenData(paymasterAndData);
    
    // Verifica se token é suportado
    require(supportedTokens[token], "Token nao suportado");
    
    // Calcula taxa de conversão token->ETH
    uint256 ethValue = _convertTokenToEth(token, tokenAmount);
    require(ethValue >= maxCost, "Valor insuficiente");
    
    // Transfere tokens
    IERC20(token).safeTransferFrom(userOp.sender, address(this), tokenAmount);
    
    return (abi.encode(token, tokenAmount, maxCost), 0);
}
```

### Fase 5: Migração dos Usuários

**Fluxo Técnico:**
1. Usuário conecta carteira à plataforma
2. Backend detecta se carteira é EOA (legacy) ou smart account
3. Para EOAs, oferece upgrade para smart account com vantagens
4. Backend gera UserOperation para migração de fundos
5. Contratos bridge autorizam acesso aos fundos no novo sistema

**Vantagens Técnicas Implementadas:**
- Transações em lote (batch)
- Pagamento de gas em tokens
- Login via dispositivos móveis
- Recuperação simplificada
- Automações programáveis

### Fase 6: Monitoramento e Otimização

**Ferramentas Técnicas:**
- Dashboard específico para métricas ERC-4337
- Monitoramento de gás economizado
- Taxas de sucesso de UserOperations
- Performance de bundlers
- Análise de custos de Paymaster

**Resultados Técnicos:**
- 65% dos usuários migraram para smart accounts
- Redução de 40% nos custos com gas
- Aumento de 25% no volume de transações
- Redução de 80% nos tickets de suporte para problemas de transação

---

Esta documentação apresenta jornadas técnicas focadas na implementação completa do ERC-4337, detalhando os aspectos de engenharia, desafios e soluções para cada perfil de implementador.
