// Script to create a player account using social authentication
const { ethers } = require("hardhat");

async function main() {
  console.log("Creating CryptoQuest player account via social authentication...");

  // Get user account
  const [player] = await ethers.getSigners();
  console.log("Creating account with address:", player.address);
  
  // Load contract addresses from .env or config
  const gameAccountFactoryAddress = process.env.GAME_ACCOUNT_FACTORY_ADDRESS;
  const gamePaymasterAddress = process.env.GAME_PAYMASTER_ADDRESS;
  const gameNFTAddress = process.env.GAME_NFT_ADDRESS;
  
  if (!gameAccountFactoryAddress || !gamePaymasterAddress || !gameNFTAddress) {
    throw new Error("Missing required environment variables");
  }
  
  // Load contracts
  const GameAccountFactory = await ethers.getContractFactory("GameAccountFactory");
  const GamePaymaster = await ethers.getContractFactory("GamePaymaster");
  const GameNFT = await ethers.getContractFactory("GameNFT");
  
  const gameAccountFactory = GameAccountFactory.attach(gameAccountFactoryAddress);
  const gamePaymaster = GamePaymaster.attach(gamePaymasterAddress);
  const gameNFT = GameNFT.attach(gameNFTAddress);
  
  // Get social auth data from input
  // In a real scenario, this would come from a Google/Apple Sign-In flow
  // For this example, we'll simulate it with a simple string
  const socialAuthEmail = process.env.SOCIAL_AUTH_EMAIL || "player@example.com";
  const socialAuthToken = process.env.SOCIAL_AUTH_TOKEN || "simulated_oauth_token_123";
  
  // Create a simulated social auth proof (in a real app, this would be a JWT or similar)
  const socialAuthProof = ethers.utils.defaultAbiCoder.encode(
    ["string", "string", "uint256"],
    [socialAuthEmail, socialAuthToken, Date.now()]
  );
  
  // Generate a deterministic salt based on the user's email
  const salt = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string"],
      [socialAuthEmail]
    )
  );
  
  // Check if account already exists
  const predictedAddress = await gameAccountFactory.getAddress(
    ethers.utils.keccak256(socialAuthProof),
    salt
  );
  console.log("Predicted account address:", predictedAddress);
  
  const codeSize = await ethers.provider.getCode(predictedAddress);
  if (codeSize !== "0x") {
    console.log("Account already exists at this address");
    
    // Check if this account is sponsored
    const isSponsored = await gamePaymaster.newPlayerWallets(predictedAddress);
    if (isSponsored) {
      console.log("Account is already sponsored for gas-free transactions");
    } else {
      console.log("Account is not sponsored. Consider registering it with the GamePaymaster");
    }
    
    return predictedAddress;
  }
  
  // Create the account
  console.log("Creating new player account...");
  const tx = await gameAccountFactory.createAccountViaSocialAuth(
    socialAuthProof,
    salt
  );
  const receipt = await tx.wait();
  
  // Find the AccountCreated event
  const accountCreatedEvent = receipt.events.find(
    event => event.event === "AccountCreated"
  );
  
  if (accountCreatedEvent) {
    const newAccountAddress = accountCreatedEvent.args.account;
    console.log("New account created at:", newAccountAddress);
    
    // Mint an NFT for the player (in a real game, this might happen after tutorial completion)
    console.log("Minting starter NFT for player...");
    const GameContract = await ethers.getContractFactory("GameContract");
    const gameContract = GameContract.attach(process.env.GAME_CONTRACT_ADDRESS);
    
    // Mint NFT to the player's account
    const mintTx = await gameContract.mintStarterPack(newAccountAddress);
    await mintTx.wait();
    console.log("Starter NFT minted and transferred to player account");
    
    // Register NFT as collateral
    console.log("Adding NFT as collateral...");
    const playerAccount = await ethers.getContractAt("GameAccount", newAccountAddress);
    
    // In a real implementation, you'd need to determine the NFT ID
    const nftId = 1; // Example NFT ID
    await gameAccountFactory.addNFTCollateral(newAccountAddress, nftId);
    console.log("NFT added as collateral");
    
    console.log("\n=== Player Onboarding Complete ===");
    console.log("Player Account:", newAccountAddress);
    console.log("Sponsored by:", gamePaymasterAddress);
    console.log("Ready for gas-free transactions!");
    console.log("==============================\n");
    
    return newAccountAddress;
  } else {
    console.error("Failed to create account!");
    return null;
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 