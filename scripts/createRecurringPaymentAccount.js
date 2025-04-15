const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Check if addresses.json exists
  let addresses = {};
  if (fs.existsSync("addresses.json")) {
    addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  }

  // Get the factory address
  if (!addresses.recurringPaymentFactory) {
    console.log("RecurringPaymentAccountFactory address not found. Please deploy the factory first.");
    process.exit(1);
  }
  
  console.log("RecurringPaymentAccountFactory address:", addresses.recurringPaymentFactory);

  // Get the signer (owner) of the account
  const [signer] = await hre.ethers.getSigners();
  const owner = signer.address;
  console.log("Creating account for owner:", owner);
  
  // Connect to the factory
  const factory = await hre.ethers.getContractAt("RecurringPaymentAccountFactory", addresses.recurringPaymentFactory);
  
  // Create a random salt
  const salt = Math.floor(Math.random() * 1000000);
  console.log(`Using salt: ${salt}`);
  
  // Get the account address before creating
  const accountAddress = await factory.getAddress(owner, salt);
  console.log("Predicted account address:", accountAddress);
  
  // Create the account
  console.log("Creating RecurringPaymentAccount...");
  const tx = await factory.createAccount(owner, salt);
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Account created successfully!");
  
  // Verify the address
  const accountAddressAfter = await factory.getAddress(owner, salt);
  if (accountAddress.toLowerCase() === accountAddressAfter.toLowerCase()) {
    console.log("Account address verified:", accountAddress);
  } else {
    console.error("Account address mismatch!");
  }
  
  // Save the account address
  if (!addresses.recurringPaymentAccounts) {
    addresses.recurringPaymentAccounts = [];
  }
  
  addresses.recurringPaymentAccounts.push({
    address: accountAddress,
    owner: owner,
    createdAt: new Date().toISOString()
  });
  
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  
  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 