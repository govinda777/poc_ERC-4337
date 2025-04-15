const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/createMultiSigAccount.js -- <threshold> <dailyLimit> <txLimit> <owner1,owner2,...>");
    process.exit(1);
  }

  const threshold = parseInt(args[0]);
  const dailyLimit = ethers.utils.parseEther(args[1]); // Convert ETH to wei
  const txLimit = ethers.utils.parseEther(args[2]);    // Convert ETH to wei
  const ownersArg = args[3].split(",");
  
  // Validate arguments
  if (isNaN(threshold) || threshold <= 0) {
    console.error("Threshold must be a positive number");
    process.exit(1);
  }
  
  if (ownersArg.length < threshold) {
    console.error(`Number of owners (${ownersArg.length}) cannot be less than threshold (${threshold})`);
    process.exit(1);
  }
  
  // Validate owner addresses
  const owners = [];
  for (const owner of ownersArg) {
    if (!ethers.utils.isAddress(owner)) {
      console.error(`Invalid Ethereum address: ${owner}`);
      process.exit(1);
    }
    owners.push(owner);
  }
  
  // Load addresses from config
  if (!fs.existsSync("addresses.json")) {
    console.error("addresses.json not found. Please deploy the contracts first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  if (!addresses.multiSigFactory) {
    console.error("MultiSigAccountFactory address not found. Please deploy MultiSigAccountFactory first.");
    process.exit(1);
  }

  console.log("Connecting to MultiSigAccountFactory at:", addresses.multiSigFactory);
  
  // Connect to the deployed MultiSigAccountFactory
  const factory = await hre.ethers.getContractAt("MultiSigAccountFactory", addresses.multiSigFactory);
  
  // Create a random salt for the account
  const salt = Math.floor(Math.random() * 1000000);
  
  // Estimate the address before creating
  console.log("Estimating account address...");
  const accountAddress = await factory.getAddress(owners, threshold, dailyLimit, txLimit, salt);
  console.log("Calculated account address:", accountAddress);
  
  // Create the MultiSigAccount
  console.log("Creating MultiSigAccount...");
  console.log(`Owners: ${owners.join(", ")}`);
  console.log(`Threshold: ${threshold} signatures required`);
  console.log(`Daily Limit: ${ethers.utils.formatEther(dailyLimit)} ETH`);
  console.log(`Transaction Limit: ${ethers.utils.formatEther(txLimit)} ETH`);
  
  const tx = await factory.createAccount(owners, threshold, dailyLimit, txLimit, salt);
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("MultiSigAccount created!");
  
  // Verify the account address
  const expectedAddress = await factory.getAddress(owners, threshold, dailyLimit, txLimit, salt);
  if (expectedAddress.toLowerCase() === accountAddress.toLowerCase()) {
    console.log("Account address verified:", accountAddress);
  } else {
    console.error("Account address mismatch! Expected:", expectedAddress, "Got:", accountAddress);
  }
  
  // Save the address for future use
  if (!addresses.multiSigAccounts) {
    addresses.multiSigAccounts = [];
  }
  
  addresses.multiSigAccounts.push({
    address: accountAddress,
    owners,
    threshold,
    dailyLimit: dailyLimit.toString(),
    txLimit: txLimit.toString(),
    createdAt: new Date().toISOString()
  });
  
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  
  console.log("MultiSigAccount setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 