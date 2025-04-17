import { ethers } from 'ethers';
import { ENTRY_POINT_ADDRESS, FACTORY_ADDRESS } from '../config/contracts';
import EntryPointABI from '../abis/EntryPoint.json';
import SimpleAccountFactoryABI from '../abis/SimpleAccountFactory.json';
import SimpleAccountABI from '../abis/SimpleAccount.json';

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.entryPoint = null;
    this.factory = null;
    this.account = null;
    this.smartWalletAddress = null;
    this.smartWallet = null;
  }

  async initialize() {
    if (window.ethereum) {
      try {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = this.provider.getSigner();
        
        // Inicializar contratos
        this.entryPoint = new ethers.Contract(
          ENTRY_POINT_ADDRESS,
          EntryPointABI,
          this.signer
        );
        
        this.factory = new ethers.Contract(
          FACTORY_ADDRESS,
          SimpleAccountFactoryABI,
          this.signer
        );
        
        this.account = await this.signer.getAddress();
        
        return true;
      } catch (error) {
        console.error('Erro ao inicializar Web3Service:', error);
        return false;
      }
    }
    
    return false;
  }
  
  async initializeSmartWallet(walletAddress) {
    if (!this.provider || !walletAddress) return false;
    
    try {
      this.smartWalletAddress = walletAddress;
      this.smartWallet = new ethers.Contract(
        walletAddress,
        SimpleAccountABI,
        this.signer
      );
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar smart wallet:', error);
      return false;
    }
  }
  
  async createSmartWallet(salt = Math.floor(Math.random() * 1000000)) {
    try {
      if (!this.factory) {
        throw new Error('Factory nao inicializada');
      }
      
      // Calcular endereço da carteira antes de criar
      this.smartWalletAddress = await this.factory.getAddress(this.account, salt);
      
      // Verificar se a carteira já existe
      const code = await this.provider.getCode(this.smartWalletAddress);
      
      if (code === '0x') {
        // Carteira ainda nao existe, vamos criá-la
        const tx = await this.factory.createAccount(this.account, salt);
        await tx.wait();
      }
      
      // Inicializar contrato da carteira
      this.smartWallet = new ethers.Contract(
        this.smartWalletAddress,
        SimpleAccountABI,
        this.signer
      );
      
      return this.smartWalletAddress;
    } catch (error) {
      console.error('Erro ao criar carteira:', error);
      throw error;
    }
  }
  
  async executeTransaction(target, value, data = '0x') {
    if (!this.smartWallet) {
      throw new Error('Smart Wallet nao inicializada');
    }
    
    try {
      const tx = await this.smartWallet.execute(
        target,
        ethers.utils.parseEther(value.toString()),
        data,
        { gasLimit: 1000000 }
      );
      
      return await tx.wait();
    } catch (error) {
      console.error('Erro ao executar transação:', error);
      throw error;
    }
  }
  
  async executeGaslessTransaction(target, value, paymaster, paymasterData = '0x') {
    if (!this.smartWallet || !this.entryPoint) {
      throw new Error('Smart Wallet ou EntryPoint nao inicializados');
    }
    
    try {
      // Lógica para criar e enviar uma userOperation via EntryPoint
      // Este é um exemplo simplificado, a implementação real precisaria
      // gerar a userOperation com seus campos corretos
      
      const callData = this.smartWallet.interface.encodeFunctionData(
        'execute',
        [target, ethers.utils.parseEther(value.toString()), '0x']
      );
      
      // Preparar a userOperation
      const userOp = {
        sender: this.smartWalletAddress,
        nonce: await this.smartWallet.getNonce(),
        initCode: '0x',
        callData,
        callGasLimit: ethers.utils.hexlify(1000000),
        verificationGasLimit: ethers.utils.hexlify(1000000),
        preVerificationGas: ethers.utils.hexlify(1000000),
        maxFeePerGas: ethers.utils.hexlify(0),
        maxPriorityFeePerGas: ethers.utils.hexlify(0),
        paymasterAndData: ethers.utils.hexConcat([paymaster, paymasterData]),
        signature: '0x'
      };
      
      // Obter hash para assinar
      const userOpHash = await this.entryPoint.getUserOpHash(userOp);
      
      // Assinar a operação
      const signature = await this.signer.signMessage(ethers.utils.arrayify(userOpHash));
      userOp.signature = signature;
      
      // Enviar a operação
      const tx = await this.entryPoint.handleOps([userOp], this.account);
      return await tx.wait();
    } catch (error) {
      console.error('Erro ao executar transação gasless:', error);
      throw error;
    }
  }
  
  async getSmartWalletBalance() {
    if (!this.provider || !this.smartWalletAddress) {
      return '0';
    }
    
    try {
      const balance = await this.provider.getBalance(this.smartWalletAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Erro ao obter saldo da smart wallet:', error);
      return '0';
    }
  }
  
  reset() {
    this.provider = null;
    this.signer = null;
    this.entryPoint = null;
    this.factory = null;
    this.account = null;
    this.smartWalletAddress = null;
    this.smartWallet = null;
  }
}

// Exporta uma instância singleton
export default new Web3Service(); 