# poc_ERC-4337

Vou criar uma POC (Prova de Conceito) completa e didática para implementar o ERC-4337. Vamos dividir em partes claras para facilitar o entendimento.

# POC Completa de Implementação do ERC-4337

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

```
