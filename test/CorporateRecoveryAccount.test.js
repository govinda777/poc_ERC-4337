const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Recuperação de Carteira Corporativa", function () {
  let entryPoint;
  let factory;
  let wallet;
  let walletAddress;
  let deployer, signer1, signer2, signer3, signer4, signer5, newSigner1, newSigner2;
  
  // Configurações iniciais
  const RECOVERY_COOLDOWN = 7 * 24 * 60 * 60; // 7 dias em segundos
  
  before(async function () {
    // Obter signers para teste
    [deployer, signer1, signer2, signer3, signer4, signer5, newSigner1, newSigner2] = await ethers.getSigners();
    
    // Lista de signatários para a carteira corporativa (3/5)
    const initialSigners = [
      signer1.address,
      signer2.address,
      signer3.address,
      signer4.address,
      signer5.address
    ];
    
    // Deploy do EntryPoint (mock)
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    
    // Deploy da factory
    const CorporateRecoveryAccountFactory = await ethers.getContractFactory("CorporateRecoveryAccountFactory");
    factory = await CorporateRecoveryAccountFactory.deploy(entryPoint.address);
    await factory.deployed();
    
    // Criar uma carteira corporativa com threshold 3/5
    const tx = await factory.createAccount(initialSigners, 3, 123456);
    const receipt = await tx.wait();
    
    // Obter endereço da carteira através do evento
    const accountCreatedEvent = receipt.events.find(e => e.event === "AccountCreated");
    walletAddress = accountCreatedEvent.args.account;
    
    // Conectar à carteira
    const CorporateRecoveryAccount = await ethers.getContractFactory("CorporateRecoveryAccount");
    wallet = await CorporateRecoveryAccount.attach(walletAddress);
    
    // Enviar ETH para a carteira
    await deployer.sendTransaction({
      to: walletAddress,
      value: ethers.utils.parseEther("5.0")
    });
  });
  
  describe("Configuração inicial da carteira", function () {
    it("Deve ter 5 signatários iniciais", async function () {
      const signers = await wallet.getSigners();
      expect(signers.length).to.equal(5);
    });
    
    it("Deve ter um threshold de 3 signatários", async function () {
      const threshold = await wallet.signatureThreshold();
      expect(threshold).to.equal(3);
    });
    
    it("Deve reconhecer corretamente os signatários", async function () {
      expect(await wallet.isSigner(signer1.address)).to.be.true;
      expect(await wallet.isSigner(signer2.address)).to.be.true;
      expect(await wallet.isSigner(signer3.address)).to.be.true;
      expect(await wallet.isSigner(signer4.address)).to.be.true;
      expect(await wallet.isSigner(signer5.address)).to.be.true;
      expect(await wallet.isSigner(newSigner1.address)).to.be.false;
      expect(await wallet.isSigner(deployer.address)).to.be.false;
    });
  });
  
  describe("Fluxo normal de transações", function () {
    it("Permite que signatários proponham transações", async function () {
      // Propor uma transação
      const tx = await wallet.connect(signer1).proposeTransaction(
        deployer.address,
        ethers.utils.parseEther("0.1"),
        "0x"
      );
      const receipt = await tx.wait();
      
      // Verificar evento de proposta
      const event = receipt.events.find(e => e.event === "TransactionProposed");
      expect(event).to.not.be.undefined;
    });
    
    it("Permite que outros signatários confirmem transações", async function () {
      // Confirmar por signer2 e signer3
      await wallet.connect(signer2).confirmTransaction(0);
      const tx = await wallet.connect(signer3).confirmTransaction(0);
      const receipt = await tx.wait();
      
      // Verificar evento de confirmação
      const event = receipt.events.find(e => e.event === "TransactionConfirmed");
      expect(event).to.not.be.undefined;
    });
    
    it("Permite executar transações após confirmações suficientes", async function () {
      // Saldo inicial do destinatário
      const initialBalance = await ethers.provider.getBalance(deployer.address);
      
      // Executar a transação
      await wallet.connect(signer1).executeTransaction(0);
      
      // Verificar se o saldo aumentou
      const newBalance = await ethers.provider.getBalance(deployer.address);
      expect(newBalance.sub(initialBalance)).to.be.at.least(ethers.utils.parseEther("0.09")); // Considerando gas fees
    });
  });
  
  describe("Recuperação de Carteira", function () {
    // Endereços para nova configuração após recuperação
    const newSigners = [
      signer1.address, // signatário remanescente
      signer3.address, // signatário remanescente
      signer5.address, // signatário remanescente
      newSigner1.address, // novo dispositivo
      newSigner2.address // novo dispositivo
    ];
    
    it("Permite iniciar o processo de recuperação", async function () {
      // Iniciar recuperação (simulando que signer2 e signer4 foram perdidos)
      const tx = await wallet.connect(signer1).initiateRecovery(newSigners);
      const receipt = await tx.wait();
      
      // Verificar evento de solicitação
      const event = receipt.events.find(e => e.event === "RecoveryRequested");
      expect(event).to.not.be.undefined;
      
      // Verificar status da recuperação
      const status = await wallet.getRecoveryStatus();
      expect(status.approvalCount).to.equal(1);
      expect(status.canExecute).to.be.false; // Não pode executar ainda (prazo de espera)
    });
    
    it("Permite que outros signatários aprovem a recuperação", async function () {
      // Aprovar com signer3 e signer5
      await wallet.connect(signer3).approveRecovery();
      await wallet.connect(signer5).approveRecovery();
      
      // Verificar contagem de aprovações
      const status = await wallet.getRecoveryStatus();
      expect(status.approvalCount).to.equal(3);
    });
    
    it("Bloqueia execução da recuperação antes do período de espera", async function () {
      // Tentar executar imediatamente deve falhar
      await expect(
        wallet.connect(signer1).recoverAccess()
      ).to.be.revertedWith("Aguarde 7 dias");
    });
    
    it("Permite execução após o período de espera de 7 dias", async function () {
      // Avançar o tempo em 8 dias
      await time.increase(RECOVERY_COOLDOWN + 86400); // 7 dias + 1 dia extra
      
      // Verificar se agora pode executar
      const status = await wallet.getRecoveryStatus();
      expect(status.canExecute).to.be.true;
      
      // Executar a recuperação
      const tx = await wallet.connect(signer1).recoverAccess();
      const receipt = await tx.wait();
      
      // Verificar evento de recuperação
      const event = receipt.events.find(e => e.event === "RecoveryExecuted");
      expect(event).to.not.be.undefined;
    });
    
    it("Atualiza corretamente a lista de signatários após recuperação", async function () {
      // Verificar se os novos signatários foram adicionados
      expect(await wallet.isSigner(signer1.address)).to.be.true;
      expect(await wallet.isSigner(signer3.address)).to.be.true;
      expect(await wallet.isSigner(signer5.address)).to.be.true;
      expect(await wallet.isSigner(newSigner1.address)).to.be.true;
      expect(await wallet.isSigner(newSigner2.address)).to.be.true;
      
      // Verificar se os signatários perdidos foram removidos
      expect(await wallet.isSigner(signer2.address)).to.be.false;
      expect(await wallet.isSigner(signer4.address)).to.be.false;
    });
    
    it("Permite operações normais com a nova configuração de signatários", async function () {
      // Propor uma nova transação com um novo signatário
      const tx1 = await wallet.connect(newSigner1).proposeTransaction(
        deployer.address,
        ethers.utils.parseEther("0.2"),
        "0x"
      );
      await tx1.wait();
      
      // Confirmar com outros signatários
      await wallet.connect(signer1).confirmTransaction(1);
      await wallet.connect(signer3).confirmTransaction(1);
      
      // Saldo inicial
      const initialBalance = await ethers.provider.getBalance(deployer.address);
      
      // Executar a transação
      await wallet.connect(newSigner1).executeTransaction(1);
      
      // Verificar se o saldo aumentou
      const newBalance = await ethers.provider.getBalance(deployer.address);
      expect(newBalance.sub(initialBalance)).to.be.at.least(ethers.utils.parseEther("0.19")); // Considerando gas fees
    });
  });
  
  describe("Casos de falha no processo de recuperação", function () {
    it("Bloqueia tentativas de iniciar recuperação por não-signatários", async function () {
      await expect(
        wallet.connect(signer2).initiateRecovery([signer1.address, signer3.address, signer5.address])
      ).to.be.revertedWith("não é um signatário");
    });
    
    it("Requer pelo menos 3 signatários na nova configuração", async function () {
      await expect(
        wallet.connect(signer1).initiateRecovery([signer1.address, signer3.address])
      ).to.be.revertedWith("Mínimo 3 signatários");
    });
    
    it("Rejeita signatários duplicados na nova configuração", async function () {
      await expect(
        wallet.connect(signer1).initiateRecovery([signer1.address, signer3.address, signer1.address])
      ).to.be.revertedWith("signatários duplicados");
    });
  });
}); 