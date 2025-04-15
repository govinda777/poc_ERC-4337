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

## Casos de test

O ERC-4332 introduz a **abstração de contas** na Ethereum, resolvendo desafios críticos e habilitando novos casos de uso.

- [x] 1. **Carteiras Inteligentes com Recuperação Social**
- Permite redefinir chaves perdidas usando métodos como verificação por dispositivos confiáveis ou contatos predefinidos, eliminando a dependência de frases-semente[5][4].
- Exemplo: Recuperação via autenticação em dois fatores (2FA) ou biometria (digital/facial)[1][5].

- [x] 2. **Transações Sem Custos de Gas (Gasless Transactions)**
- Terceiros (como aplicativos ou patrocinadores) podem pagar taxas de rede, permitindo que usuários interajam com dApps sem precisar de ETH para gas[2][4].
- Caso de uso: Promoções em jogos NFTs onde a plataforma subsidia o minting[1][5].

- [x] 3. **Assinaturas Múltiplas e Controles Personalizados**
- Crie regras complexas para transações, como exigir aprovação de múltiplas partes (ex: 2 de 3 assinaturas) ou limitar valores diários[4][5].
- Aplicação: Gestão de fundos corporativos ou tesourarias DAO com requisitos de segurança elevados[1][4].

- [x] 4. **Pagamentos Recorrentes e Assinaturas**
- Automatize transações periódicas (ex: assinaturas de serviços) sem intervenção manual, usando lógica programável em contratos inteligentes[4][5].
- Exemplo: Plataformas de streaming descentralizadas com cobrança mensal automática[1].

- [ ] 5. **Experiência Simplificada para Novos Usuários**
- Criação de contas com autenticação biométrica (digital/facial) em smartphones, substituindo frases-semente complexas[1][5].
- Impacto: Redução de barreiras para adoção em massa, especialmente para usuários não técnicos[1][4].

- [ ] 6. **Interações em Lote (Batch Transactions)**
- Execute múltiplas ações em uma única transação (ex: comprar NFT e aprovar token em um passo), reduzindo custos e complexidade[2][4].
- Uso prático: Mercados descentralizados que combinam transferência e listagem de ativos[1].

- [ ] 7. **Gestão Avançada de Ativos em Jogos e Metaverso**
- Contratos inteligentes gerenciam portfólios de usuários, permitindo transações automáticas de itens dentro de jogos ou mundos virtuais[1][3].
- Exemplo: Venda de terrenos virtuais (representados por NFTs) com pagamento parcelado via smart contracts[3][5].

### Benefícios Gerais para Adoção em Massa
- **Segurança reforçada:** Menos riscos de perda de chaves e fraudes[4][5].
- **Custos reduzidos:** Modelos de pagamento inovadores (ex: pay-as-you-go)[1][4].
- **Interoperabilidade:** Identidades e ativos portáveis entre diferentes dApps[3][5].

## Transações Sem Custos de Gas (Gasless Transactions)

Esta funcionalidade já está implementada no projeto. Veja como usar:

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
3. Quando uma UserOperation é enviada através do EntryPoint, o paymaster verifica se o remetente ou o destino está na lista de patrocinados
4. Se estiver, o paymaster paga as taxas de gas em nome do usuário
5. O financiador do paymaster (dono do contrato) é quem arca com os custos de gas

Esse modelo é particularmente útil para:
- Onboarding de novos usuários (que não possuem ETH)
- Promoções em jogos NFT (mint sem custo de gas)
- Melhorar a experiência do usuário em dApps

## Assinaturas Múltiplas e Controles Personalizados

Esta funcionalidade já está implementada no projeto. Veja como usar:

### 1. Implantar a MultiSigAccountFactory

```bash
npx hardhat run scripts/deployMultiSigFactory.js --network localhost
```

### 2. Criar uma conta MultiSig

```bash
# Formato: npx hardhat run scripts/createMultiSigAccount.js -- <threshold> <dailyLimit> <txLimit> <owner1,owner2,...>
# Exemplo para carteira 2-de-3 com limite diário de 1 ETH e limite por transação de 0.5 ETH:
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
2. **Aprovação por quórum**: número mínimo de assinaturas para aprovar transações
3. **Limites de valores**: limites por transação e diários
4. **Expiração de propostas**: transações que não são executadas em tempo hábil expiram
5. **Gerenciamento de permissões**: adicionar/remover donos via aprovação MultiSig

Ideal para:
- Tesourarias corporativas
- Gestão de fundos de DAOs
- Contas compartilhadas entre equipes
- Segurança adicional para fundos significativos

## Pagamentos Recorrentes e Assinaturas

Esta funcionalidade já está implementada no projeto. Veja como usar:

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
        require(msg.sender == owner || msg.sender == address(this), "não é o proprietário");
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
        require(dest.length == func.length, "tamanhos de arrays incompatíveis");
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
    
    // Verifica se o MetaMask está instalado
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Verifica se já está conectado
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
            // Carteira ainda não existe, vamos criá-la
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
        
        // Método 1: Transação direta (não usa ERC-4337)
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
