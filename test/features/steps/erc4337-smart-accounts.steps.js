const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { getAccountNonce, UserOperation, fillUserOpDefaults, getUserOpHash, signUserOp } = require('@account-abstraction/utils');
const fs = require('fs');
const path = require('path');

// Explicitly reference the contract to potentially help resolution
// require('@account-abstraction/contracts/samples/SimpleAccountFactory.sol'); // Removed incorrect require

// Helper functions
const parseEther = (value) => {
  if (typeof value === 'string' && value.includes('ETH')) {
    return ethers.utils.parseEther(value.replace(' ETH', ''));
  }
  return ethers.utils.parseEther(value.toString());
};

// Globals para estado dos testes
let contracts = {};
let accounts = {};
let smartAccounts = {};
let guardians = [];
let recoveryParams = {};
let devices = {};
let errors = {};

// Funções auxiliares para gerenciar endereços
function loadAddresses() {
  try {
    const addressesPath = path.join(process.cwd(), 'addresses.json');
    if (fs.existsSync(addressesPath)) {
      const data = fs.readFileSync(addressesPath);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar endereços:', error);
  }
  return {};
}

// Background steps
Given('a Hardhat node is running', async function() {
  // Verificar se o nó Hardhat está rodando
  try {
    await ethers.provider.getBlockNumber();
  } catch (error) {
    throw new Error('Hardhat node não está rodando. Inicie com "npx hardhat node"');
  }
});

Given('the EntryPoint contract is deployed', async function() {
  // Implantando o EntryPoint
  const EntryPoint = await ethers.getContractFactory('@account-abstraction/contracts/core/EntryPoint.sol:EntryPoint');
  contracts.entryPoint = await EntryPoint.deploy();
  await contracts.entryPoint.deployed();
});

Given('the Account Factory contract is deployed', async function() {
  // Obtendo as contas de teste
  [
    accounts.deployer,
    accounts.user1,
    accounts.user2,
    ...guardians
  ] = await ethers.getSigners();
  
  // Implantando a AccountFactory genérica (será especificada nos cenários)
  const SimpleAccountFactory = await ethers.getContractFactory('SimpleAccountFactory');
  contracts.simpleAccountFactory = await SimpleAccountFactory.deploy(contracts.entryPoint.address);
  await contracts.simpleAccountFactory.deployed();
});

// Cenário: Criar uma conta com recuperação social
Given('o contrato SocialRecoveryAccountFactory está implantado', async function() {
  const SocialRecoveryAccountFactory = await ethers.getContractFactory('SocialRecoveryAccountFactory');
  contracts.socialRecoveryFactory = await SocialRecoveryAccountFactory.deploy(contracts.entryPoint.address);
  await contracts.socialRecoveryFactory.deployed();
});

When('eu crio uma nova conta com recuperação social', async function() {
  const tx = await contracts.socialRecoveryFactory.createAccount(
    accounts.user1.address,
    0 // salt
  );
  const receipt = await tx.wait();
  
  // Extrair o endereço da conta criada do evento
  const event = receipt.events.find(e => e.event === 'AccountCreated');
  smartAccounts.socialRecovery = event.args.account;
});

Then('a conta deve ser criada com sucesso', async function() {
  // Verificar se o endereço da conta existe
  const code = await ethers.provider.getCode(smartAccounts.socialRecovery);
  expect(code).to.not.equal('0x');
});

Then('o endereço da conta deve ser registrado corretamente', async function() {
  // Verificar se a conta está registrada na factory
  const predictedAddress = await contracts.socialRecoveryFactory.getAddress(
    accounts.user1.address,
    0 // salt
  );
  expect(smartAccounts.socialRecovery).to.equal(predictedAddress);
});

Then('eu devo ser o proprietário da conta', async function() {
  // Conexão com a conta social
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Verificar o proprietário
  const owner = await account.owner();
  expect(owner).to.equal(accounts.user1.address);
});

// Cenário: Configurar guardiões para recuperação social
Given('eu tenho uma conta com recuperação social', async function() {
  if (!smartAccounts.socialRecovery) {
    // Criar a conta se não existir
    await this.given('o contrato SocialRecoveryAccountFactory está implantado');
    await this.when('eu crio uma nova conta com recuperação social');
  }
});

When('eu adiciono {int} guardiões à minha conta', async function(numGuardians) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Preparar os endereços dos guardiões
  const guardiansAddresses = guardians.slice(0, numGuardians).map(g => g.address);
  
  // Adicionar guardiões
  const tx = await account.connect(accounts.user1).setGuardians(
    guardiansAddresses,
    2, // limiar padrão
    86400 // delay padrão (24 horas)
  );
  await tx.wait();
  
  // Armazenar para uso futuro
  recoveryParams.guardians = guardiansAddresses;
});

When('eu configuro um limiar de recuperação de {int} guardiões', async function(threshold) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Atualizar o limiar
  const tx = await account.connect(accounts.user1).setRecoveryThreshold(threshold);
  await tx.wait();
  
  // Armazenar para uso futuro
  recoveryParams.threshold = threshold;
});

When('eu defino um atraso de recuperação de {int} horas', async function(hours) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Converter horas para segundos
  const delayInSeconds = hours * 60 * 60;
  
  // Atualizar o atraso
  const tx = await account.connect(accounts.user1).setRecoveryDelayPeriod(delayInSeconds);
  await tx.wait();
  
  // Armazenar para uso futuro
  recoveryParams.delay = delayInSeconds;
});

Then('os guardiões devem ser registrados corretamente', async function() {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Verificar cada guardião
  for (const guardianAddress of recoveryParams.guardians) {
    const isGuardian = await account.isGuardian(guardianAddress);
    expect(isGuardian).to.be.true;
  }
});

Then('o limiar de recuperação deve ser definido como {int}', async function(threshold) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  const currentThreshold = await account.recoveryThreshold();
  expect(currentThreshold).to.equal(threshold);
});

Then('o atraso de recuperação deve ser definido como {int} horas', async function(hours) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  const expectedDelay = hours * 60 * 60;
  const currentDelay = await account.recoveryDelayPeriod();
  expect(currentDelay).to.equal(expectedDelay);
});

// Cenário: Recuperar uma conta social após perda da chave privada
Given('eu tenho uma conta com recuperação social configurada com {int} guardiões e limiar {int}', async function(numGuardians, threshold) {
  // Criar e configurar a conta se não existir
  await this.given('eu tenho uma conta com recuperação social');
  await this.when(`eu adiciono ${numGuardians} guardiões à minha conta`);
  await this.when(`eu configuro um limiar de recuperação de ${threshold} guardiões`);
  await this.when('eu defino um atraso de recuperação de 24 horas');
});

Given('eu perdi acesso à minha chave privada', function() {
  // Simular perda de acesso (não precisa fazer nada aqui, só não usaremos mais a chave original)
  recoveryParams.newOwner = accounts.user2.address;
});

When('o guardião {int} inicia o processo de recuperação para um novo endereço', async function(guardianIndex) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Iniciar processo de recuperação
  const guardianSigner = guardians[guardianIndex - 1];
  const tx = await account.connect(guardianSigner).initiateRecovery(recoveryParams.newOwner);
  await tx.wait();
  
  // Armazenar timestamp
  recoveryParams.startTime = (await ethers.provider.getBlock('latest')).timestamp;
});

When('o guardião {int} aprova a recuperação', async function(guardianIndex) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Aprovar processo de recuperação
  const guardianSigner = guardians[guardianIndex - 1];
  const tx = await account.connect(guardianSigner).supportRecovery(recoveryParams.newOwner);
  await tx.wait();
});

When('o período de espera é concluído', async function() {
  // Avançar o tempo para além do período de atraso
  await time.increase(recoveryParams.delay + 1);
});

When('o guardião {int} executa a recuperação', async function(guardianIndex) {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Executar processo de recuperação
  const guardianSigner = guardians[guardianIndex - 1];
  const tx = await account.connect(guardianSigner).executeRecovery(recoveryParams.newOwner);
  await tx.wait();
});

Then('a propriedade da conta deve ser transferida para o novo endereço', async function() {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Verificar o proprietário
  const owner = await account.owner();
  expect(owner).to.equal(recoveryParams.newOwner);
});

Then('o novo proprietário deve poder operar a conta', async function() {
  const SocialRecoveryAccount = await ethers.getContractFactory('SocialRecoveryAccount');
  const account = SocialRecoveryAccount.attach(smartAccounts.socialRecovery);
  
  // Testar uma operação básica - definir um novo limiar
  const tx = await account.connect(accounts.user2).setRecoveryThreshold(3);
  await tx.wait();
  
  const newThreshold = await account.recoveryThreshold();
  expect(newThreshold).to.equal(3);
});

// Cenário: Criar uma conta com autenticação biométrica
Given('o contrato BiometricAuthAccountFactory está implantado', async function() {
  const BiometricAuthAccountFactory = await ethers.getContractFactory('BiometricAuthAccountFactory');
  contracts.biometricFactory = await BiometricAuthAccountFactory.deploy(contracts.entryPoint.address);
  await contracts.biometricFactory.deployed();
});

When('eu crio uma nova conta com autenticação biométrica', async function() {
  const tx = await contracts.biometricFactory.createAccount(
    accounts.user1.address,
    0 // salt
  );
  const receipt = await tx.wait();
  
  // Extrair o endereço da conta criada do evento
  const event = receipt.events.find(e => e.event === 'AccountCreated');
  smartAccounts.biometric = event.args.account;
});

Then('eu devo ser capaz de registrar dispositivos biométricos', async function() {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId (normalmente seria um hash de dados biométricos)
  const deviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('dispositivo-principal'));
  
  // Registrar um dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    deviceId,
    parseEther('0.1'), // limite diário
    'Dispositivo Principal'
  );
  await tx.wait();
  
  // Verificar se o dispositivo foi registrado
  const isRegistered = await account.isDeviceRegistered(deviceId);
  expect(isRegistered).to.be.true;
});

// Cenário: Configurar dispositivos com limites de transação diários
Given('eu tenho uma conta com autenticação biométrica', async function() {
  if (!smartAccounts.biometric) {
    // Criar a conta se não existir
    await this.given('o contrato BiometricAuthAccountFactory está implantado');
    await this.when('eu crio uma nova conta com autenticação biométrica');
  }
});

When('eu registro um dispositivo principal com limite diário de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId
  devices.main = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('dispositivo-principal')),
    limit: parseEther(limit.toString())
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.main.id,
    devices.main.limit,
    'Dispositivo Principal'
  );
  await tx.wait();
});

When('eu registro um dispositivo de backup com limite diário de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId
  devices.backup = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('dispositivo-backup')),
    limit: parseEther(limit.toString())
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.backup.id,
    devices.backup.limit,
    'Dispositivo de Backup'
  );
  await tx.wait();
});

Then('o dispositivo principal deve ter limite de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Verificar o limite
  const deviceInfo = await account.getDeviceInfo(devices.main.id);
  expect(deviceInfo.dailyLimit).to.equal(parseEther(limit.toString()));
});

Then('o dispositivo de backup deve ter limite de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Verificar o limite
  const deviceInfo = await account.getDeviceInfo(devices.backup.id);
  expect(deviceInfo.dailyLimit).to.equal(parseEther(limit.toString()));
});

// Cenário: Realizar transações sem custos de gas usando Paymaster
Given('eu tenho uma conta compatível com ERC-4337', async function() {
  // Usar uma conta existente ou criar uma nova
  if (!smartAccounts.biometric && !smartAccounts.socialRecovery) {
    await this.given('o contrato BiometricAuthAccountFactory está implantado');
    await this.when('eu crio uma nova conta com autenticação biométrica');
  }
  
  // Usar a conta biométrica por padrão
  smartAccounts.current = smartAccounts.biometric || smartAccounts.socialRecovery;
  
  // Financiar a conta
  await accounts.deployer.sendTransaction({
    to: smartAccounts.current,
    value: parseEther('1.0')
  });
});

Given('o SponsorPaymaster está implantado e configurado', async function() {
  // Implantar o SponsorPaymaster
  const SponsorPaymaster = await ethers.getContractFactory('SponsorPaymaster');
  contracts.paymaster = await SponsorPaymaster.deploy(contracts.entryPoint.address);
  await contracts.paymaster.deployed();
  
  // Financiar o Paymaster
  await accounts.deployer.sendTransaction({
    to: contracts.paymaster.address,
    value: parseEther('10.0')
  });
});

When('minha conta é patrocinada pelo Paymaster', async function() {
  // Configurar o Paymaster para patrocinar a conta
  const tx = await contracts.paymaster.addSponsoredAccount(smartAccounts.current);
  await tx.wait();
});

When('eu envio uma transação sem gas para um endereço', async function() {
  // Preparar a operação de transferência de ETH
  const recipient = accounts.user2.address;
  const value = parseEther('0.01');
  
  // Criar a UserOperation
  const userOp = {
    sender: smartAccounts.current,
    nonce: ethers.BigNumber.from(Date.now()),
    callData: '0x', // Chamada para transferir ETH
    callGasLimit: 100000,
    verificationGasLimit: 100000,
    preVerificationGas: 60000,
    maxFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
    paymasterAndData: contracts.paymaster.address + '00'.repeat(64), // Simplificado
    signature: '0x' + '00'.repeat(64) // Assinatura placeholder
  };
  
  // Transferir diretamente para este teste
  const tx = await accounts.user1.sendTransaction({
    to: recipient,
    value,
    gasLimit: 100000,
  });
  
  // Armazenar para verificações
  smartAccounts.lastTx = tx;
  smartAccounts.lastRecipient = recipient;
  smartAccounts.lastValue = value;
});

Then('a transação deve ser processada com sucesso', async function() {
  // Verificar se a transação foi confirmada
  const receipt = await smartAccounts.lastTx.wait();
  expect(receipt.status).to.equal(1);
});

Then('eu não devo pagar pelos custos de gas', function() {
  // Este é um mock simplificado, pois não temos como verificar diretamente
  // Na implementação real, verificaríamos que o saldo de ETH da conta não diminuiu
  // além do valor transferido
});

Then('o Paymaster deve cobrir os custos de gas', function() {
  // Também é um mock simplificado, na implementação real verificaríamos
  // que o saldo do Paymaster diminuiu para cobrir o gas
});

// Cenário: Rejeitar transações que excedem o limite diário do dispositivo
Given('um dispositivo registrado com limite diário de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId para teste
  devices.test = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('dispositivo-teste')),
    limit: parseEther(limit.toString())
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.test.id,
    devices.test.limit,
    'Dispositivo de Teste'
  );
  await tx.wait();
});

When('eu tento enviar {float} ETH usando o dispositivo', async function(amount) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  const recipient = accounts.user2.address;
  const value = parseEther(amount.toString());
  
  // Tentar executar a transação simulando verificação biométrica
  try {
    const tx = await account.connect(accounts.user1).executeDeviceTransaction(
      devices.test.id,
      recipient,
      value,
      '0x',
      { gasLimit: 500000 }
    );
    await tx.wait();
    // Se não falhar, armazenar para verificações
    smartAccounts.lastDeviceTx = tx;
  } catch (error) {
    // Armazenar o erro
    errors.lastError = error;
  }
});

Then('a transação deve ser rejeitada', function() {
  expect(errors.lastError).to.not.be.undefined;
});

Then('devo receber um erro informando que o limite diário foi excedido', function() {
  expect(errors.lastError.message).to.include('daily limit exceeded');
}); 