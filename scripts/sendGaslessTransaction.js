const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/sendGaslessTransaction.js -- <account-address> <target-address> [value-in-wei] [data-hex]");
    process.exit(1);
  }

  const accountAddress = args[0];
  const targetAddress = args[1];
  const valueInWei = args[2] || "0";
  const dataHex = args[3] || "0x";

  // Validate arguments
  if (!hre.ethers.utils.isAddress(accountAddress)) {
    console.error("First argument must be a valid Ethereum address (smart account)");
    process.exit(1);
  }

  if (!hre.ethers.utils.isAddress(targetAddress)) {
    console.error("Second argument must be a valid Ethereum address (target)");
    process.exit(1);
  }

  if (dataHex !== "0x" && !dataHex.startsWith("0x")) {
    console.error("Data must be a hex string starting with 0x");
    process.exit(1);
  }

  // Load addresses
  if (!fs.existsSync("addresses.json")) {
    console.error("addresses.json not found. Please deploy the contracts first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  if (!addresses.entryPoint) {
    console.error("EntryPoint address not found. Please deploy the contracts first.");
    process.exit(1);
  }

  if (!addresses.sponsorPaymaster) {
    console.error("SponsorPaymaster address not found. Please deploy SponsorPaymaster first.");
    process.exit(1);
  }

  console.log("Preparing gasless transaction...");
  console.log("Smart Account:", accountAddress);
  console.log("Target:", targetAddress);
  console.log("Value:", valueInWei, "wei");
  if (dataHex !== "0x") {
    console.log("Data:", dataHex);
  }
  
  // Connect to contracts
  const entryPoint = await hre.ethers.getContractAt("IEntryPoint", addresses.entryPoint);
  const paymaster = await hre.ethers.getContractAt("SponsorPaymaster", addresses.sponsorPaymaster);
  
  // Try to detect the account type - this supports multiple account types
  let accountType = "SimpleAccount"; // default
  
  // Try to detect if it's a SocialRecoveryAccount
  try {
    const account = await hre.ethers.getContractAt("SocialRecoveryAccount", accountAddress);
    await account.owner(); // If this succeeds, it's a SocialRecoveryAccount
    accountType = "SocialRecoveryAccount";
  } catch (error) {
    console.log("Not a SocialRecoveryAccount, trying SimpleAccount...");
    try {
      const account = await hre.ethers.getContractAt("SimpleAccount", accountAddress);
      await account.owner(); // If this succeeds, it's a SimpleAccount
      accountType = "SimpleAccount";
    } catch (error) {
      console.log("Not a SimpleAccount either, trying MultiSigAccount...");
      try {
        const account = await hre.ethers.getContractAt("MultiSigAccount", accountAddress);
        await account.owner(); // If this succeeds, it's a MultiSigAccount
        accountType = "MultiSigAccount";
      } catch (error) {
        console.error("Failed to detect account type. Please ensure the account address is valid.");
        process.exit(1);
      }
    }
  }
  
  console.log(`Detected account type: ${accountType}`);
  
  // Connect to the appropriate account type
  const account = await hre.ethers.getContractAt(accountType, accountAddress);
  
  // Get signer
  const [signer] = await ethers.getSigners();
  
  try {
    const owner = await account.owner();
    console.log("Account owner:", owner);
    console.log("Signer:", await signer.getAddress());
    
    // Check if signer is the owner
    if (owner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
      console.error("Signer is not the owner of the account");
      process.exit(1);
    }
  } catch (error) {
    console.error("Failed to fetch account owner:", error.message);
    process.exit(1);
  }
  
  // Check sponsorship status
  let sponsorshipType = null;
  
  // Check if account is sponsored
  try {
    const isAccountSponsored = await paymaster.sponsoredAddresses(accountAddress);
    if (isAccountSponsored) {
      sponsorshipType = "account";
      console.log("Account is sponsored");
      
      try {
        const accountLimits = await paymaster.addressLimits(accountAddress);
        console.log("Account sponsorship limits:");
        console.log("  Daily limit:", ethers.utils.formatEther(accountLimits.dailyLimit), "ETH");
        console.log("  Transaction limit:", ethers.utils.formatEther(accountLimits.txLimit), "ETH");
        console.log("  Used today:", ethers.utils.formatEther(accountLimits.usedToday), "ETH");
      } catch (error) {
        console.log("This paymaster doesn't support limits or error reading limits");
      }
    }
  } catch (error) {
    console.log("Error checking account sponsorship:", error.message);
  }
  
  // Check if target app is sponsored
  try {
    const isAppSponsored = await paymaster.sponsoredApps(targetAddress);
    if (isAppSponsored) {
      sponsorshipType = sponsorshipType ? "both" : "app";
      console.log("Target application is sponsored");
      
      try {
        const appLimits = await paymaster.appLimits(targetAddress);
        console.log("App sponsorship limits:");
        console.log("  Daily limit:", ethers.utils.formatEther(appLimits.dailyLimit), "ETH");
        console.log("  Transaction limit:", ethers.utils.formatEther(appLimits.txLimit), "ETH");
        console.log("  Used today:", ethers.utils.formatEther(appLimits.usedToday), "ETH");
      } catch (error) {
        console.log("This paymaster doesn't support limits or error reading limits");
      }
    }
  } catch (error) {
    console.log("Error checking app sponsorship:", error.message);
  }
  
  // If neither account nor target is sponsored, sponsor the account
  if (!sponsorshipType) {
    console.log("Neither account nor target is sponsored. Sponsoring account...");
    try {
      const tx = await paymaster.sponsorAddress(accountAddress);
      await tx.wait();
      console.log("Account sponsored successfully!");
      sponsorshipType = "account";
    } catch (error) {
      console.error("Failed to sponsor account:", error.message);
      process.exit(1);
    }
  }
  
  // Create the calldata for the transaction
  let callData;
  try {
    callData = account.interface.encodeFunctionData("execute", [
      targetAddress,
      ethers.BigNumber.from(valueInWei),
      dataHex // Can be custom data
    ]);
  } catch (error) {
    console.error("Failed to encode function data:", error.message);
    process.exit(1);
  }
  
  // Get current gas prices from the network
  const gasPrice = await ethers.provider.getGasPrice();
  const maxFeePerGas = gasPrice.mul(2); // Multiply by 2 to ensure execution
  const maxPriorityFeePerGas = gasPrice.div(2); // Half the gas price for priority fee
  
  console.log("Gas prices:");
  console.log("  Base gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("  Max fee per gas:", ethers.utils.formatUnits(maxFeePerGas, "gwei"), "gwei");
  console.log("  Max priority fee:", ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei"), "gwei");
  
  // Get the current nonce
  let nonce;
  try {
    nonce = await entryPoint.getNonce(accountAddress, 0);
    console.log("Current nonce:", nonce.toString());
  } catch (error) {
    console.error("Failed to get nonce:", error.message);
    process.exit(1);
  }
  
  // Create the UserOperation
  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: "0x", // No initCode for existing account
    callData,
    callGasLimit: ethers.utils.hexlify(3000000),
    verificationGasLimit: ethers.utils.hexlify(1000000),
    preVerificationGas: ethers.utils.hexlify(1000000),
    maxFeePerGas: ethers.utils.hexlify(maxFeePerGas),
    maxPriorityFeePerGas: ethers.utils.hexlify(maxPriorityFeePerGas),
    paymasterAndData: paymaster.address + "0x",
    signature: "0x"
  };
  
  // Calculate UserOp hash
  let userOpHash;
  try {
    userOpHash = await entryPoint.getUserOpHash(userOp);
    console.log("UserOperation hash:", userOpHash);
  } catch (error) {
    console.error("Failed to get UserOp hash:", error.message);
    process.exit(1);
  }
  
  // Sign the UserOp hash
  let signature;
  try {
    signature = await signer.signMessage(ethers.utils.arrayify(userOpHash));
    userOp.signature = signature;
    console.log("UserOperation signed successfully");
  } catch (error) {
    console.error("Failed to sign UserOp:", error.message);
    process.exit(1);
  }
  
  // Send the UserOperation
  console.log("Sending transaction via EntryPoint...");
  try {
    const tx = await entryPoint.handleOps([userOp], signer.address);
    console.log("Transaction sent:", tx.hash);
    
    // Wait for transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await tx.wait();
    
    console.log("Gasless transaction executed successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Check for events from the paymaster
    const sponsorEvents = receipt.logs
      .filter(log => log.address.toLowerCase() === paymaster.address.toLowerCase())
      .map(log => {
        try {
          return paymaster.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
      
    if (sponsorEvents.length > 0) {
      console.log("Gas sponsoring events:");
      sponsorEvents.forEach(event => {
        if (event.name === "GasSponsored") {
          console.log(`  Gas sponsored: ${ethers.utils.formatEther(event.args.gasUsed)} ETH`);
          console.log(`  For account: ${event.args.account}`);
          console.log(`  Target app: ${event.args.app}`);
        }
      });
    }
    
    return receipt;
  } catch (error) {
    console.error("Transaction failed:", error.message);
    
    // Try to extract the reason if possible
    if (error.error && error.error.data) {
      try {
        // This is one way some nodes return the revert reason
        const reason = ethers.utils.toUtf8String("0x" + error.error.data.substring(10));
        console.error("Revert reason:", reason);
      } catch (e) {
        // If we can't decode the reason, just log the error data
        console.error("Error data:", error.error.data);
      }
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 