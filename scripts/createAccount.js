const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Carrega os endereços dos contratos implantados
  if (!fs.existsSync("addresses.json")) {
    console.error("Arquivo addresses.json não encontrado. Execute deploy.js primeiro.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  // Conecta à factory
  const factory = await hre.ethers.getContractAt(
    "SocialRecoveryAccountFactory", 
    addresses.factory
  );
  
  // Obtém a carteira do signatário
  const [signer] = await hre.ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  
  // Cria uma nova conta com salt aleatório
  const salt = Math.floor(Math.random() * 1000000);
  console.log(`Criando conta para ${ownerAddress} com salt ${salt}...`);
  
  // Calcula o endereço da conta antes de criá-la
  const accountAddress = await factory.getAddress(ownerAddress, salt);
  console.log("Endereço previsto da conta:", accountAddress);
  
  // Cria a conta
  const tx = await factory.createAccount(ownerAddress, salt);
  console.log("Transação enviada:", tx.hash);
  console.log("Aguardando confirmação...");
  
  await tx.wait();
  console.log("Conta criada com sucesso!");
  
  // Verifica se a conta foi criada corretamente
  const accountAddress2 = await factory.getAddress(ownerAddress, salt);
  console.log("Endereço da conta confirmado:", accountAddress2);
  
  // Salva o endereço da conta para uso posterior
  addresses.account = accountAddress2;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  console.log("Endereço da conta salvo em addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 