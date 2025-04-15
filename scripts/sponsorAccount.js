const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx hardhat run scripts/sponsorAccount.js -- [address|app] <target-address>");
    process.exit(1);
  }

  const sponsorType = args[0];
  const targetAddress = args[1];

  if (!['address', 'app'].includes(sponsorType)) {
    console.error("First argument must be either 'address' or 'app'");
    process.exit(1);
  }

  if (!hre.ethers.utils.isAddress(targetAddress)) {
    console.error("Second argument must be a valid Ethereum address");
    process.exit(1);
  }

  // Load addresses
  if (!fs.existsSync("addresses.json")) {
    console.error("addresses.json not found. Please deploy the contracts first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  if (!addresses.sponsorPaymaster) {
    console.error("SponsorPaymaster address not found. Please deploy SponsorPaymaster first.");
    process.exit(1);
  }

  console.log("Connecting to SponsorPaymaster at:", addresses.sponsorPaymaster);
  
  // Connect to the deployed SponsorPaymaster
  const paymaster = await hre.ethers.getContractAt("SponsorPaymaster", addresses.sponsorPaymaster);
  
  // Sponsor the address or app
  let tx;
  if (sponsorType === 'address') {
    console.log(`Sponsoring address: ${targetAddress}`);
    tx = await paymaster.sponsorAddress(targetAddress);
  } else {
    console.log(`Sponsoring application: ${targetAddress}`);
    tx = await paymaster.sponsorApp(targetAddress);
  }
  
  await tx.wait();
  console.log(`${sponsorType === 'address' ? 'Address' : 'Application'} sponsored successfully!`);
  
  // Verify sponsorship
  let isSponsored;
  if (sponsorType === 'address') {
    isSponsored = await paymaster.sponsoredAddresses(targetAddress);
  } else {
    isSponsored = await paymaster.sponsoredApps(targetAddress);
  }
  
  console.log(`Sponsorship status: ${isSponsored ? 'Active' : 'Not active'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 