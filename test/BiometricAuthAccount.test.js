const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Assinaturas Biométricas para Pagamentos diarios", function () {
  let entryPoint;
  let factory;
  let wallet;
  let walletAddress;
  let deployer, owner, recipient;
  let deviceId1, deviceId2;
  
  // Valores para teste
  const DAILY_LIMIT = ethers.utils.parseEther("0.15"); // ~R$ 500
  
  // Função auxiliar para criar assinatura biométrica simulada
  async function createBiometricSignature(deviceId, signer) {
    const messageHash = ethers.utils.solidityKeccak256(
      ["bytes32", "uint256"],
      [deviceId, Math.floor(Date.now() / (1000 * 60 * 60))]
    );
    
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    return signer.signMessage(messageHashBinary);
  }
  
  before(async function () {
    [deployer, owner, recipient] = await ethers.getSigners();
    
    // Gerar IDs de dispositivos para teste
    deviceId1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("smartphone-principal"));
    deviceId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("smartphone-backup"));
    
    // Deploy do EntryPoint
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    
    // Deploy da factory
    const BiometricAuthAccountFactory = await ethers.getContractFactory("BiometricAuthAccountFactory");
    factory = await BiometricAuthAccountFactory.deploy(entryPoint.address);
    await factory.deployed();
    
    // Criar carteira biométrica
    const tx = await factory.createAccount(owner.address, 12345);
    const receipt = await tx.wait();
    
    // Obter endereço da carteira
    const accountCreatedEvent = receipt.events.find(e => e.event === "AccountCreated");
    walletAddress = accountCreatedEvent.args.account;
    
    // Conectar à carteira
    const BiometricAuthAccount = await ethers.getContractFactory("BiometricAuthAccount");
    wallet = await BiometricAuthAccount.attach(walletAddress);
    
    // Enviar ETH para a carteira
    await deployer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("1.0")
    });
  });
  
  describe("Configuração inicial e registro de dispositivos", function () {
    it("Deve ter o owner definido corretamente", async function () {
      expect(await wallet.owner()).to.equal(owner.address);
    });
    
    it("Permite registrar dispositivos com limites diarios", async function () {
      await wallet.connect(owner).registerDevice(deviceId1, "Smartphone Principal", DAILY_LIMIT);
      await wallet.connect(owner).registerDevice(deviceId2, "Smartphone Backup", ethers.utils.parseEther("0.05"));
      
      const devices = await wallet.getDevices();
      expect(devices.length).to.equal(2);
      
      // Verificar limites
      expect(await wallet.dailyLimit(deviceId1)).to.equal(DAILY_LIMIT);
      expect(await wallet.dailyLimit(deviceId2)).to.equal(ethers.utils.parseEther("0.05"));
    });
    
    it("Retorna corretamente a lista de dispositivos", async function () {
      const devices = await wallet.getDevices();
      
      expect(devices[0].deviceName).to.equal("Smartphone Principal");
      expect(devices[1].deviceName).to.equal("Smartphone Backup");
      expect(devices[0].active).to.be.true;
      expect(devices[1].active).to.be.true;
    });
  });
  
  describe("Execução de transações biométricas", function () {
    it("Permite execução de transação com verificação biométrica dentro do limite", async function () {
      const value = ethers.utils.parseEther("0.05");
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      // Criar assinatura biométrica simulada
      const biometricSignature = await createBiometricSignature(deviceId1, owner);
      
      // Executar transação
      await wallet.connect(owner).executeBiometric(
        deviceId1,
        recipient.address,
        value,
        "0x",
        biometricSignature
      );
      
      // Verificar se o recipiente recebeu o valor
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.equal(value);
      
      // Verificar atualização do uso diario
      const usage = await wallet.getDailyUsage(deviceId1);
      expect(usage.used).to.equal(value);
    });
    
    it("Acumula uso diario corretamente", async function () {
      const value = ethers.utils.parseEther("0.05");
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      // Criar assinatura biométrica simulada
      const biometricSignature = await createBiometricSignature(deviceId1, owner);
      
      // Executar segunda transação
      await wallet.connect(owner).executeBiometric(
        deviceId1,
        recipient.address,
        value,
        "0x",
        biometricSignature
      );
      
      // Verificar se o recipiente recebeu o valor
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.equal(value);
      
      // Verificar atualização do uso diario (agora deve ser 0.1 ETH)
      const usage = await wallet.getDailyUsage(deviceId1);
      expect(usage.used).to.equal(ethers.utils.parseEther("0.1"));
    });
    
    it("Bloqueia transações que excedem o limite diario", async function () {
      const value = ethers.utils.parseEther("0.06"); // Isso excederia o limite de 0.15 ETH
      
      // Criar assinatura biométrica simulada
      const biometricSignature = await createBiometricSignature(deviceId1, owner);
      
      // Tentar executar transação que excede o limite
      await expect(
        wallet.connect(owner).executeBiometric(
          deviceId1,
          recipient.address,
          value,
          "0x",
          biometricSignature
        )
      ).to.be.revertedWith("Excede limite");
    });
    
    it("Permite transações com um segundo dispositivo", async function () {
      const value = ethers.utils.parseEther("0.04");
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      // Criar assinatura biométrica simulada
      const biometricSignature = await createBiometricSignature(deviceId2, owner);
      
      // Executar transação com o segundo dispositivo
      await wallet.connect(owner).executeBiometric(
        deviceId2,
        recipient.address,
        value,
        "0x",
        biometricSignature
      );
      
      // Verificar se o recipiente recebeu o valor
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.equal(value);
      
      // Verificar atualização do uso diario do segundo dispositivo
      const usage = await wallet.getDailyUsage(deviceId2);
      expect(usage.used).to.equal(value);
    });
    
    it("Reinicia o contador diario após 24 horas", async function () {
      // Avançar o tempo em 25 horas
      await time.increase(25 * 60 * 60);
      
      // Verificar se o uso diario foi reiniciado
      const usage = await wallet.getDailyUsage(deviceId1);
      expect(usage.used).to.equal(0);
      
      // Verificar se é possível fazer uma nova transação
      const value = ethers.utils.parseEther("0.12");
      const biometricSignature = await createBiometricSignature(deviceId1, owner);
      
      await wallet.connect(owner).executeBiometric(
        deviceId1,
        recipient.address,
        value,
        "0x",
        biometricSignature
      );
      
      // Confirmar novo uso
      const updatedUsage = await wallet.getDailyUsage(deviceId1);
      expect(updatedUsage.used).to.equal(value);
    });
  });
  
  describe("Transações manuais (sem limite diario)", function () {
    it("Permite transações manuais acima do limite diario", async function () {
      const value = ethers.utils.parseEther("0.3"); // Valor acima do limite diario
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      // Executar transação manual
      await wallet.connect(owner).execute(
        recipient.address,
        value,
        "0x"
      );
      
      // Verificar se o recipiente recebeu o valor
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.equal(value);
    });
  });
  
  describe("Gerenciamento de dispositivos", function () {
    it("Permite remover um dispositivo", async function () {
      await wallet.connect(owner).removeDevice(deviceId2);
      
      // Verificar se o dispositivo foi removido
      const devices = await wallet.getDevices();
      expect(devices[1].active).to.be.false;
    });
    
    it("Impede transações de dispositivos removidos", async function () {
      const value = ethers.utils.parseEther("0.01");
      const biometricSignature = await createBiometricSignature(deviceId2, owner);
      
      // Tentar usar dispositivo removido
      await expect(
        wallet.connect(owner).executeBiometric(
          deviceId2,
          recipient.address,
          value,
          "0x",
          biometricSignature
        )
      ).to.be.revertedWith("dispositivo inativo ou nao registrado");
    });
    
    it("Permite alterar o limite diario de um dispositivo", async function () {
      const newLimit = ethers.utils.parseEther("0.2");
      await wallet.connect(owner).setDailyLimit(deviceId1, newLimit);
      
      // Verificar se o limite foi atualizado
      expect(await wallet.dailyLimit(deviceId1)).to.equal(newLimit);
    });
  });
  
  describe("Segurança e restrições", function () {
    it("Bloqueia registro de dispositivos por nao proprietarios", async function () {
      const newDeviceId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unauthorized-device"));
      
      await expect(
        wallet.connect(recipient).registerDevice(newDeviceId, "Dispositivo nao Autorizado", DAILY_LIMIT)
      ).to.be.revertedWith("nao é o proprietario");
    });
    
    it("Bloqueia transações biométricas por nao proprietarios", async function () {
      const value = ethers.utils.parseEther("0.01");
      const biometricSignature = await createBiometricSignature(deviceId1, owner);
      
      await expect(
        wallet.connect(recipient).executeBiometric(
          deviceId1,
          recipient.address,
          value,
          "0x",
          biometricSignature
        )
      ).to.be.revertedWith("nao autorizado");
    });
  });
}); 