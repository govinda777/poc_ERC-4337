const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeFi Insurance with Automatic Rescue", function () {
  let entryPoint;
  let oracle;
  let factory;
  let insuranceAccount;
  let owner, rescueDestination, otherAccount;
  let accountAddress;
  
  const INITIAL_PRICE = ethers.parseEther("2000"); // Initial ETH price: $2000
  const DEPOSIT_AMOUNT = ethers.parseEther("1");   // 1 ETH deposit
  
  beforeEach(async function () {
    // Get signers
    [owner, rescueDestination, otherAccount] = await ethers.getSigners();
    
    // Deploy EntryPoint
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    await entryPoint.waitForDeployment();
    
    // Deploy Oracle
    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    oracle = await MockPriceOracle.deploy();
    await oracle.waitForDeployment();
    
    // Deploy Factory
    const DeFiInsuranceAccountFactory = await ethers.getContractFactory("DeFiInsuranceAccountFactory");
    factory = await DeFiInsuranceAccountFactory.deploy(await entryPoint.getAddress());
    await factory.waitForDeployment();
    
    // Set initial price
    await oracle.updatePrice(INITIAL_PRICE, true);
    
    // Create account
    const salt = ethers.randomBytes(32);
    const saltNum = BigInt("0x" + Buffer.from(salt).toString("hex"));
    
    accountAddress = await factory.getAddress(
      owner.address,
      await oracle.getAddress(),
      rescueDestination.address,
      saltNum
    );
    
    const tx = await factory.createAccount(
      owner.address,
      await oracle.getAddress(),
      rescueDestination.address,
      saltNum
    );
    await tx.wait();
    
    // Get insurance account instance
    const DeFiInsuranceAccount = await ethers.getContractFactory("DeFiInsuranceAccount");
    insuranceAccount = DeFiInsuranceAccount.attach(accountAddress);
    
    // Deposit ETH
    await owner.sendTransaction({
      to: accountAddress,
      value: DEPOSIT_AMOUNT
    });
  });
  
  describe("Initial state", function () {
    it("Should set the correct owner", async function () {
      expect(await insuranceAccount.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct oracle", async function () {
      expect(await insuranceAccount.oracle()).to.equal(await oracle.getAddress());
    });
    
    it("Should set the correct rescue destination", async function () {
      expect(await insuranceAccount.rescueDestination()).to.equal(rescueDestination.address);
    });
    
    it("Should receive the deposit", async function () {
      const balance = await ethers.provider.getBalance(accountAddress);
      expect(balance).to.equal(DEPOSIT_AMOUNT);
    });
    
    it("Should calculate the trigger price correctly (20% drop)", async function () {
      const [currentPrice, _] = await oracle.fetchETHPrice();
      const expectedTriggerPrice = (currentPrice * 8000n) / 10000n; // 80% of current price
      expect(await insuranceAccount.triggerPrice()).to.equal(expectedTriggerPrice);
    });
    
    it("Should not be liquidated initially", async function () {
      expect(await insuranceAccount.liquidated()).to.be.false;
    });
  });
  
  describe("Liquidation conditions", function () {
    it("Should not be liquidatable at current price", async function () {
      const [canLiquidate, _] = await insuranceAccount.canBeLiquidated();
      expect(canLiquidate).to.be.false;
    });
    
    it("Should be liquidatable when price drops below threshold", async function () {
      // Calculate price that is 21% lower (beyond the 20% threshold)
      const newPrice = (INITIAL_PRICE * 79n) / 100n;
      await oracle.updatePrice(newPrice, true);
      
      const [canLiquidate, _] = await insuranceAccount.canBeLiquidated();
      expect(canLiquidate).to.be.true;
    });
    
    it("Should not be liquidatable if price is at exactly the threshold", async function () {
      // Calculate price that is exactly 20% lower
      const newPrice = (INITIAL_PRICE * 80n) / 100n;
      await oracle.updatePrice(newPrice, true);
      
      const [canLiquidate, _] = await insuranceAccount.canBeLiquidated();
      expect(canLiquidate).to.be.false;
    });
  });
  
  describe("Liquidation", function () {
    beforeEach(async function () {
      // Set price below threshold
      const newPrice = (INITIAL_PRICE * 75n) / 100n; // 25% drop
      await oracle.updatePrice(newPrice, true);
    });
    
    it("Should allow manual liquidation by owner", async function () {
      await insuranceAccount.executeLiquidation();
      expect(await insuranceAccount.liquidated()).to.be.true;
    });
    
    it("Should transfer funds to rescue destination on liquidation", async function () {
      const initialBalance = await ethers.provider.getBalance(rescueDestination.address);
      
      await insuranceAccount.executeLiquidation();
      
      const finalBalance = await ethers.provider.getBalance(rescueDestination.address);
      expect(finalBalance - initialBalance).to.equal(DEPOSIT_AMOUNT);
    });
    
    it("Should prevent operations after liquidation", async function () {
      await insuranceAccount.executeLiquidation();
      
      await expect(
        insuranceAccount.deposit({ value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Account already liquidated");
      
      await expect(
        insuranceAccount.executeLiquidation()
      ).to.be.revertedWith("Account already liquidated");
    });
  });
  
  describe("Permissions", function () {
    it("Should not allow non-owners to execute liquidation without conditions met", async function () {
      await expect(
        insuranceAccount.connect(otherAccount).executeLiquidation()
      ).to.be.revertedWith("Caller is not EntryPoint or owner");
    });
    
    it("Should not allow changing rescue destination by non-owners", async function () {
      await expect(
        insuranceAccount.connect(otherAccount).setRescueDestination(otherAccount.address)
      ).to.be.revertedWith("Caller is not EntryPoint or owner");
    });
    
    it("Should allow owner to change rescue destination", async function () {
      await insuranceAccount.setRescueDestination(otherAccount.address);
      expect(await insuranceAccount.rescueDestination()).to.equal(otherAccount.address);
    });
  });
}); 