const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(`
Usage: 
  npx hardhat run scripts/manageMultiSigTransactions.js -- propose <multisig-address> <destination> <value-in-eth> [data]
  npx hardhat run scripts/manageMultiSigTransactions.js -- confirm <multisig-address> <tx-index>
  npx hardhat run scripts/manageMultiSigTransactions.js -- execute <multisig-address> <tx-index>
  npx hardhat run scripts/manageMultiSigTransactions.js -- list <multisig-address>
  npx hardhat run scripts/manageMultiSigTransactions.js -- details <multisig-address> <tx-index>
    `);
    process.exit(1);
  }

  const action = args[0].toLowerCase();
  const accountAddress = args[1];
  
  // Validate the multisig address
  if (!ethers.utils.isAddress(accountAddress)) {
    console.error(`Invalid Ethereum address: ${accountAddress}`);
    process.exit(1);
  }
  
  // Connect to the MultiSigAccount
  console.log(`Connecting to MultiSigAccount at: ${accountAddress}`);
  const multiSig = await hre.ethers.getContractAt("MultiSigAccount", accountAddress);
  
  // Get current user's address (signer)
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  
  // Check if user is owner
  const isOwner = await multiSig.isOwner(userAddress);
  if (!isOwner) {
    console.error(`Error: ${userAddress} is not an owner of this MultiSigAccount`);
    process.exit(1);
  }
  
  console.log(`Connected as owner: ${userAddress}`);
  
  switch (action) {
    case "propose": {
      if (args.length < 4) {
        console.error("For 'propose' action, you need to specify destination and value");
        process.exit(1);
      }
      
      const destination = args[2];
      const valueInEth = args[3];
      const data = args[4] || "0x";
      
      // Validate destination
      if (!ethers.utils.isAddress(destination)) {
        console.error(`Invalid destination address: ${destination}`);
        process.exit(1);
      }
      
      // Validate value
      const value = ethers.utils.parseEther(valueInEth);
      
      console.log(`Proposing transaction:`);
      console.log(`  Destination: ${destination}`);
      console.log(`  Value: ${valueInEth} ETH`);
      console.log(`  Data: ${data}`);
      
      // Propose transaction
      const tx = await multiSig.proposeTransaction(destination, value, data);
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      // Find the TransactionProposed event
      const proposedEvent = receipt.events.find(e => e.event === "TransactionProposed");
      if (proposedEvent) {
        const txIndex = proposedEvent.args.txIndex.toNumber();
        console.log(`Transaction proposed with index: ${txIndex}`);
      } else {
        console.log("Transaction proposed but couldn't find the index from events");
      }
      
      break;
    }
    
    case "confirm": {
      if (args.length < 3) {
        console.error("For 'confirm' action, you need to specify the transaction index");
        process.exit(1);
      }
      
      const txIndex = parseInt(args[2]);
      if (isNaN(txIndex) || txIndex < 0) {
        console.error("Transaction index must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Confirming transaction with index: ${txIndex}`);
      
      // Get transaction details
      const txDetails = await multiSig.getTransaction(txIndex);
      console.log(`Transaction details:`);
      console.log(`  Destination: ${txDetails.destination}`);
      console.log(`  Value: ${ethers.utils.formatEther(txDetails.value)} ETH`);
      console.log(`  Executed: ${txDetails.executed}`);
      console.log(`  Confirmations: ${txDetails.numConfirmations.toString()}`);
      
      // Confirm transaction
      const tx = await multiSig.confirmTransaction(txIndex);
      console.log("Confirmation sent:", tx.hash);
      
      await tx.wait();
      console.log("Transaction confirmed successfully!");
      
      break;
    }
    
    case "execute": {
      if (args.length < 3) {
        console.error("For 'execute' action, you need to specify the transaction index");
        process.exit(1);
      }
      
      const txIndex = parseInt(args[2]);
      if (isNaN(txIndex) || txIndex < 0) {
        console.error("Transaction index must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Executing transaction with index: ${txIndex}`);
      
      // Get transaction details
      const txDetails = await multiSig.getTransaction(txIndex);
      console.log(`Transaction details:`);
      console.log(`  Destination: ${txDetails.destination}`);
      console.log(`  Value: ${ethers.utils.formatEther(txDetails.value)} ETH`);
      console.log(`  Executed: ${txDetails.executed}`);
      console.log(`  Confirmations: ${txDetails.numConfirmations.toString()}`);
      
      // Check if enough confirmations
      const threshold = await multiSig.signatureThreshold();
      if (txDetails.numConfirmations.lt(threshold)) {
        console.error(`Not enough confirmations. Required: ${threshold}, Current: ${txDetails.numConfirmations}`);
        process.exit(1);
      }
      
      // Execute transaction
      const tx = await multiSig.executeTransaction(txIndex);
      console.log("Execution sent:", tx.hash);
      
      await tx.wait();
      console.log("Transaction executed successfully!");
      
      break;
    }
    
    case "list": {
      console.log("Listing all transactions...");
      
      // Get transaction count
      const count = await multiSig.transactionCount();
      console.log(`Total transactions: ${count}`);
      
      if (count.eq(0)) {
        console.log("No transactions found");
        break;
      }
      
      console.log("\nTransactions:");
      console.log("-------------");
      
      // List all transactions
      for (let i = 0; i < count; i++) {
        const tx = await multiSig.getTransaction(i);
        console.log(`#${i} - Destination: ${tx.destination}`);
        console.log(`     Value: ${ethers.utils.formatEther(tx.value)} ETH`);
        console.log(`     Executed: ${tx.executed ? 'Yes' : 'No'}`);
        console.log(`     Confirmations: ${tx.numConfirmations.toString()}`);
        console.log(`     Created: ${new Date(tx.proposedAt.toNumber() * 1000).toLocaleString()}`);
        console.log(`     Expires: ${new Date(tx.expiresAt.toNumber() * 1000).toLocaleString()}`);
        console.log(`     Status: ${tx.executed ? 'Executed' : (Date.now() / 1000 > tx.expiresAt.toNumber() ? 'Expired' : 'Pending')}`);
        console.log("-------------");
      }
      
      break;
    }
    
    case "details": {
      if (args.length < 3) {
        console.error("For 'details' action, you need to specify the transaction index");
        process.exit(1);
      }
      
      const txIndex = parseInt(args[2]);
      if (isNaN(txIndex) || txIndex < 0) {
        console.error("Transaction index must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Getting detailed information for transaction: ${txIndex}`);
      
      // Get transaction details
      const tx = await multiSig.getTransaction(txIndex);
      console.log(`Transaction #${txIndex}:`);
      console.log(`  Destination: ${tx.destination}`);
      console.log(`  Value: ${ethers.utils.formatEther(tx.value)} ETH`);
      console.log(`  Data: ${tx.data}`);
      console.log(`  Executed: ${tx.executed ? 'Yes' : 'No'}`);
      console.log(`  Confirmations: ${tx.numConfirmations.toString()}`);
      console.log(`  Created: ${new Date(tx.proposedAt.toNumber() * 1000).toLocaleString()}`);
      console.log(`  Expires: ${new Date(tx.expiresAt.toNumber() * 1000).toLocaleString()}`);
      
      // Get threshold
      const threshold = await multiSig.signatureThreshold();
      console.log(`  Required confirmations: ${threshold}`);
      
      // Get account limits
      const limits = await multiSig.transactionLimit();
      console.log(`  Daily limit: ${ethers.utils.formatEther(limits.dailyLimit)} ETH`);
      console.log(`  Transaction limit: ${ethers.utils.formatEther(limits.txLimit)} ETH`);
      console.log(`  Daily used: ${ethers.utils.formatEther(limits.dailyUsed)} ETH`);
      
      break;
    }
    
    default:
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 