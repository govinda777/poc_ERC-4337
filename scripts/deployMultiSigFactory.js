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

  // Deploy the MultiSigAccountFactory
  console.log("Deploying MultiSigAccountFactory...");
  const MultiSigAccountFactory = await hre.ethers.getContractFactory("MultiSigAccountFactory");
  const factory = await MultiSigAccountFactory.deploy(entryPointAddress);
  await factory.deployed();
  console.log("MultiSigAccountFactory deployed to:", factory.address);

  // Save the MultiSigAccountFactory address
  addresses.multiSigFactory = factory.address;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 