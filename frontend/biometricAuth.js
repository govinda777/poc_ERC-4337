/**
 * Módulo de Autenticacao Biométrica para ERC-4337
 * 
 * Este módulo fornece funções para interagir com contas do tipo BiometricAuthAccount,
 * implementando a interface necessária para Autenticacao biométrica em dispositivos móveis.
 */

// Endereços dos contratos implantados (serão carregados dinamicamente)
let BIOMETRIC_FACTORY_ADDRESS = null;
let ENTRY_POINT_ADDRESS = null;

// ABIs dos contratos
const BIOMETRIC_ACCOUNT_ABI = [
  "function execute(address dest, uint256 value, bytes calldata func) external",
  "function admin() public view returns (address)",
  "function authorizedDevices(address) public view returns (bool)",
  "function deviceCount() public view returns (uint)",
  "function minDevices() public view returns (uint)",
  "function addDevice(address device) external",
  "function removeDevice(address device) external",
  "function updateMinDevices(uint newMinDevices) external"
];

const BIOMETRIC_FACTORY_ABI = [
  "function createAccount(address admin, address[] calldata devices, uint minDevices, uint256 salt) public returns (address)",
  "function getAddress(address admin, address[] calldata devices, uint minDevices, uint256 salt) public view returns (address)"
];

// Interface para o objeto principal
const BiometricAuth = {
  provider: null,
  signer: null,
  factory: null,
  account: null,
  accountAddress: null,
  
  /**
   * Inicializa o módulo de Autenticacao biométrica
   * @param {Object} config Configuração de endereços
   * @returns {Promise<void>}
   */
  async init(config) {
    // Verifica se o provider esta disponível
    if (!window.ethereum) {
      throw new Error("Provedor Ethereum nao encontrado. Por favor, instale o MetaMask.");
    }
    
    // Configura o provider e signer
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    
    // Carrega endereços
    BIOMETRIC_FACTORY_ADDRESS = config.biometricFactoryAddress;
    ENTRY_POINT_ADDRESS = config.entryPointAddress;
    
    // Inicializa o contrato da factory
    this.factory = new ethers.Contract(
      BIOMETRIC_FACTORY_ADDRESS,
      BIOMETRIC_FACTORY_ABI,
      this.signer
    );
    
    console.log("BiometricAuth inicializado com sucesso");
  },
  
  /**
   * Verifica se o dispositivo suporta Autenticacao biométrica
   * @returns {Promise<boolean>} Verdadeiro se o dispositivo suportar biometria
   */
  async isBiometricsAvailable() {
    try {
      // Verificar se o navegador suporta a API Web Authentication
      if (!window.PublicKeyCredential) {
        console.log("Web Authentication API nao suportada");
        return false;
      }
      
      // Verificar se o dispositivo suporta Autenticacao biométrica
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log(`Autenticacao biométrica ${available ? '' : 'nao '}disponível`);
      return available;
    } catch (error) {
      console.error("Erro ao verificar disponibilidade biométrica:", error);
      return false;
    }
  },
  
  /**
   * Cria uma nova conta com Autenticacao biométrica
   * @returns {Promise<{accountAddress: string, deviceKey: string}>} Endereço da conta e chave do dispositivo
   */
  async createBiometricAccount() {
    try {
      // Verifica se biometria esta disponível
      const biometricsAvailable = await this.isBiometricsAvailable();
      if (!biometricsAvailable) {
        throw new Error("Autenticacao biométrica nao disponível neste dispositivo");
      }
      
      // Solicita Autenticacao biométrica para criar novo par de chaves
      const deviceKey = await this._createBiometricKey("create-account");
      
      // Obtém a carteira conectada como admin
      const admin = await this.signer.getAddress();
      
      // Define dispositivos e configurações
      const devices = [deviceKey];
      const minDevices = 1;
      const salt = Math.floor(Math.random() * 1000000);
      
      // Calcula o endereço da conta antes de criá-la
      const accountAddress = await this.factory.getAddress(admin, devices, minDevices, salt);
      console.log("Endereço previsto da conta:", accountAddress);
      
      // Cria a conta
      const tx = await this.factory.createAccount(admin, devices, minDevices, salt);
      await tx.wait();
      
      // Configura a conta recém-criada
      this.accountAddress = accountAddress;
      this.account = new ethers.Contract(
        accountAddress,
        BIOMETRIC_ACCOUNT_ABI,
        this.signer
      );
      
      return {
        accountAddress,
        deviceKey
      };
    } catch (error) {
      console.error("Erro ao criar conta biométrica:", error);
      throw error;
    }
  },
  
  /**
   * Conecta a uma conta biométrica existente
   * @param {string} accountAddress Endereço da conta biométrica
   * @returns {Promise<void>}
   */
  async connectToAccount(accountAddress) {
    try {
      // Conecta ao contrato da conta
      this.accountAddress = accountAddress;
      this.account = new ethers.Contract(
        accountAddress,
        BIOMETRIC_ACCOUNT_ABI,
        this.signer
      );
      
      // Verifica se a conta existe
      const admin = await this.account.admin();
      console.log("Conectado à conta biométrica. Admin:", admin);
    } catch (error) {
      console.error("Erro ao conectar à conta biométrica:", error);
      throw error;
    }
  },
  
  /**
   * Executa uma transação usando Autenticacao biométrica
   * @param {string} to Endereço de destino
   * @param {string|ethers.BigNumber} value Valor em wei
   * @param {string} data Dados da chamada
   * @returns {Promise<ethers.providers.TransactionResponse>} Resposta da transação
   */
  async executeTransaction(to, value, data) {
    try {
      // Verifica se a conta esta configurada
      if (!this.account) {
        throw new Error("Conta biométrica nao configurada");
      }
      
      // Solicita Autenticacao biométrica
      await this._authenticateWithBiometrics("transaction");
      
      // Executa a transação
      const tx = await this.account.execute(to, value, data || "0x");
      return tx;
    } catch (error) {
      console.error("Erro ao executar transação biométrica:", error);
      throw error;
    }
  },
  
  /**
   * Adiciona um novo dispositivo à conta
   * @returns {Promise<string>} Endereço do novo dispositivo
   */
  async addNewDevice() {
    try {
      // Verifica se a conta esta configurada
      if (!this.account) {
        throw new Error("Conta biométrica nao configurada");
      }
      
      // Solicita Autenticacao biométrica para criar novo par de chaves
      const deviceKey = await this._createBiometricKey("add-device");
      
      // Adiciona o dispositivo à conta
      const tx = await this.account.addDevice(deviceKey);
      await tx.wait();
      
      console.log("Novo dispositivo adicionado:", deviceKey);
      return deviceKey;
    } catch (error) {
      console.error("Erro ao adicionar novo dispositivo:", error);
      throw error;
    }
  },
  
  /**
   * Cria um par de chaves associado à biometria
   * @param {string} action Ação que esta sendo realizada
   * @returns {Promise<string>} Endereço Ethereum derivado
   * @private
   */
  async _createBiometricKey(action) {
    try {
      // Na implementação real, isso usaria a API Web Authentication
      // para criar um par de chaves associado à biometria do usuário
      
      // Cria um novo par de chaves aleatório para simular o processo
      const wallet = ethers.Wallet.createRandom();
      
      // Simula uma solicitação de Autenticacao biométrica
      await this._simulateBiometricPrompt(`Autenticar para ${action}`);
      
      // Retorna o endereço derivado da chave pública
      return wallet.address;
    } catch (error) {
      console.error("Erro ao criar chave biométrica:", error);
      throw error;
    }
  },
  
  /**
   * Autentica o usuário usando biometria
   * @param {string} action Ação que esta sendo autenticada
   * @returns {Promise<void>}
   * @private
   */
  async _authenticateWithBiometrics(action) {
    try {
      // Na implementação real, isso usaria a API Web Authentication
      // para verificar a identidade do usuário com biometria
      
      // Simula uma solicitação de Autenticacao biométrica
      await this._simulateBiometricPrompt(`Autenticar para ${action}`);
    } catch (error) {
      console.error("Erro na Autenticacao biométrica:", error);
      throw error;
    }
  },
  
  /**
   * Simula uma solicitação de Autenticacao biométrica
   * @param {string} message Mensagem a ser exibida
   * @returns {Promise<void>}
   * @private
   */
  async _simulateBiometricPrompt(message) {
    return new Promise((resolve, reject) => {
      // Em uma implementação real, isso seria substituído pela API WebAuthn
      // Esta é apenas uma simulação para fins de demonstração
      
      // Simula o tempo de processamento da biometria
      setTimeout(() => {
        const confirmed = window.confirm(`${message}\n\n[Esta é uma simulação de Autenticacao biométrica]`);
        if (confirmed) {
          resolve();
        } else {
          reject(new Error("Autenticacao biométrica cancelada pelo usuário"));
        }
      }, 1000);
    });
  }
};

// Exporta o módulo
window.BiometricAuth = BiometricAuth; 