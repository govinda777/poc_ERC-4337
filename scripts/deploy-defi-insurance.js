// Deploy DeFi Insurance with Automatic Rescue use case
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DeFi Insurance with Automatic Rescue contracts...");
  
  // Get the entry point from the mock
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.waitForDeployment();
  
  console.log("EntryPoint deployed:", await entryPoint.getAddress());
  
  // Deploy the mock price oracle
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const oracle = await MockPriceOracle.deploy();
  await oracle.waitForDeployment();
  
  console.log("MockPriceOracle deployed:", await oracle.getAddress());
  
  // Deploy the factory
  const DeFiInsuranceAccountFactory = await ethers.getContractFactory("DeFiInsuranceAccountFactory");
  const factory = await DeFiInsuranceAccountFactory.deploy(await entryPoint.getAddress());
  await factory.waitForDeployment();
  
  console.log("DeFiInsuranceAccountFactory deployed:", await factory.getAddress());
  
  // Get default signer
  const [owner] = await ethers.getSigners();
  
  // Calculate the account address before deployment
  const salt = ethers.randomBytes(32);
  const saltNum = BigInt("0x" + Buffer.from(salt).toString("hex"));
  
  const calculatedAddr = await factory.getAddress(
    owner.address,
    await oracle.getAddress(),
    owner.address, // Use owner as rescue destination for testing
    saltNum
  );
  
  console.log("Calculated account address:", calculatedAddr);
  
  // Create the account
  const tx = await factory.createAccount(
    owner.address,
    await oracle.getAddress(),
    owner.address, // Use owner as rescue destination for testing
    saltNum
  );
  
  await tx.wait();
  console.log("DeFi Insurance account created");
  
  // Get the account instance
  const DeFiInsuranceAccount = await ethers.getContractFactory("DeFiInsuranceAccount");
  const account = DeFiInsuranceAccount.attach(calculatedAddr);
  
  // Deposit some ETH for insurance
  const depositAmount = ethers.parseEther("1");
  const depositTx = await owner.sendTransaction({
    to: calculatedAddr,
    value: depositAmount
  });
  await depositTx.wait();
  console.log("Deposited", ethers.formatEther(depositAmount), "ETH to insurance account");
  
  // Get current trigger price
  const triggerPrice = await account.triggerPrice();
  console.log("Current trigger price:", ethers.formatEther(triggerPrice));
  
  // Simulate price drop and liquidation
  console.log("\n--- Simulating price drop scenario ---");
  
  // Get current price
  const [currentPrice, isValid] = await oracle.fetchETHPrice();
  console.log("Current ETH price:", ethers.formatEther(currentPrice));
  
  // Calculate a price below trigger (21% drop)
  const newPrice = (currentPrice * 79n) / 100n;
  console.log("Setting price to:", ethers.formatEther(newPrice), "(21% drop)");
  
  // Update price
  await oracle.updatePrice(newPrice, true);
  console.log("Price updated");
  
  // Check if can be liquidated
  const [canLiquidate, price] = await account.canBeLiquidated();
  console.log("Can be liquidated:", canLiquidate);
  console.log("Current price:", ethers.formatEther(price));
  
  if (canLiquidate) {
    // Execute liquidation
    const liquidateTx = await account.executeLiquidation();
    await liquidateTx.wait();
    console.log("Account liquidated successfully");
    
    // Verify account state
    const isLiquidated = await account.liquidated();
    console.log("Account liquidation state:", isLiquidated);
  } else {
    console.log("Account cannot be liquidated yet");
  }
  
  console.log("\nDeFi Insurance with Automatic Rescue deployment and test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 