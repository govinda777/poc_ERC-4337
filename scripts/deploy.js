const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Iniciando implantação dos contratos...");

  // Implanta o EntryPoint
  console.log("Implantando EntryPoint...");
  const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("EntryPoint implantado em:", entryPoint.address);

  // Implanta a SocialRecoveryAccountFactory
  console.log("Implantando SocialRecoveryAccountFactory...");
  const SocialRecoveryAccountFactory = await hre.ethers.getContractFactory("SocialRecoveryAccountFactory");
  const factory = await SocialRecoveryAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("SocialRecoveryAccountFactory implantada em:", factory.address);

  // Salva os endereços para uso posterior
  const addresses = {
    entryPoint: entryPoint.address,
    factory: factory.address
  };
  
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Endereços salvos em addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 