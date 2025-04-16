// Configurações e variáveis globais
const ENTRY_POINT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Substitua pelo endereço real
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000"; // Substitua pelo endereço real
const PAYMASTER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Substitua pelo endereço real
const BUNDLER_URL = "http://localhost:3000/rpc"; // URL do bundler local ou serviço

let provider, signer, smartWalletAddress;
let factoryContract, entryPointContract, smartWalletContract, paymasterContract;

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
    "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] calldata ops, address beneficiary) external",
    "function getNonce(address sender, uint192 key) public view returns (uint256 nonce)",
    "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)) public view returns (bytes32)"
];

const PAYMASTER_ABI = [
    "function sponsoredAddresses(address) public view returns (bool)",
    "function sponsoredApps(address) public view returns (bool)",
    "function sponsorAddress(address account) external",
    "function addressLimits(address) public view returns (uint256 dailyLimit, uint256 txLimit, uint256 usedToday, uint256 lastReset)"
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
        paymasterContract = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, signer);
        
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
        
        // Verifica se a carteira ou o destino estão patrocinados
        let isAccountSponsored = false;
        let isAppSponsored = false;
        
        try {
            isAccountSponsored = await paymasterContract.sponsoredAddresses(smartWalletAddress);
            isAppSponsored = await paymasterContract.sponsoredApps(toAddress);
            
            if (!isAccountSponsored && !isAppSponsored) {
                // Tenta patrocinar a carteira automaticamente
                try {
                    document.getElementById('txStatusText').textContent = "Conta não patrocinada. Patrocinando...";
                    const sponsorTx = await paymasterContract.sponsorAddress(smartWalletAddress);
                    await sponsorTx.wait();
                    document.getElementById('txStatusText').textContent = "Conta patrocinada com sucesso!";
                    isAccountSponsored = true;
                } catch (sponsorError) {
                    console.error("Erro ao patrocinar a conta:", sponsorError);
                    document.getElementById('txStatusText').textContent = "Erro ao patrocinar a conta. Tentando transação normal...";
                }
            } else {
                if (isAccountSponsored) {
                    document.getElementById('txStatusText').textContent += " Conta patrocinada.";
                }
                if (isAppSponsored) {
                    document.getElementById('txStatusText').textContent += " Aplicativo patrocinado.";
                }
            }
        } catch (error) {
            console.error("Erro ao verificar patrocínio:", error);
            document.getElementById('txStatusText').textContent += " Não foi possível verificar patrocínio.";
        }
        
        // Método 1: Transação direta se não for patrocinado
        if (!isAccountSponsored && !isAppSponsored) {
            document.getElementById('txStatusText').textContent = "Enviando transação direta...";
            const tx = await smartWalletContract.execute(
                toAddress,
                ethers.utils.parseEther(amount),
                "0x"
            );
            
            document.getElementById('txStatusText').textContent = "Transação enviada com sucesso!";
            document.getElementById('txHash').textContent = tx.hash;
            
            // Aguarda a confirmação da transação
            const receipt = await tx.wait();
            document.getElementById('txStatusText').textContent = "Transação confirmada!";
            return;
        }
        
        // Método 2: Usando o SponsorPaymaster (gasless transaction)
        document.getElementById('txStatusText').textContent = "Preparando transação sem custo de gas...";
        
        // Cria o callData para a transação
        const callData = smartWalletContract.interface.encodeFunctionData("execute", [
            toAddress,
            ethers.utils.parseEther(amount),
            "0x" // Sem dados adicionais
        ]);
        
        // Obtém o nonce atual
        const nonce = await entryPointContract.getNonce(smartWalletAddress, 0);
        
        // Obtém os preços de gás atuais
        const feeData = await provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.BigNumber.from(1);
        
        // Cria a UserOperation
        const userOp = {
            sender: smartWalletAddress,
            nonce: nonce.toString(),
            initCode: "0x",
            callData: callData,
            callGasLimit: ethers.utils.hexlify(3000000),
            verificationGasLimit: ethers.utils.hexlify(1000000),
            preVerificationGas: ethers.utils.hexlify(1000000),
            maxFeePerGas: ethers.utils.hexlify(maxFeePerGas),
            maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFeePerGas),
            paymasterAndData: paymasterContract.address + "0x",
            signature: "0x"
        };
        
        // Calcula o hash da UserOperation
        const userOpHash = await entryPointContract.getUserOpHash(userOp);
        
        // Assina o hash da UserOperation
        const signature = await signer.signMessage(ethers.utils.arrayify(userOpHash));
        userOp.signature = signature;
        
        document.getElementById('txStatusText').textContent = "Enviando transação sem custo de gas...";
        
        // Envia a UserOperation
        const tx = await entryPointContract.handleOps([userOp], await signer.getAddress());
        
        document.getElementById('txStatusText').textContent = "Transação enviada com sucesso!";
        document.getElementById('txHash').textContent = tx.hash;
        
        // Aguarda a confirmação da transação
        const receipt = await tx.wait();
        
        // Procura eventos do paymaster
        const sponsorEvents = receipt.logs
            .filter(log => log.address.toLowerCase() === paymasterContract.address.toLowerCase())
            .map(log => {
                try {
                    return paymasterContract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean);
            
        if (sponsorEvents.length > 0) {
            const gasEvent = sponsorEvents.find(e => e.name === "GasSponsored");
            if (gasEvent) {
                const gasUsed = ethers.utils.formatEther(gasEvent.args.gasUsed);
                document.getElementById('txStatusText').textContent = 
                    `Transação confirmada! Gas patrocinado: ${gasUsed} ETH`;
            } else {
                document.getElementById('txStatusText').textContent = "Transação confirmada!";
            }
        } else {
            document.getElementById('txStatusText').textContent = "Transação confirmada!";
        }
        
        // Atualiza o saldo após a transação
        const balance = await provider.getBalance(smartWalletAddress);
        document.getElementById('smartWalletBalance').textContent = ethers.utils.formatEther(balance);
        
    } catch (error) {
        console.error("Erro ao enviar transação:", error);
        document.getElementById('txStatusText').textContent = "Falha na transação: " + error.message;
        
        // Tenta extrair o motivo da falha se possível
        if (error.data) {
            try {
                // Alguns nós retornam o motivo da falha desta forma
                const reason = ethers.utils.toUtf8String("0x" + error.data.substring(10));
                document.getElementById('txStatusText').textContent += " Motivo: " + reason;
            } catch (e) {
                // Se não conseguir decodificar o motivo, apenas registra o erro
                console.error("Erro ao decodificar o motivo da falha:", e);
            }
        }
    }
} 