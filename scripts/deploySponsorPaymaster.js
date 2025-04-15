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

  // Deploy the SponsorPaymaster
  console.log("Deploying SponsorPaymaster...");
  const SponsorPaymaster = await hre.ethers.getContractFactory("SponsorPaymaster");
  const paymaster = await SponsorPaymaster.deploy(entryPointAddress);
  await paymaster.deployed();
  console.log("SponsorPaymaster deployed to:", paymaster.address);

  // Save the SponsorPaymaster address
  addresses.sponsorPaymaster = paymaster.address;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  
  // Fund the SponsorPaymaster with some ETH for gas
  console.log("Funding SponsorPaymaster...");
  const [signer] = await hre.ethers.getSigners();
  const fundTx = await signer.sendTransaction({
    to: paymaster.address,
    value: hre.ethers.utils.parseEther("0.1"), // Funding with 0.1 ETH
  });
  await fundTx.wait();
  console.log("Funded SponsorPaymaster with 0.1 ETH");

  // Deposit stake into EntryPoint
  console.log("Depositing stake in EntryPoint...");
  const entryPoint = await hre.ethers.getContractAt("IEntryPoint", entryPointAddress);
  const stakeTx = await paymaster.deposit({
    value: hre.ethers.utils.parseEther("0.05"), // Staking 0.05 ETH
  });
  await stakeTx.wait();
  console.log("Staked 0.05 ETH in EntryPoint");

  console.log("SponsorPaymaster setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 