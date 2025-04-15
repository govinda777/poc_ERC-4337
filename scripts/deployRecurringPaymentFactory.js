const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Check if addresses.json exists
  let addresses = {};
  if (fs.existsSync("addresses.json")) {
    addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  }

  // Get the EntryPoint address or deploy a new one if needed
  let entryPointAddress = addresses.entryPoint;
  if (!entryPointAddress) {
    console.log("EntryPoint address not found. Please deploy EntryPoint first.");
    process.exit(1);
  }
  
  console.log("EntryPoint address:", entryPointAddress);

  // Deploy the RecurringPaymentAccountFactory
  console.log("Deploying RecurringPaymentAccountFactory...");
  const RecurringPaymentAccountFactory = await hre.ethers.getContractFactory("RecurringPaymentAccountFactory");
  const factory = await RecurringPaymentAccountFactory.deploy(entryPointAddress);
  await factory.deployed();
  console.log("RecurringPaymentAccountFactory deployed to:", factory.address);

  // Save the RecurringPaymentAccountFactory address
  addresses.recurringPaymentFactory = factory.address;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 