const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CorporateRecoveryAccountFactory", function () {
  let entryPoint;
  let factory;
  let deployer, signer1, signer2, signer3;
  
  before(async function () {
    [deployer, signer1, signer2, signer3] = await ethers.getSigners();
    
    // Deploy do EntryPoint (mock)
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    
    // Deploy da factory
    const CorporateRecoveryAccountFactory = await ethers.getContractFactory("CorporateRecoveryAccountFactory");
    factory = await CorporateRecoveryAccountFactory.deploy(entryPoint.address);
    await factory.deployed();
  });
  
  describe("Criação de carteiras", function () {
    let walletAddress;
    let predictedAddress;
    
    it("Prevê corretamente o endereço da carteira a ser criada", async function () {
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const salt = 54321;
      
      predictedAddress = await factory.getAddress(initialSigners, 2, salt);
      expect(predictedAddress).to.be.a("string");
      expect(predictedAddress).to.match(/^0x[a-fA-F0-9]{40}$/); // Formato de endereço válido
    });
    
    it("Cria uma nova carteira corporativa com os parâmetros corretos", async function () {
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const salt = 54321;
      
      const tx = await factory.createAccount(initialSigners, 2, salt);
      const receipt = await tx.wait();
      
      // Verificar evento de criação
      const event = receipt.events.find(e => e.event === "AccountCreated");
      expect(event).to.not.be.undefined;
      
      walletAddress = event.args.account;
      expect(walletAddress).to.equal(predictedAddress);
    });
    
    it("Retorna o mesmo endereço ao criar com os mesmos parâmetros", async function () {
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const salt = 54321;
      
      const tx = await factory.createAccount(initialSigners, 2, salt);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === "AccountCreated");
      const newWalletAddress = event.args.account;
      
      // Deve retornar o mesmo endereço da carteira já criada
      expect(newWalletAddress).to.equal(walletAddress);
    });
    
    it("Cria carteiras em endereços diferentes com salts diferentes", async function () {
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const newSalt = 98765;
      
      const tx = await factory.createAccount(initialSigners, 2, newSalt);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === "AccountCreated");
      const newWalletAddress = event.args.account;
      
      // Deve ser um endereço diferente
      expect(newWalletAddress).to.not.equal(walletAddress);
    });
  });
  
  describe("Configuração inicial de carteiras", function () {
    it("Inicializa a carteira com os signatários corretos", async function () {
      // Criar uma nova carteira para teste
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const salt = 11111;
      
      const tx = await factory.createAccount(initialSigners, 2, salt);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === "AccountCreated");
      const walletAddress = event.args.account;
      
      // Conectar à carteira
      const CorporateRecoveryAccount = await ethers.getContractFactory("CorporateRecoveryAccount");
      const wallet = await CorporateRecoveryAccount.attach(walletAddress);
      
      // Verificar se os signatários foram configurados corretamente
      const signersFromWallet = await wallet.getSigners();
      expect(signersFromWallet.length).to.equal(initialSigners.length);
      
      for (let i = 0; i < initialSigners.length; i++) {
        expect(await wallet.isSigner(initialSigners[i])).to.be.true;
      }
    });
    
    it("Inicializa a carteira com o threshold correto", async function () {
      // Criar uma nova carteira para teste
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const threshold = 3; // Todos precisam assinar
      const salt = 22222;
      
      const tx = await factory.createAccount(initialSigners, threshold, salt);
      const receipt = await tx.wait();
      
      const event = receipt.events.find(e => e.event === "AccountCreated");
      const walletAddress = event.args.account;
      
      // Conectar à carteira
      const CorporateRecoveryAccount = await ethers.getContractFactory("CorporateRecoveryAccount");
      const wallet = await CorporateRecoveryAccount.attach(walletAddress);
      
      // Verificar se o threshold foi configurado corretamente
      const thresholdFromWallet = await wallet.signatureThreshold();
      expect(thresholdFromWallet).to.equal(threshold);
    });
    
    it("Falha ao inicializar com threshold inválido", async function () {
      const initialSigners = [signer1.address, signer2.address, signer3.address];
      const invalidThreshold = 4; // Maior que o número de signatários
      const salt = 33333;
      
      await expect(
        factory.createAccount(initialSigners, invalidThreshold, salt)
      ).to.be.revertedWith("limite inválido");
    });
    
    it("Falha ao inicializar com signatários duplicados", async function () {
      const duplicatedSigners = [signer1.address, signer2.address, signer1.address]; // signer1 duplicado
      const threshold = 2;
      const salt = 44444;
      
      await expect(
        factory.createAccount(duplicatedSigners, threshold, salt)
      ).to.be.revertedWith("signatários nao podem ser duplicados");
    });
  });
}); 