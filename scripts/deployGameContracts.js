// Deployment script for CryptoQuest Game contracts
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying CryptoQuest ERC-4337 Game contracts...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Get EntryPoint address (should be deployed already)
  // For a testnet or local network, you might deploy it first
  const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
  if (!entryPointAddress) {
    throw new Error("ENTRY_POINT_ADDRESS not set in environment variables");
  }
  console.log("Using EntryPoint at:", entryPointAddress);
  
  // 1. Deploy or get USDC mock for the game token
  console.log("Deploying USDC Mock...");
  const USDCMock = await ethers.getContractFactory("ERC20Mock"); // Assuming you have an ERC20 mock
  const usdcMock = await USDCMock.deploy("USDC Mock", "USDC", deployer.address, ethers.utils.parseUnits("1000000", 6));
  await usdcMock.deployed();
  console.log("USDC Mock deployed to:", usdcMock.address);
  
  // 2. Deploy Game NFT contract
  console.log("Deploying Game NFT...");
  const GameNFT = await ethers.getContractFactory("GameNFT"); // Assuming you have a GameNFT contract
  const gameNFT = await GameNFT.deploy("CryptoQuest Items", "CQITEM");
  await gameNFT.deployed();
  console.log("Game NFT deployed to:", gameNFT.address);
  
  // 3. Deploy Game contract
  console.log("Deploying Game Contract...");
  const GameContract = await ethers.getContractFactory("GameContract"); // The main game logic contract
  const gameContract = await GameContract.deploy(gameNFT.address, usdcMock.address);
  await gameContract.deployed();
  console.log("Game Contract deployed to:", gameContract.address);
  
  // 4. Deploy the GamePaymaster
  console.log("Deploying GamePaymaster...");
  const GamePaymaster = await ethers.getContractFactory("GamePaymaster");
  const gamePaymaster = await GamePaymaster.deploy(
    entryPointAddress,
    usdcMock.address,
    gameContract.address
  );
  await gamePaymaster.deployed();
  console.log("GamePaymaster deployed to:", gamePaymaster.address);
  
  // 5. Fund the GamePaymaster with ETH for gas sponsoring
  console.log("Funding GamePaymaster with ETH...");
  const fundingAmount = ethers.utils.parseEther("1.0"); // Fund with 1 ETH
  await deployer.sendTransaction({
    to: gamePaymaster.address,
    value: fundingAmount
  });
  console.log(`Funded GamePaymaster with ${ethers.utils.formatEther(fundingAmount)} ETH`);
  
  // 6. Add the deposit to EntryPoint
  console.log("Adding deposit to EntryPoint...");
  await gamePaymaster.depositToEntryPoint({ value: fundingAmount });
  console.log(`Added ${ethers.utils.formatEther(fundingAmount)} ETH deposit to EntryPoint`);
  
  // 7. Deploy the GameAccountFactory
  console.log("Deploying GameAccountFactory...");
  const GameAccountFactory = await ethers.getContractFactory("GameAccountFactory");
  const gameAccountFactory = await GameAccountFactory.deploy(
    entryPointAddress,
    gamePaymaster.address
  );
  await gameAccountFactory.deployed();
  console.log("GameAccountFactory deployed to:", gameAccountFactory.address);
  
  // 8. Set up permissions
  console.log("Setting up permissions...");
  await gameNFT.transferOwnership(gameContract.address);
  console.log("GameNFT ownership transferred to Game Contract");
  
  // 9. Set up default limits for the GamePaymaster
  await gamePaymaster.setDefaultLimits(
    ethers.utils.parseEther("0.1"), // 0.1 ETH daily limit
    ethers.utils.parseEther("0.01") // 0.01 ETH per transaction
  );
  console.log("Set default limits for GamePaymaster");
  
  console.log("\n=== Deployment Summary ===");
  console.log("USDC Mock:", usdcMock.address);
  console.log("Game NFT:", gameNFT.address);
  console.log("Game Contract:", gameContract.address);
  console.log("GamePaymaster:", gamePaymaster.address);
  console.log("GameAccountFactory:", gameAccountFactory.address);
  console.log("EntryPoint:", entryPointAddress);
  console.log("==========================\n");
  
  console.log("To create a new player account, use the following command:");
  console.log(`npx hardhat run scripts/createPlayerAccount.js --network YOUR_NETWORK`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 