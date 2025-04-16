// Script to execute a gasless transaction with a player account
const { ethers } = require("hardhat");

// Helper function to create UserOperation
function createUserOp(sender, nonce, callData, signature) {
  return {
    sender,
    nonce,
    initCode: '0x',
    callData,
    callGasLimit: ethers.utils.hexlify(2000000),
    verificationGasLimit: ethers.utils.hexlify(2000000),
    preVerificationGas: ethers.utils.hexlify(100000),
    maxFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits("10", "gwei")),
    maxPriorityFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits("5", "gwei")),
    paymasterAndData: '0x', // Will be filled later
    signature
  };
}

async function main() {
  console.log("Executing a gasless transaction with CryptoQuest player account...");
  
  // Get user account (used for signing)
  const [signer] = await ethers.getSigners();
  console.log("Using signer:", signer.address);
  
  // Load contract addresses
  const playerAccountAddress = process.env.PLAYER_ACCOUNT_ADDRESS;
  const gamePaymasterAddress = process.env.GAME_PAYMASTER_ADDRESS;
  const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
  const gameContractAddress = process.env.GAME_CONTRACT_ADDRESS;
  
  if (!playerAccountAddress || !gamePaymasterAddress || !entryPointAddress || !gameContractAddress) {
    throw new Error("Missing required environment variables");
  }
  
  // Get contract instances
  const playerAccount = await ethers.getContractAt("GameAccount", playerAccountAddress);
  const gamePaymaster = await ethers.getContractAt("GamePaymaster", gamePaymasterAddress);
  const entryPoint = await ethers.getContractAt("IEntryPoint", entryPointAddress);
  const gameContract = await ethers.getContractAt("GameContract", gameContractAddress);
  
  // Get the social auth data (in a real app, this would come from the frontend)
  const socialAuthEmail = process.env.SOCIAL_AUTH_EMAIL || "player@example.com";
  const socialAuthToken = process.env.SOCIAL_AUTH_TOKEN || "simulated_oauth_token_123";
  
  // Create a simulated social auth proof
  const socialAuthProof = ethers.utils.defaultAbiCoder.encode(
    ["string", "string", "uint256"],
    [socialAuthEmail, socialAuthToken, Date.now()]
  );
  
  // Check player account nonce
  const nonce = await entryPoint.getNonce(playerAccountAddress, 0);
  console.log("Current account nonce:", nonce.toString());
  
  // Example game action: Claim daily reward
  // This would be a function in your game contract
  const callData = playerAccount.interface.encodeFunctionData(
    "execute",
    [
      gameContractAddress,
      0, // No ETH sent
      gameContract.interface.encodeFunctionData("claimDailyReward", [])
    ]
  );
  
  // Create the UserOperation
  const userOp = createUserOp(
    playerAccountAddress,
    nonce.toString(),
    callData,
    socialAuthProof // Using social auth proof as signature
  );
  
  // Set the paymaster data
  userOp.paymasterAndData = ethers.utils.hexConcat([
    gamePaymasterAddress,
    "0x" // No additional paymaster data needed in this case
  ]);
  
  console.log("Sending UserOperation to EntryPoint...");
  console.log("UserOp:", {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData.slice(0, 66) + "...", // Truncate for readability
    signature: userOp.signature.slice(0, 66) + "..." // Truncate for readability
  });
  
  try {
    // Send the UserOperation
    const userOpHash = await entryPoint.getUserOpHash(userOp);
    console.log("UserOpHash:", userOpHash);
    
    // Submit the UserOperation
    const tx = await entryPoint.handleOps([userOp], signer.address);
    
    console.log("Transaction sent:", tx.hash);
    
    // Wait for transaction
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Check for successful event (UserOperationEvent)
    const userOperationEvents = receipt.events.filter(
      e => e.topics[0] === ethers.utils.id("UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)")
    );
    
    if (userOperationEvents.length > 0) {
      const success = userOperationEvents[0].args.success;
      console.log("Transaction success:", success);
      
      if (success) {
        console.log("\n=== Gasless Transaction Successful ===");
        console.log("Player paid: 0 ETH");
        console.log("Game sponsored the gas fee");
        console.log("Daily reward claimed successfully!");
        console.log("=====================================\n");
      } else {
        console.log("Transaction failed!");
      }
    }
  } catch (error) {
    console.error("Error executing transaction:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 