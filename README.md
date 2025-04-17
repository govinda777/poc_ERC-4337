# poc_ERC-4337

Vou criar uma POC (Prova de Conceito) completa e didática para implementar o ERC-4337. Vamos dividir em partes claras para facilitar o entendimento.

## Estrutura do Projeto

Primeiro, vamos criar a estrutura do nosso projeto:

```
erc4337-poc/
├── contracts/
│   ├── SimpleAccount.sol
│   └── SimpleAccountFactory.sol
├── scripts/
│   ├── deploy.js
│   └── createAccount.js
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── hardhat.config.js
└── package.json
```

## Configuração Local

Este guia fornece instruções passo a passo para configurar e executar o projeto ERC-4337 em seu ambiente local.

### Requisitos

- Node.js (v14 ou superior)
- npm (v7 ou superior)
- Git

### 1. Clonar o Repositório

Se você ainda nao clonou o repositório:

```bash
git clone https://github.com/seu-usuario/poc_ERC-4337.git
cd poc_ERC-4337
```

### 2. Instalar Dependências

Instale todas as dependências do projeto:

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure as seguintes variáveis:

```
# Chave privada para testes (nao use em produção)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# URLs de RPC
LOCALHOST_URL=http://127.0.0.1:8545
SEPOLIA_URL=https://sepolia.infura.io/v3/seu-id-infura

# Configurações da Aplicação
ENTRY_POINT_ADDRESS=0x0000000000000000000000000000000000000000
```

O endereço do EntryPoint será substituído automaticamente após o deployment.

### 4. Iniciar a Aplicação

Existem várias maneiras de iniciar a aplicação, dependendo do seu caso de uso:

#### Opção 1: Iniciar Tudo com Um Comando (Recomendado)

Este método usa um script Shell para iniciar a aplicação completa, incluindo a rede local, deploy de contratos e criação de contas inteligentes:

```bash
npm run start:complete
```

Este comando:
- Limpa artefatos antigos
- Compila os contratos
- Inicia o node Hardhat em segundo plano
- Implanta todos os contratos principais
- Cria contas smart com recuperação social e biométrica
- Configura Paymaster para transações sem gas

Quando terminar de usar, pare a aplicação com:

```bash
npm run stop:app
```

#### Opção 2: Iniciar com Componentes Paralelos

Use o Concurrently para iniciar múltiplos componentes em paralelo:

```bash
# Versão básica (node + contratos principais)
npm run start

# Versão completa (node + contratos + contas)
npm run start:full
```

#### Opção 3: Método Passo a Passo (Manual)

Se preferir controlar cada etapa manualmente:

```bash
# Terminal 1: Iniciar o node
npm run node

# Terminal 2: Deploy dos contratos (após o node estar rodando)
npm run deploy
npm run deploy-paymaster
npm run create-account
```

### 5. Criar Diferentes Tipos de Contas

Dependendo do tipo de conta que você quer testar, execute um dos seguintes comandos:

#### Conta com Recuperação Social
```bash
npm run create-account
```

#### Conta MultiSig (precisa da factory)
```bash
npm run deploy-multisig-factory
npm run create-multisig
```

#### Conta com Pagamentos Recorrentes
```bash
npm run deploy-recurring-factory
npm run create-recurring-account
```

#### Conta com Autenticacao Biométrica
```bash
npm run deploy-biometric-factory
npm run create-biometric-account
```

#### Conta com Recuperação Corporativa
```bash
npm run deploy-corporate-recovery
```

### 6. Configurar Paymaster (para transações gasless)

Se quiser testar transações sem gas (gasless):

```bash
npm run deploy-paymaster
npm run sponsor-address
```

### 7. Testar Funcionalidades

#### Executar Testes Automatizados

```bash
npm run test
```

#### Testes Específicos

```bash
npm run test:corporate  # Testes para recuperação corporativa
npm run test:bdd        # Testes BDD com Cucumber
```

#### Exemplos de Uso

- Gerenciar guardiões: `npm run manage-guardians`
- Recuperar conta: `npm run recover-account`
- Gerenciar transações MultiSig: `npm run multisig-tx`
- Gerenciar assinaturas recorrentes: `npm run manage-subscriptions`
- Gerenciar dispositivos biométricos: `npm run manage-biometric-devices`
- Pagamentos com Autenticacao biométrica: `npm run biometric-payments`

### 8. Execução de Transação sem Gas

Para testar uma transação sem gas (patrocinada):

```bash
npm run gasless-tx
```

### Solução de Problemas

#### Erro de Nonce
Se encontrar erros relacionados a nonce:

```bash
npx hardhat clean
npm run compile
```

#### Problemas com o Node Local
Reinicie o node Hardhat:

```bash
# Ctrl+C para parar o node atual
npm run node
```

#### Erro de Conexão com RPC
Verifique se o node Hardhat esta rodando e se o URL no .env esta correto.

#### Problemas com o Script de Inicialização
Se o script `start:app` apresentar problemas:
- Verifique se o script tem permissão de execução: `chmod +x scripts/start.sh scripts/stop.sh`
- Certifique-se de que o diretório `logs` existe: `mkdir -p logs`

## Casos de test

O ERC-4332 introduz a **abstração de contas** na Ethereum, resolvendo desafios críticos e habilitando novos casos de uso.

- [x] 1. **Carteiras Inteligentes com Recuperação Social**
- Permite redefinir chaves perdidas usando métodos como verificação por dispositivos confiáveis ou contatos predefinidos, eliminando a dependência de frases-semente[5][4].
- Exemplo: Recuperação via Autenticacao em dois fatores (2FA) ou biometria (digital/facial)[1][5].

- [x] 2. **Transações Sem Custos de Gas (Gasless Transactions)**
- Terceiros (como aplicativos ou patrocinadores) podem pagar taxas de rede, permitindo que usuários interajam com dApps sem precisar de ETH para gas[2][4].
- Caso de uso: Promoções em jogos NFTs onde a plataforma subsidia o minting[1][5].

- [x] 3. **Assinaturas Múltiplas e Controles Personalizados**
- Crie regras complexas para transações, como exigir Aprovacao de múltiplas partes (ex: 2 de 3 assinaturas) ou limitar valores diarios[4][5].
- Aplicação: Gestão de fundos corporativos ou tesourarias DAO com requisitos de segurança elevados[1][4].

- [x] 4. **Pagamentos Recorrentes e Assinaturas**
- Automatize transações periódicas (ex: assinaturas de serviços) sem intervenção manual, usando lógica programável em contratos inteligentes[4][5].
- Exemplo: Plataformas de streaming descentralizadas com cobrança mensal automática[1].

- [x] 5. **Experiência Simplificada para Novos Usuários**
- Criação de contas com Autenticacao biométrica (digital/facial) em smartphones, substituindo frases-semente complexas[1][5].
- Impacto: Redução de barreiras para adoção em massa, especialmente para usuários nao técnicos[1][4].

- [ ] 6. **Casos de uso BDD**
    - [ ] 6.1 Auth (2FA / Biometria)
    - [ ] 6.2 Transações 
         - [ ] 6.2.1 Gasless - When to use? ex: NFTs minting, Game items / Proccess : SponsorPaymaster
         - [ ] 6.2.2 MultiSig - When to use? ex: DAO, DePIN / Proccess : MultiSigAccountFactory
         - [ ] 6.2.3 Recurring Payments - When to use? ex: SaaS, DePIN / Proccess : RecurringPaymentAccountFactory
         - [ ] 6.2.4 Batch Transactions - When to use? ex: Game items, NFTs / Proccess : BatchTransactionsAccountFactory
         - [ ] 6.2.5 Game Assets - When to use? ex: Game items, NFTs / Proccess : GameAssetAccountFactory
         - [ ] 6.2.6 DePIN - When to use? ex: DePIN, Game items, NFTs / Proccess : DePINAccountFactory
         

### Benefícios Gerais para Adoção em Massa
- **Segurança reforçada:** Menos riscos de perda de chaves e fraudes[4][5].
- **Custos reduzidos:** Modelos de pagamento inovadores (ex: pay-as-you-go)[1][4].
- **Interoperabilidade:** Identidades e ativos portáveis entre diferentes dApps[3][5].

## Transações Sem Custos de Gas (Gasless Transactions)

Esta funcionalidade já esta implementada no projeto. Veja como usar:

### 1. Implantar o SponsorPaymaster

```bash
npx hardhat run scripts/deploySponsorPaymaster.js --network localhost
```

### 2. Patrocinar uma conta ou aplicativo

Para patrocinar uma conta (smart account):
```bash
npx hardhat run scripts/sponsorAccount.js --network localhost -- address 0xSuaContaSmartAqui
```

Para patrocinar um aplicativo (contrato alvo):
```bash
npx hardhat run scripts/sponsorAccount.js --network localhost -- app 0xSeuAplicativoAqui
```

### 3. Enviar transação sem custos de gas

```bash
npx hardhat run scripts/sendGaslessTransaction.js --network localhost -- 0xSuaContaSmartAqui 0xEnderecoAlvo valorEmWei
```

O SponsorPaymaster cobrirá os custos de gas para todas as transações enviadas por contas ou para aplicativos patrocinados, eliminando a necessidade de os usuários possuírem ETH para interagir com dApps.

### Como funciona

1. O SponsorPaymaster é uma implementação de BasePaymaster do ERC-4337
2. Ele mantém registros de contas e aplicativos patrocinados
3. Quando uma UserOperation é enviada através do EntryPoint, o paymaster verifica se o remetente ou o destino esta na lista de patrocinados
4. Se estiver, o paymaster paga as taxas de gas em nome do usuário
5. O financiador do paymaster (dono do contrato) é quem arca com os custos de gas

Esse modelo é particularmente útil para:
- Onboarding de novos usuários (que nao possuem ETH)
- Promoções em jogos NFT (mint sem custo de gas)
- Melhorar a experiência do usuário em dApps

## Assinaturas Múltiplas e Controles Personalizados

Esta funcionalidade já esta implementada no projeto. Veja como usar:

### 1. Implantar a MultiSigAccountFactory

```bash
npx hardhat run scripts/deployMultiSigFactory.js --network localhost
```

### 2. Criar uma conta MultiSig

```bash
# Formato: npx hardhat run scripts/createMultiSigAccount.js -- <threshold> <dailyLimit> <txLimit> <owner1,owner2,...>
# Exemplo para carteira 2-de-3 com limite diario de 1 ETH e limite por transação de 0.5 ETH:
npx hardhat run scripts/createMultiSigAccount.js --network localhost -- 2 1 0.5 0xOwner1,0xOwner2,0xOwner3
```

### 3. Gerenciar transações MultiSig

#### Propor uma transação:
```bash
npx hardhat run scripts/manageMultiSigTransactions.js --network localhost -- propose 0xMultiSigAddress 0xDestinoAddress 0.1
```

#### Confirmar uma transação:
```bash
npx hardhat run scripts/manageMultiSigTransactions.js --network localhost -- confirm 0xMultiSigAddress 0
```

#### Executar uma transação:
```bash
npx hardhat run scripts/manageMultiSigTransactions.js --network localhost -- execute 0xMultiSigAddress 0
```

#### Listar todas as transações:
```bash
npx hardhat run scripts/manageMultiSigTransactions.js --network localhost -- list 0xMultiSigAddress
```

#### Ver detalhes de uma transação:
```bash
npx hardhat run scripts/manageMultiSigTransactions.js --network localhost -- details 0xMultiSigAddress 0
```

Você também pode usar os scripts NPM para simplificar:
```bash
npm run deploy-multisig-factory
npm run create-multisig -- 2 1 0.5 0xOwner1,0xOwner2,0xOwner3
npm run multisig-tx -- propose 0xMultiSigAddress 0xDestinoAddress 0.1
```

### Como funciona

O sistema MultiSig implementa:

1. **Propriedade compartilhada**: múltiplos donos com controle sobre a conta
2. **Aprovacao por quórum**: número minimo de assinaturas para aprovar transações
3. **Limites de valores**: limites por transação e diarios
4. **Expiração de propostas**: transações que nao são executadas em tempo hábil expiram
5. **Gerenciamento de permissões**: adicionar/remover donos via Aprovacao MultiSig

Ideal para:
- Tesourarias corporativas
- Gestão de fundos de DAOs
- Contas compartilhadas entre equipes
- Segurança adicional para fundos significativos

## Pagamentos Recorrentes e Assinaturas

Esta funcionalidade já esta implementada no projeto. Veja como usar:

### 1. Implantar a RecurringPaymentAccountFactory

```bash
npx hardhat run scripts/deployRecurringPaymentFactory.js --network localhost
```

### 2. Criar uma conta de pagamentos recorrentes

```bash
npx hardhat run scripts/createRecurringPaymentAccount.js --network localhost
```

### 3. Gerenciar assinaturas e pagamentos recorrentes

#### Criar uma nova assinatura:
```bash
# Formato: npx hardhat run scripts/manageRecurringPayments.js -- create <account-address> <payee> <amount-in-eth> <period-in-seconds> [start-timestamp] [end-timestamp] [data]
# Exemplo para pagamento mensal de 0.1 ETH:
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- create 0xSuaContaAddress 0xDestino 0.1 2592000
```

#### Listar assinaturas ativas:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- list 0xSuaContaAddress
```

#### Ver detalhes de uma assinatura:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- details 0xSuaContaAddress 0
```

#### Modificar uma assinatura:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- modify 0xSuaContaAddress 0 0.2 2592000 0
```

#### Cancelar uma assinatura:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- cancel 0xSuaContaAddress 0
```

#### Executar uma assinatura específica:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- execute 0xSuaContaAddress 0
```

#### Executar todas as assinaturas devidas:
```bash
npx hardhat run scripts/manageRecurringPayments.js --network localhost -- execute-all 0xSuaContaAddress
```

Você também pode usar os scripts NPM para simplificar:
```bash
npm run deploy-recurring-factory
npm run create-recurring-account
npm run manage-subscriptions -- create 0xSuaContaAddress 0xDestino 0.1 2592000
```

### Como funciona

O sistema de pagamentos recorrentes implementa:

1. **Assinaturas automáticas**: pagamentos periódicos sem intervenção manual
2. **Configuração flexível**: defina o valor, periodicidade, início e término
3. **Gestão simplificada**: crie, modifique, cancele e execute assinaturas
4. **Controle temporal**: pagamentos ocorrem apenas quando devidos
5. **Suporte a dados personalizados**: envie dados adicionais com cada pagamento

Ideal para:
- Assinaturas de serviços (como streaming e SaaS)
- Salários e pagamentos recorrentes
- Contribuições periódicas para DAOs ou projetos
- Planos de financiamento com parcelas automáticas

### Automação de Pagamentos

Para automatizar completamente a execução de pagamentos recorrentes, você poderia:

1. Configurar um serviço cron (agendador) para executar regularmente:
```bash
# Execute diariamente para processar pagamentos devidos:
0 0 * * * cd /caminho/projeto && npm run manage-subscriptions -- execute-all 0xSuaContaAddress
```

2. Integrar com um serviço de oráculos como Chainlink Automation (anteriormente Keeper) para executar transações on-chain quando necessário.

## Experiência Simplificada para Novos Usuários (Autenticacao Biométrica)

Esta funcionalidade já esta implementada no projeto. Veja como usar:

### 1. Implantar a BiometricAuthAccountFactory

```bash
npx hardhat run scripts/deployBiometricAuthFactory.js --network localhost
# Ou usando o alias NPM:
npm run deploy-biometric-factory
```

### 2. Criar uma conta com Autenticacao biométrica

```bash
# Formato básico:
npx hardhat run scripts/createBiometricAccount.js --network localhost

# Formato com dispositivos personalizados e minimo necessário:
# npx hardhat run scripts/createBiometricAccount.js --network localhost device1,device2,device3 2
# Onde os dispositivos são endereços Ethereum e o número é o minimo necessário

# Ou usando o alias NPM:
npm run create-biometric-account
```

### 3. Gerenciar dispositivos biométricos

```bash
# Listar informações da conta:
npx hardhat run scripts/manageBiometricDevices.js --network localhost -- list ENDEREÇO_DA_CONTA

# Adicionar um novo dispositivo:
npx hardhat run scripts/manageBiometricDevices.js --network localhost -- add ENDEREÇO_DA_CONTA ENDEREÇO_DO_DISPOSITIVO

# Remover um dispositivo:
npx hardhat run scripts/manageBiometricDevices.js --network localhost -- remove ENDEREÇO_DA_CONTA ENDEREÇO_DO_DISPOSITIVO

# Definir o número minimo de dispositivos:
npx hardhat run scripts/manageBiometricDevices.js --network localhost -- set-min ENDEREÇO_DA_CONTA NÚMERO_minimo

# Ou usando o alias NPM:
npm run manage-biometric-devices -- list ENDEREÇO_DA_CONTA
```

### Frontend de Autenticacao Biométrica

O projeto inclui uma interface de usuário para interagir com contas biométricas. Para usá-la:

1. Copie os arquivos do diretório `frontend/` para um servidor web
2. Abra o arquivo `biometricUI.html` em um dispositivo móvel com suporte a biometria
3. Conecte sua carteira e crie uma conta biométrica
4. Use sua biometria (impressão digital/face) para autorizar transações

### Como funciona

O sistema de Autenticacao biométrica implementa:

1. **Verificação de compatibilidade do dispositivo**: detecta se o dispositivo suporta biometria
2. **Autenticacao sem senha**: usa a biometria nativa do dispositivo em vez de senhas ou frases-semente
3. **Múltiplos dispositivos**: permita adicionar diversos dispositivos biométricos à mesma conta
4. **Redundância e segurança**: defina um número minimo de dispositivos necessários para transações

Este modelo é particularmente útil para:
- Simplificar a experiência de novos usuários
- Eliminar a necessidade de guardar frases-semente
- Aumentar a segurança ao vincular a identidade física ao acesso à carteira
- Reduzir barreiras de adoção para público nao técnico

**Nota:** A implementação atual simula a API Web Authentication em navegadores. Em um ambiente de produção, recomenda-se utilizar a API WebAuthn para interagir com os sensores biométricos reais do dispositivo.

## Parte 1: Configuração do Projeto

Vamos iniciar o projeto:

```bash
mkdir erc4337-poc
cd erc4337-poc
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers@5.7.2 @account-abstraction/contracts @account-abstraction/sdk
npx hardhat init
```

Edite o arquivo `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      chainId: 1337
    },
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};
```

## Parte 2: Contratos Inteligentes

### SimpleAccount.sol

Este é o contrato da carteira inteligente que implementa o ERC-4337:

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * Conta simples ERC-4337.
 * É um contrato que pode ser usado por um EOA (Externally Owned Account) para executar
 * transações através do EntryPoint, seguindo o padrão ERC-4337.
 */
contract SimpleAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;

    event SimpleAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "nao é o proprietario");
        _;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    /**
     * Executa uma transação (chamada por entryPoint)
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * Executa um lote de transações
     */
    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "tamanhos de arrays incompativeis");
        for (uint256 i = 0; i  0) {
            return SimpleAccount(payable(addr));
        }
        ret = SimpleAccount(payable(new ERC1967Proxy{salt: bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(SimpleAccount.initialize, (owner))
            )));
    }

    /**
     * Calcula o endereço de uma conta que seria criada por createAccount()
     */
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(SimpleAccount.initialize, (owner))
                )
            ))
        );
    }
}
```

## Parte 3: Scripts de Implantação

### deploy.js

Este script implanta o EntryPoint e a SimpleAccountFactory:

```javascript
const hre = require("hardhat");

async function main() {
  // Implanta o EntryPoint
  const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("EntryPoint implantado em:", entryPoint.address);

  // Implanta a SimpleAccountFactory
  const SimpleAccountFactory = await hre.ethers.getContractFactory("SimpleAccountFactory");
  const factory = await SimpleAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("SimpleAccountFactory implantada em:", factory.address);

  // Salva os endereços para uso posterior
  const fs = require("fs");
  const addresses = {
    entryPoint: entryPoint.address,
    factory: factory.address
  };
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### createAccount.js

Este script cria uma nova conta usando a factory:

```javascript
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Carrega os endereços dos contratos implantados
  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  // Conecta à factory
  const factory = await hre.ethers.getContractAt(
    "SimpleAccountFactory", 
    addresses.factory
  );
  
  // Obtém a carteira do signatário
  const [signer] = await hre.ethers.getSigners();
  
  // Cria uma nova conta com salt aleatório
  const salt = Math.floor(Math.random() * 1000000);
  console.log(`Criando conta para ${signer.address} com salt ${salt}...`);
  
  // Calcula o endereço da conta antes de criá-la
  const accountAddress = await factory.getAddress(signer.address, salt);
  console.log("Endereço previsto da conta:", accountAddress);
  
  // Cria a conta
  const tx = await factory.createAccount(signer.address, salt);
  await tx.wait();
  
  // Verifica se a conta foi criada corretamente
  const accountAddress2 = await factory.getAddress(signer.address, salt);
  console.log("Conta criada em:", accountAddress2);
  
  // Salva o endereço da conta para uso posterior
  addresses.account = accountAddress2;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## Parte 4: Frontend

### index.html

```html



    
    
    ERC-4337 Demo
    


    
        ERC-4337 Carteira Inteligente
        
        
            Conectar Carteira
            Conectar MetaMask
            
                Endereço EOA: 
                Saldo EOA:  ETH
            
        
        
        
            Carteira Inteligente
            Criar Carteira Inteligente
            
                Endereço: 
                Saldo:  ETH
                
                    Depositar 0.01 ETH
                
            
        
        
        
            Enviar Transação
            
                Endereço de Destino:
                
            
            
                Valor (ETH):
                
            
            Enviar Transação
            
                Status: 
                Hash: 
            
        
    
    
    
    


```

### styles.css

```css
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f5f5;
    margin: 0;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    text-align: center;
    color: #333;
}

.card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 20px;
}

h2 {
    margin-top: 0;
    color: #444;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin: 5px 0;
}

button:hover {
    background-color: #45a049;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.form-group {
    margin-bottom: 15px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-sizing: border-box;
}

.hidden {
    display: none;
}

#txStatus {
    margin-top: 15px;
    padding: 10px;
    background-color: #f8f8f8;
    border-radius: 4px;
}

#txHash {
    word-break: break-all;
    font-family: monospace;
}
```

### app.js

```javascript
// Configurações e variáveis globais
const ENTRY_POINT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Substitua pelo endereço real
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Substitua pelo endereço real
const BUNDLER_URL = "http://localhost:3000/rpc"; // URL do bundler local ou serviço

let provider, signer, smartWalletAddress;
let factoryContract, entryPointContract, smartWalletContract;

// ABIs simplificados
const FACTORY_ABI = [
    "function createAccount(address owner, uint256 salt) public returns (address)",
    "function getAddress(address owner, uint256 salt) public view returns (address)"
];

const SMART_WALLET_ABI = [
    "function execute(address dest, uint256 value, bytes calldata func) external",
    "function owner() public view returns (address)"
];

const ENTRY_POINT_ABI = [
    "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] calldata ops, address beneficiary) external"
];

// Inicialização da página
async function init() {
    // Botões de evento
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('createSmartWallet').addEventListener('click', createSmartWallet);
    document.getElementById('depositToWallet').addEventListener('click', depositToWallet);
    document.getElementById('sendTransaction').addEventListener('click', sendTransaction);
    
    // Verifica se o MetaMask esta instalado
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Verifica se já esta conectado
        try {
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error("Erro ao verificar contas:", error);
        }
    } else {
        alert("Por favor, instale o MetaMask para usar este aplicativo!");
    }
}

// Conecta à carteira MetaMask
async function connectWallet() {
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Atualiza a interface
        const address = await signer.getAddress();
        document.getElementById('eoaAddress').textContent = address;
        
        const balance = await provider.getBalance(address);
        document.getElementById('eoaBalance').textContent = ethers.utils.formatEther(balance);
        
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('createSmartWallet').disabled = false;
        
        // Inicializa contratos
        factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
        entryPointContract = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, signer);
        
        console.log("Carteira conectada:", address);
    } catch (error) {
        console.error("Erro ao conectar carteira:", error);
        alert("Falha ao conectar à carteira: " + error.message);
    }
}

// Cria uma nova carteira inteligente
async function createSmartWallet() {
    try {
        document.getElementById('createSmartWallet').disabled = true;
        
        const ownerAddress = await signer.getAddress();
        const salt = Math.floor(Math.random() * 1000000);
        
        // Verifica se a carteira já existe
        smartWalletAddress = await factoryContract.getAddress(ownerAddress, salt);
        const code = await provider.getCode(smartWalletAddress);
        
        if (code === '0x') {
            // Carteira ainda nao existe, vamos criá-la
            console.log("Criando nova carteira inteligente...");
            const tx = await factoryContract.createAccount(ownerAddress, salt);
            
            document.getElementById('txStatusText').textContent = "Criando carteira...";
            document.getElementById('txHash').textContent = tx.hash;
            document.getElementById('txStatus').classList.remove('hidden');
            
            await tx.wait();
            console.log("Carteira criada com sucesso!");
        } else {
            console.log("Carteira já existe!");
        }
        
        // Atualiza a interface
        document.getElementById('smartWalletAddress').textContent = smartWalletAddress;
        
        const balance = await provider.getBalance(smartWalletAddress);
        document.getElementById('smartWalletBalance').textContent = ethers.utils.formatEther(balance);
        
        document.getElementById('smartWalletInfo').classList.remove('hidden');
        document.getElementById('txStatusText').textContent = "Carteira criada com sucesso!";
        
        // Inicializa o contrato da carteira inteligente
        smartWalletContract = new ethers.Contract(smartWalletAddress, SMART_WALLET_ABI, signer);
        
    } catch (error) {
        console.error("Erro ao criar carteira inteligente:", error);
        alert("Falha ao criar carteira inteligente: " + error.message);
        document.getElementById('createSmartWallet').disabled = false;
    }
}

// Deposita ETH na carteira inteligente
async function depositToWallet() {
    try {
        if (!smartWalletAddress) {
            alert("Crie uma carteira inteligente primeiro!");
            return;
        }
        
        const tx = await signer.sendTransaction({
            to: smartWalletAddress,
            value: ethers.utils.parseEther("0.01")
        });
        
        document.getElementById('txStatusText').textContent = "Depositando ETH...";
        document.getElementById('txHash').textContent = tx.hash;
        document.getElementById('txStatus').classList.remove('hidden');
        
        await tx.wait();
        
        // Atualiza o saldo
        const balance = await provider.getBalance(smartWalletAddress);
        document.getElementById('smartWalletBalance').textContent = ethers.utils.formatEther(balance);
        
        document.getElementById('txStatusText').textContent = "Depósito concluído!";
        
    } catch (error) {
        console.error("Erro ao depositar ETH:", error);
        alert("Falha ao depositar ETH: " + error.message);
    }
}

// Envia uma transação através da carteira inteligente usando ERC-4337
async function sendTransaction() {
    try {
        if (!smartWalletAddress) {
            alert("Crie uma carteira inteligente primeiro!");
            return;
        }
        
        const toAddress = document.getElementById('toAddress').value;
        const amount = document.getElementById('amount').value;
        
        if (!ethers.utils.isAddress(toAddress)) {
            alert("Endereço de destino inválido!");
            return;
        }
        
        if (parseFloat(amount) <= 0) {
            alert("Valor deve ser maior que zero!");
            return;
        }
        
        document.getElementById('txStatusText').textContent = "Preparando transação...";
        document.getElementById('txStatus').classList.remove('hidden');
        
        // Método 1: Transação direta (nao usa ERC-4337)
        // Descomente este bloco para usar a abordagem tradicional
        /*
        const tx = await smartWalletContract.execute(
            toAddress,
            ethers.utils.parseEther(amount),
            "0x"
        );
        */
        
        // Método 2: Usando o SponsorPaymaster
        const tx = await entryPointContract.handleOps(
            [
                {
                    sender: smartWalletAddress,
                    nonce: 0,
                    initCode: "0x",
                    callData: ethers.utils.defaultAbiCoder.encode(
                        ["address", "uint256", "bytes"],
                        [toAddress, ethers.utils.parseEther(amount), "0x"]
                    ),
                    callGasLimit: 0,
                    verificationGasLimit: 0,
                    preVerificationGas: 0,
                    maxFeePerGas: 0,
                    maxPriorityFeePerGas: 0,
                    paymasterAndData: "0x",
                    signature: "0x"
                }
            ],
            address(this)
        );
        
        document.getElementById('txStatusText').textContent = "Transação enviada com sucesso!";
        document.getElementById('txHash').textContent = tx.hash;
        
    } catch (error) {
        console.error("Erro ao enviar transação:", error);
        alert("Falha ao enviar transação: " + error.message);
    }
}
