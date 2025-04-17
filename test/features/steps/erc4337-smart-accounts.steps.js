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
let smartAccounts = { lastCreated: null };
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

// ==================================
// Helper Functions for Step Logic
// ==================================

// Function to deploy SocialRecoveryAccountFactory if not already deployed
async function ensureSocialRecoveryFactoryDeployed() {
  if (!contracts.socialRecoveryFactory) {
    const SocialRecoveryAccountFactory = await ethers.getContractFactory('SocialRecoveryAccountFactory');
    contracts.socialRecoveryFactory = await SocialRecoveryAccountFactory.deploy(contracts.entryPoint.address);
    await contracts.socialRecoveryFactory.deployed();
  }
}

// Function to create SocialRecoveryAccount if not already created
async function ensureSocialRecoveryAccountCreated() {
  if (!smartAccounts.socialRecovery) {
    await ensureSocialRecoveryFactoryDeployed(); // Ensure factory is deployed first
    // Calculate the expected address first
    const expectedAddress = await contracts.socialRecoveryFactory.getAddress(
        accounts.user1.address,
        0 // salt
    );
    // Check if account already exists (e.g., from a previous run)
    const code = await ethers.provider.getCode(expectedAddress);
    if (code === '0x') {
        // Account doesn't exist, create it
        const tx = await contracts.socialRecoveryFactory.createAccount(
          accounts.user1.address,
          0 // salt
        );
        await tx.wait();
    }
    // Store the calculated address
    smartAccounts.socialRecovery = expectedAddress;
    smartAccounts.lastCreated = smartAccounts.socialRecovery; // Track last created
  }
}

// Function to deploy BiometricAuthAccountFactory if not already deployed
async function ensureBiometricAuthFactoryDeployed() {
    if (!contracts.biometricFactory) {
        const BiometricAuthAccountFactory = await ethers.getContractFactory('BiometricAuthAccountFactory');
        contracts.biometricFactory = await BiometricAuthAccountFactory.deploy(contracts.entryPoint.address);
        await contracts.biometricFactory.deployed();
    }
}

// Function to create BiometricAuthAccount if not already created
async function ensureBiometricAccountCreated() {
    if (!smartAccounts.biometric) {
        await ensureBiometricAuthFactoryDeployed(); // Ensure factory is deployed first
        // Calculate the expected address first
        const expectedAddress = await contracts.biometricFactory.getAddress(
            accounts.user1.address,
            0 // salt
        );
        // Check if account already exists
        const code = await ethers.provider.getCode(expectedAddress);
        if (code === '0x') {
            // Account doesn't exist, create it
            const tx = await contracts.biometricFactory.createAccount(
                accounts.user1.address,
                0 // salt
            );
            await tx.wait();
        }
        // Store the calculated address
        smartAccounts.biometric = expectedAddress;
        smartAccounts.lastCreated = smartAccounts.biometric; // Track last created
    }
}

// ==================================
// Cucumber Steps
// ==================================

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
Given('o contrato SocialRecoveryAccountFactory está implantado', ensureSocialRecoveryFactoryDeployed);

When('eu crio uma nova conta com recuperação social', ensureSocialRecoveryAccountCreated);

Then('a conta deve ser criada com sucesso', async function() {
  // Verificar se o endereço da conta existe
  expect(smartAccounts.lastCreated, "No account was recorded as created").to.not.be.null;
  const code = await ethers.provider.getCode(smartAccounts.lastCreated);
  expect(code).to.not.equal('0x');
});

Then('o endereço da conta deve ser registrado corretamente', async function() {
  // Verificar se a conta está registrada na factory apropriada
  let factory;
  let expectedAddress;
  if (smartAccounts.lastCreated === smartAccounts.socialRecovery) {
      factory = contracts.socialRecoveryFactory;
      expectedAddress = await factory.getAddress(accounts.user1.address, 0);
  } else if (smartAccounts.lastCreated === smartAccounts.biometric) {
      factory = contracts.biometricFactory;
      expectedAddress = await factory.getAddress(accounts.user1.address, 0);
  } else {
      throw new Error("Cannot determine the factory for the last created account");
  }
  expect(smartAccounts.lastCreated).to.equal(expectedAddress);
});

Then('eu devo ser o proprietário da conta', async function() {
  // Conexão com a conta criada
  let AccountContract;
  let accountInstance;

  if (smartAccounts.lastCreated === smartAccounts.socialRecovery) {
      AccountContract = await ethers.getContractFactory('SocialRecoveryAccount');
      accountInstance = AccountContract.attach(smartAccounts.lastCreated);
  } else if (smartAccounts.lastCreated === smartAccounts.biometric) {
      AccountContract = await ethers.getContractFactory('BiometricAuthAccount');
      accountInstance = AccountContract.attach(smartAccounts.lastCreated);
  } else {
      throw new Error("Cannot determine the type of the last created account");
  }

  // Verificar o proprietário
  const owner = await accountInstance.owner();
  expect(owner).to.equal(accounts.user1.address);
});

// Cenário: Configurar guardiões para recuperação social
Given('eu tenho uma conta com recuperação social', async function() {
  await ensureSocialRecoveryAccountCreated(); // Use helper function
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
  // Use helper functions directly
  await ensureSocialRecoveryAccountCreated();
  await this.step(`eu adiciono ${numGuardians} guardiões à minha conta`);
  await this.step(`eu configuro um limiar de recuperação de ${threshold} guardiões`);
  await this.step('eu defino um atraso de recuperação de 24 horas');
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
Given('o contrato BiometricAuthAccountFactory está implantado', ensureBiometricAuthFactoryDeployed);

When('eu crio uma nova conta com autenticação biométrica', ensureBiometricAccountCreated);

Then('eu devo ser capaz de registrar dispositivos biométricos', async function() {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId (normalmente seria um hash de dados biométricos)
  const deviceName = 'Dispositivo Principal';
  const deviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceName.toLowerCase()));
  const dailyLimit = parseEther('0.1');
  
  // Registrar um dispositivo
  // Use explicit types if needed, or ensure contract ABI is correctly interpreted
  const tx = await account.connect(accounts.user1).registerDevice(
    deviceId, // bytes32
    deviceName, // string
    dailyLimit // uint256
  );
  await tx.wait();
  
  // Verificar se o dispositivo foi registrado consultando o mapping público
  const deviceData = await account.devices(deviceId);
  // deviceData will have named fields corresponding to the struct
  expect(deviceData.active, `Device ${deviceId} should be active after registration`).to.be.true;
  expect(deviceData.deviceId, `Device ID mismatch`).to.equal(deviceId);
  expect(deviceData.deviceName, `Device name mismatch`).to.equal(deviceName);
});

// Cenário: Configurar dispositivos com limites de transação diários
Given('eu tenho uma conta com autenticação biométrica', async function() {
  await ensureBiometricAccountCreated(); // Use helper function
});

When('eu registro um dispositivo principal com limite diário de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId com nome único para este cenário
  const deviceName = 'Dispositivo Principal Diario'; // Changed name
  devices.main = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceName.toLowerCase())), // ID will change
    limit: parseEther(limit.toString()),
    name: deviceName
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.main.id, // bytes32
    devices.main.name, // string
    devices.main.limit // uint256
  );
  await tx.wait();
});

When('eu registro um dispositivo de backup com limite diário de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId
  const deviceName = 'Dispositivo de Backup';
  devices.backup = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceName.toLowerCase())),
    limit: parseEther(limit.toString()),
    name: deviceName
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.backup.id, // bytes32
    devices.backup.name, // string
    devices.backup.limit // uint256
  );
  await tx.wait();
});

Then('o dispositivo principal deve ter limite de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Verificar o limite
  const currentLimit = await account.dailyLimit(devices.main.id); // Use the public mapping
  expect(currentLimit).to.equal(parseEther(limit.toString()));
});

Then('o dispositivo de backup deve ter limite de {float} ETH', async function(limit) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Verificar o limite
  const currentLimit = await account.dailyLimit(devices.backup.id); // Use the public mapping
  expect(currentLimit).to.equal(parseEther(limit.toString()));
});

// Cenário: Realizar transações sem custos de gas usando Paymaster
Given('eu tenho uma conta compatível com ERC-4337', async function() {
  // Use a biometric account if available, otherwise social recovery
  if (smartAccounts.biometric) {
      await ensureBiometricAccountCreated();
      smartAccounts.current = smartAccounts.biometric;
  } else {
      await ensureSocialRecoveryAccountCreated();
      smartAccounts.current = smartAccounts.socialRecovery;
  }
  
  // Ensure account has funds (add if needed)
  const balance = await ethers.provider.getBalance(smartAccounts.current);
  if (balance.lt(parseEther('0.5'))) {
      console.log(`Funding account ${smartAccounts.current}...`);
      await accounts.deployer.sendTransaction({
          to: smartAccounts.current,
          value: parseEther('1.0')
      });
  }
});

Given('o SponsorPaymaster está implantado e configurado', async function() {
  // Implantar o SponsorPaymaster
  const SponsorPaymaster = await ethers.getContractFactory('SponsorPaymaster');
  contracts.paymaster = await SponsorPaymaster.deploy(contracts.entryPoint.address);
  await contracts.paymaster.deployed();
  
  // Financiar o Paymaster
  const paymasterBalance = await ethers.provider.getBalance(contracts.paymaster.address);
   if (paymasterBalance.lt(parseEther('0.5'))) {
        console.log(`Funding paymaster ${contracts.paymaster.address}...`);
        const fundTx = await contracts.paymaster.connect(accounts.deployer).addDeposit({ value: parseEther('2.0') });
        await fundTx.wait();
        // await accounts.deployer.sendTransaction({
        //     to: contracts.paymaster.address,
        //     value: parseEther('10.0')
        // });
   }
});

When('minha conta é patrocinada pelo Paymaster', async function() {
  // Configurar o Paymaster para patrocinar a conta usando a função correta
  expect(contracts.paymaster.sponsorAddress, "sponsorAddress function not found on paymaster").to.exist;
  const tx = await contracts.paymaster.connect(accounts.deployer).sponsorAddress(smartAccounts.current); // Use deployer as owner
  await tx.wait();
});

When('eu envio uma transação sem gas para um endereço', async function() {
  // Prepare UserOp for a simple transfer
  const recipient = accounts.user2.address;
  const value = parseEther('0.01');
  const accountInterface = new ethers.utils.Interface(['function execute(address dest, uint256 value, bytes calldata func)']);
  const callData = accountInterface.encodeFunctionData('execute', [recipient, value, '0x']);
  
  const paymasterAndData = contracts.paymaster.address; // Paymaster address, no specific data needed for basic sponsorship

  const userOp = fillUserOpDefaults({
      sender: smartAccounts.current,
      nonce: await contracts.entryPoint.getNonce(smartAccounts.current, 0), // Get nonce from EntryPoint
      callData: callData,
      paymasterAndData: paymasterAndData,
      // Gas limits might need estimation/adjustment
      callGasLimit: 100000,
      verificationGasLimit: 150000, // Increased verification gas
      preVerificationGas: 50000,
  });

  // Sign the UserOperation using the account owner's key
  const userOpHash = await contracts.entryPoint.getUserOpHash(userOp);
  const signature = await accounts.user1.signMessage(ethers.utils.arrayify(userOpHash));
  userOp.signature = signature;

  // Store recipient and value for verification
  smartAccounts.lastRecipient = recipient;
  smartAccounts.lastValue = value;
  smartAccounts.userOp = userOp; // Store userOp for later

  // Send the UserOperation via the EntryPoint
  try {
      smartAccounts.lastTx = await contracts.entryPoint.connect(accounts.deployer).handleOps([userOp], accounts.deployer.address);
  } catch (e) {
      // Catch potential revert reasons
      console.error("handleOps failed:", e.message);
      // Try to decode custom error from EntryPoint
      if (e.data) {
          try {
              const decodedError = contracts.entryPoint.interface.parseError(e.data);
              console.error("Decoded EntryPoint Error:", decodedError.name, decodedError.args);
              if (decodedError.name === 'FailedOp') {
                  console.error("Reason:", decodedError.args.reason);
              }
          } catch (decodeError) {
              console.error("Could not decode EntryPoint error data:", decodeError);
          }
      }
      errors.gaslessTx = e; // Store error
      throw e; // Re-throw to fail the step
  }
});

Then('a transação deve ser processada com sucesso', async function() {
  // Verificar se a transação foi confirmada
  expect(errors.gaslessTx, "Gasless transaction failed").to.be.undefined;
  expect(smartAccounts.lastTx, "Transaction object not found").to.exist;
  const receipt = await smartAccounts.lastTx.wait();
  expect(receipt.status).to.equal(1);
});

Then('eu não devo pagar pelos custos de gas', async function() {
  // Verify UserOperation event to see actual gas cost paid by sender (should be 0)
  const receipt = await smartAccounts.lastTx.wait();
  const userOpEvent = receipt.events?.find(e => e.event === 'UserOperationEvent');
  expect(userOpEvent, "UserOperationEvent not found").to.exist;
  expect(userOpEvent.args.success).to.be.true;
  expect(userOpEvent.args.actualGasCost).to.equal(0); // Sender pays nothing
});

Then('o Paymaster deve cobrir os custos de gas', async function() {
  // Verify UserOperation event for paymaster's payment
  const receipt = await smartAccounts.lastTx.wait();
  const userOpEvent = receipt.events?.find(e => e.event === 'UserOperationEvent');
  expect(userOpEvent, "UserOperationEvent not found").to.exist;
  expect(userOpEvent.args.success).to.be.true;
  // Actual gas cost is paid by the paymaster deposit in the entry point
  expect(userOpEvent.args.actualGasUsed).to.be.gt(0);
});

// Cenário: Rejeitar transações que excedem o limite diário do dispositivo
Given('um dispositivo registrado com limite diário de {float} ETH', async function(limit) {
  await ensureBiometricAccountCreated(); // Ensure account exists
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  // Gerar um deviceId para teste
  const deviceName = 'Dispositivo de Teste';
  devices.test = {
    id: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(deviceName.toLowerCase())),
    limit: parseEther(limit.toString()),
    name: deviceName
  };
  
  // Registrar o dispositivo
  const tx = await account.connect(accounts.user1).registerDevice(
    devices.test.id, // bytes32
    devices.test.name, // string
    devices.test.limit // uint256
  );
  await tx.wait();
});

When('eu tento enviar {float} ETH usando o dispositivo', async function(amount) {
  const BiometricAuthAccount = await ethers.getContractFactory('BiometricAuthAccount');
  const account = BiometricAuthAccount.attach(smartAccounts.biometric);
  
  const recipient = accounts.user2.address;
  const value = parseEther(amount.toString());
  const callData = '0x'; // Simple ETH transfer
  
  // Prepare UserOp using the device for validation (simulate pre-computation)
  const accountInterface = new ethers.utils.Interface(['function executeBiometric(bytes32 deviceId, address dest, uint256 value, bytes calldata func, bytes calldata biometricSignature)']);

  // A real signature would be generated here based on the userOp hash and device key
  // For testing, we use a placeholder signature or the owner's signature on the hash
  const placeholderBiometricSig = '0x' + '00'.repeat(65); // Placeholder

  const opCallData = accountInterface.encodeFunctionData('executeBiometric', [
      devices.test.id,
      recipient,
      value,
      callData,
      placeholderBiometricSig // This signature is checked *inside* executeBiometric
  ]);

  // Signature for _validateSignature needs deviceId prepended
  const userOp = fillUserOpDefaults({
      sender: smartAccounts.biometric,
      nonce: await contracts.entryPoint.getNonce(smartAccounts.biometric, 0),
      callData: opCallData, // The call to executeBiometric
      // signature: devices.test.id + signature.substring(2) // Device ID + Owner Sig
  });

  const userOpHash = await contracts.entryPoint.getUserOpHash(userOp);
  const ownerSignature = await accounts.user1.signMessage(ethers.utils.arrayify(userOpHash));
  // Prepend device ID to owner signature for biometric validation path
  userOp.signature = devices.test.id + ownerSignature.substring(2);

  // Tentar executar a operação via EntryPoint
  try {
      // Send UserOp via handleOps
      const tx = await contracts.entryPoint.connect(accounts.deployer).handleOps([userOp], accounts.deployer.address);
      smartAccounts.lastTx = tx; // Store tx if successful
      errors.limitExceededTx = null; // Clear previous error
  } catch (e) {
      errors.limitExceededTx = e; // Store error
      // Log detailed error
      console.error(`Transaction failed as expected: ${e.message}`);
      if (e.data) {
          try {
              const decodedError = contracts.entryPoint.interface.parseError(e.data);
              console.error("Decoded EntryPoint Error:", decodedError.name, decodedError.args);
              if (decodedError.name === 'FailedOp' && decodedError.args.reason) {
                 errors.revertReason = decodedError.args.reason;
              }
          } catch (decodeError) {
              console.error("Could not decode EntryPoint error data.");
          }
      }
  }
});

Then('a transação deve ser rejeitada', function() {
  // Check if an error was caught in the previous step
  expect(errors.limitExceededTx).to.not.be.null;
  expect(errors.limitExceededTx).to.be.an('error');
});

Then('devo receber um erro informando que o limite diário foi excedido', function() {
  // Check the revert reason from the EntryPoint's FailedOp event
  expect(errors.revertReason).to.include('Excede limite'); // Check for the specific revert string from BiometricAuthAccount
}); 