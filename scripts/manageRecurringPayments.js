const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(`
Usage: 
  npx hardhat run scripts/manageRecurringPayments.js -- create <account-address> <payee> <amount-in-eth> <period-in-seconds> [start-timestamp] [end-timestamp] [data]
  npx hardhat run scripts/manageRecurringPayments.js -- cancel <account-address> <subscription-id>
  npx hardhat run scripts/manageRecurringPayments.js -- modify <account-address> <subscription-id> <new-amount-in-eth> <new-period-in-seconds> <new-end-timestamp>
  npx hardhat run scripts/manageRecurringPayments.js -- execute <account-address> <subscription-id>
  npx hardhat run scripts/manageRecurringPayments.js -- execute-all <account-address>
  npx hardhat run scripts/manageRecurringPayments.js -- list <account-address>
  npx hardhat run scripts/manageRecurringPayments.js -- details <account-address> <subscription-id>
    `);
    process.exit(1);
  }

  const action = args[0].toLowerCase();
  const accountAddress = args[1];
  
  // Validate the RecurringPaymentAccount address
  if (!ethers.utils.isAddress(accountAddress)) {
    console.error(`Invalid Ethereum address: ${accountAddress}`);
    process.exit(1);
  }
  
  // Connect to the RecurringPaymentAccount
  console.log(`Connecting to RecurringPaymentAccount at: ${accountAddress}`);
  const account = await hre.ethers.getContractAt("RecurringPaymentAccount", accountAddress);
  
  // Get current user's address (signer)
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  
  // Check if user is owner
  const owner = await account.owner();
  if (owner.toLowerCase() !== userAddress.toLowerCase()) {
    console.error(`Error: ${userAddress} is not the owner of this RecurringPaymentAccount`);
    process.exit(1);
  }
  
  console.log(`Connected as owner: ${userAddress}`);
  
  switch (action) {
    case "create": {
      if (args.length < 5) {
        console.error("For 'create' action, you need to specify payee, amount, and period");
        process.exit(1);
      }
      
      const payee = args[2];
      const amountInEth = args[3];
      const periodInSeconds = args[4];
      const startTime = args[5] || "0";
      const endTime = args[6] || "0";
      const data = args[7] || "0x";
      
      // Validate payee
      if (!ethers.utils.isAddress(payee)) {
        console.error(`Invalid payee address: ${payee}`);
        process.exit(1);
      }
      
      // Validate amount
      const amount = ethers.utils.parseEther(amountInEth);
      
      // Validate period
      const period = parseInt(periodInSeconds);
      if (isNaN(period) || period <= 0) {
        console.error("Period must be a positive number of seconds");
        process.exit(1);
      }
      
      // Parse timestamps
      const start = parseInt(startTime);
      const end = parseInt(endTime);
      
      console.log(`Creating subscription:`);
      console.log(`  Payee: ${payee}`);
      console.log(`  Amount: ${amountInEth} ETH`);
      console.log(`  Period: ${periodInSeconds} seconds`);
      console.log(`  Start Time: ${start === 0 ? 'Now' : new Date(start * 1000).toLocaleString()}`);
      console.log(`  End Time: ${end === 0 ? 'Never' : new Date(end * 1000).toLocaleString()}`);
      console.log(`  Data: ${data}`);
      
      // Create subscription
      const tx = await account.createSubscription(payee, amount, period, start, end, data);
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      // Find the SubscriptionCreated event
      const createdEvent = receipt.events.find(e => e.event === "SubscriptionCreated");
      if (createdEvent) {
        const subId = createdEvent.args.subscriptionId.toNumber();
        console.log(`Subscription created with ID: ${subId}`);
      } else {
        console.log("Subscription created but couldn't find the ID from events");
      }
      
      break;
    }
    
    case "cancel": {
      if (args.length < 3) {
        console.error("For 'cancel' action, you need to specify the subscription ID");
        process.exit(1);
      }
      
      const subscriptionId = parseInt(args[2]);
      if (isNaN(subscriptionId) || subscriptionId < 0) {
        console.error("Subscription ID must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Cancelling subscription with ID: ${subscriptionId}`);
      
      // Get subscription details before cancellation
      try {
        const details = await account.getSubscriptionDetails(subscriptionId);
        console.log(`Subscription details:`);
        console.log(`  Payee: ${details.payee}`);
        console.log(`  Amount: ${ethers.utils.formatEther(details.amount)} ETH`);
        console.log(`  Period: ${details.periodSeconds.toString()} seconds`);
        console.log(`  Active: ${details.active}`);
      } catch (error) {
        console.error("Failed to get subscription details, it might not exist");
        process.exit(1);
      }
      
      // Cancel subscription
      const tx = await account.cancelSubscription(subscriptionId);
      console.log("Cancellation transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Subscription cancelled successfully!");
      
      break;
    }
    
    case "modify": {
      if (args.length < 6) {
        console.error("For 'modify' action, you need to specify the subscription ID, new amount, new period, and new end time");
        process.exit(1);
      }
      
      const subscriptionId = parseInt(args[2]);
      const newAmountInEth = args[3];
      const newPeriodInSeconds = args[4];
      const newEndTimestamp = args[5];
      
      if (isNaN(subscriptionId) || subscriptionId < 0) {
        console.error("Subscription ID must be a non-negative integer");
        process.exit(1);
      }
      
      // Validate new values
      const newAmount = newAmountInEth === "0" ? 0 : ethers.utils.parseEther(newAmountInEth);
      const newPeriod = parseInt(newPeriodInSeconds);
      const newEndTime = parseInt(newEndTimestamp);
      
      console.log(`Modifying subscription with ID: ${subscriptionId}`);
      console.log(`  New Amount: ${newAmountInEth === "0" ? "(unchanged)" : newAmountInEth + " ETH"}`);
      console.log(`  New Period: ${newPeriodInSeconds === "0" ? "(unchanged)" : newPeriodInSeconds + " seconds"}`);
      console.log(`  New End Time: ${newEndTimestamp === "0" ? "(unchanged)" : new Date(newEndTime * 1000).toLocaleString()}`);
      
      // Modify subscription
      const tx = await account.modifySubscription(subscriptionId, newAmount, newPeriod, newEndTime);
      console.log("Modification transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Subscription modified successfully!");
      
      break;
    }
    
    case "execute": {
      if (args.length < 3) {
        console.error("For 'execute' action, you need to specify the subscription ID");
        process.exit(1);
      }
      
      const subscriptionId = parseInt(args[2]);
      if (isNaN(subscriptionId) || subscriptionId < 0) {
        console.error("Subscription ID must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Executing subscription with ID: ${subscriptionId}`);
      
      // Execute subscription
      const tx = await account.executeSubscription(subscriptionId);
      console.log("Execution transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      // Check if the execution was successful by looking for the event
      const executedEvent = receipt.events.find(e => e.event === "SubscriptionExecuted");
      if (executedEvent) {
        console.log("Subscription executed successfully!");
        console.log(`  Paid ${ethers.utils.formatEther(executedEvent.args.amount)} ETH to ${executedEvent.args.payee}`);
        console.log(`  Executed at: ${new Date(executedEvent.args.executedAt.toNumber() * 1000).toLocaleString()}`);
      } else {
        console.log("Transaction processed, but subscription was not executed. It might not be due yet.");
      }
      
      break;
    }
    
    case "execute-all": {
      console.log("Executing all due subscriptions...");
      
      // Get subscriptions due
      const dueSubscriptions = await account.getDueSubscriptions();
      
      if (dueSubscriptions.length === 0) {
        console.log("No subscriptions are due for execution");
        break;
      }
      
      console.log(`Found ${dueSubscriptions.length} subscription(s) due for execution`);
      
      // Execute all due subscriptions
      const tx = await account.executeAllDueSubscriptions();
      console.log("Execution transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      // Count executed subscriptions from events
      const executedEvents = receipt.events.filter(e => e.event === "SubscriptionExecuted");
      console.log(`Successfully executed ${executedEvents.length} subscription(s)`);
      
      for (const event of executedEvents) {
        const subId = event.args.subscriptionId.toNumber();
        const payee = event.args.payee;
        const amount = ethers.utils.formatEther(event.args.amount);
        console.log(`  - Subscription #${subId}: Paid ${amount} ETH to ${payee}`);
      }
      
      break;
    }
    
    case "list": {
      console.log("Listing all active subscriptions...");
      
      // Get active subscriptions
      const activeSubscriptions = await account.getActiveSubscriptions();
      
      if (activeSubscriptions.length === 0) {
        console.log("No active subscriptions found");
        break;
      }
      
      console.log(`Found ${activeSubscriptions.length} active subscription(s)`);
      
      // Get details for each subscription
      for (let i = 0; i < activeSubscriptions.length; i++) {
        const subId = activeSubscriptions[i];
        const details = await account.getSubscriptionDetails(subId);
        
        const nextExecTime = details.nextExecutionTime.toNumber();
        
        console.log(`\nSubscription #${subId}:`);
        console.log(`  Payee: ${details.payee}`);
        console.log(`  Amount: ${ethers.utils.formatEther(details.amount)} ETH`);
        console.log(`  Period: ${details.periodSeconds.toString()} seconds (${details.periodSeconds / (24*3600)} days)`);
        console.log(`  Start: ${new Date(details.startTime.toNumber() * 1000).toLocaleString()}`);
        console.log(`  End: ${details.endTime.toNumber() === 0 ? 'Never' : new Date(details.endTime.toNumber() * 1000).toLocaleString()}`);
        console.log(`  Last Executed: ${details.lastExecuted.toNumber() === 0 ? 'Never' : new Date(details.lastExecuted.toNumber() * 1000).toLocaleString()}`);
        console.log(`  Next Execution: ${nextExecTime === 0 ? 'N/A' : new Date(nextExecTime * 1000).toLocaleString()}`);
        console.log(`  Status: ${nextExecTime <= Math.floor(Date.now() / 1000) && nextExecTime !== 0 ? 'Ready for execution' : 'Not due yet'}`);
      }
      
      break;
    }
    
    case "details": {
      if (args.length < 3) {
        console.error("For 'details' action, you need to specify the subscription ID");
        process.exit(1);
      }
      
      const subscriptionId = parseInt(args[2]);
      if (isNaN(subscriptionId) || subscriptionId < 0) {
        console.error("Subscription ID must be a non-negative integer");
        process.exit(1);
      }
      
      console.log(`Getting detailed information for subscription: ${subscriptionId}`);
      
      try {
        // Get subscription details
        const details = await account.getSubscriptionDetails(subscriptionId);
        const nextExecTime = details.nextExecutionTime.toNumber();
        
        console.log(`\nSubscription #${subscriptionId}:`);
        console.log(`  Payee: ${details.payee}`);
        console.log(`  Amount: ${ethers.utils.formatEther(details.amount)} ETH`);
        console.log(`  Period: ${details.periodSeconds.toString()} seconds (${details.periodSeconds / (24*3600)} days)`);
        console.log(`  Start: ${new Date(details.startTime.toNumber() * 1000).toLocaleString()}`);
        console.log(`  End: ${details.endTime.toNumber() === 0 ? 'Never' : new Date(details.endTime.toNumber() * 1000).toLocaleString()}`);
        console.log(`  Last Executed: ${details.lastExecuted.toNumber() === 0 ? 'Never' : new Date(details.lastExecuted.toNumber() * 1000).toLocaleString()}`);
        console.log(`  Next Execution: ${nextExecTime === 0 ? 'N/A' : new Date(nextExecTime * 1000).toLocaleString()}`);
        console.log(`  Data: ${details.data}`);
        console.log(`  Active: ${details.active}`);
        console.log(`  Status: ${nextExecTime <= Math.floor(Date.now() / 1000) && nextExecTime !== 0 ? 'Ready for execution' : 'Not due yet'}`);
        
        // Get balance of the account
        const balance = await ethers.provider.getBalance(accountAddress);
        console.log(`\nAccount Balance: ${ethers.utils.formatEther(balance)} ETH`);
        
        // Check if account has enough balance for next payment
        if (details.active && balance.lt(details.amount)) {
          console.log(`Warning: Account balance is less than the subscription amount. Next payment will likely fail.`);
        }
      } catch (error) {
        console.error(`Error getting subscription details: ${error.message}`);
        process.exit(1);
      }
      
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