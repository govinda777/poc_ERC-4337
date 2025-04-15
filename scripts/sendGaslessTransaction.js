const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/sendGaslessTransaction.js -- <account-address> <target-address> [value-in-wei]");
    process.exit(1);
  }

  const accountAddress = args[0];
  const targetAddress = args[1];
  const valueInWei = args[2] || "0";

  // Validate arguments
  if (!hre.ethers.utils.isAddress(accountAddress)) {
    console.error("First argument must be a valid Ethereum address (smart account)");
    process.exit(1);
  }

  if (!hre.ethers.utils.isAddress(targetAddress)) {
    console.error("Second argument must be a valid Ethereum address (target)");
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
  
  // Connect to contracts
  const entryPoint = await hre.ethers.getContractAt("IEntryPoint", addresses.entryPoint);
  const paymaster = await hre.ethers.getContractAt("SponsorPaymaster", addresses.sponsorPaymaster);
  const account = await hre.ethers.getContractAt("SocialRecoveryAccount", accountAddress);
  
  // Get signer
  const [signer] = await ethers.getSigners();
  const owner = await account.owner();
  
  console.log("Account owner:", owner);
  console.log("Signer:", await signer.getAddress());
  
  // Check if signer is the owner
  if (owner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
    console.error("Signer is not the owner of the account");
    process.exit(1);
  }
  
  // Check if account is sponsored
  const isSponsored = await paymaster.sponsoredAddresses(accountAddress);
  if (!isSponsored) {
    console.log("Account is not sponsored. Sponsoring account...");
    const tx = await paymaster.sponsorAddress(accountAddress);
    await tx.wait();
    console.log("Account sponsored successfully!");
  } else {
    console.log("Account is already sponsored");
  }
  
  // Create the calldata for the transaction
  const callData = account.interface.encodeFunctionData("execute", [
    targetAddress,
    ethers.BigNumber.from(valueInWei),
    "0x" // Empty bytes for no function call
  ]);
  
  // Get the current nonce
  const nonce = await entryPoint.getNonce(accountAddress, 0);
  
  // Create the UserOperation
  const userOp = {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode: "0x",
    callData,
    callGasLimit: ethers.utils.hexlify(2000000),
    verificationGasLimit: ethers.utils.hexlify(2000000),
    preVerificationGas: ethers.utils.hexlify(2000000),
    maxFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits("10", "gwei")),
    maxPriorityFeePerGas: ethers.utils.hexlify(ethers.utils.parseUnits("5", "gwei")),
    paymasterAndData: paymaster.address + "0x",
    signature: "0x"
  };
  
  // Calculate UserOp hash
  const userOpHash = await entryPoint.getUserOpHash(userOp);
  
  // Sign the UserOp hash
  const signature = await signer.signMessage(ethers.utils.arrayify(userOpHash));
  userOp.signature = signature;
  
  console.log("UserOperation created and signed");
  
  // Send the UserOperation
  console.log("Sending transaction via EntryPoint...");
  const tx = await entryPoint.handleOps([userOp], signer.address);
  console.log("Transaction sent:", tx.hash);
  
  // Wait for transaction to be mined
  console.log("Waiting for transaction to be mined...");
  const receipt = await tx.wait();
  
  console.log("Gasless transaction executed successfully!");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Transaction hash:", receipt.transactionHash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 