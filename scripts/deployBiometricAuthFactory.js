const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Implantando BiometricAuthAccountFactory...");

  // Carregar o endereço do EntryPoint ou implantar um novo
  let entryPointAddress;
  try {
    const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
    entryPointAddress = addresses.entryPoint;
    console.log("EntryPoint encontrado em:", entryPointAddress);
  } catch (error) {
    console.log("EntryPoint não encontrado. Implantando um novo...");
    const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    await entryPoint.deployed();
    entryPointAddress = entryPoint.address;
    console.log("EntryPoint implantado em:", entryPointAddress);
  }

  // Implantar a BiometricAuthAccountFactory
  const BiometricAuthAccountFactory = await hre.ethers.getContractFactory("BiometricAuthAccountFactory");
  const factory = await BiometricAuthAccountFactory.deploy(entryPointAddress);
  await factory.deployed();
  console.log("BiometricAuthAccountFactory implantada em:", factory.address);

  // Salvar endereços
  try {
    const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
    addresses.biometricAuthFactory = factory.address;
    fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  } catch (error) {
    const addresses = {
      entryPoint: entryPointAddress,
      biometricAuthFactory: factory.address
    };
    fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 