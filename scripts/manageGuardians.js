const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Carrega os endereços dos contratos implantados
  if (!fs.existsSync("addresses.json")) {
    console.error("Arquivo addresses.json nao encontrado. Execute deploy.js e createAccount.js primeiro.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  if (!addresses.account) {
    console.error("Endereço da conta nao encontrado em addresses.json. Execute createAccount.js primeiro.");
    process.exit(1);
  }
  
  // Conecta à conta
  const socialAccount = await hre.ethers.getContractAt(
    "SocialRecoveryAccount", 
    addresses.account
  );
  
  // Obtém a carteira do signatário
  const [signer, guardian1, guardian2] = await hre.ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  const guardian1Address = await guardian1.getAddress();
  const guardian2Address = await guardian2.getAddress();
  
  // Verifica o proprietario atual
  const currentOwner = await socialAccount.owner();
  console.log("proprietario atual:", currentOwner);
  
  if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
    console.error("Você nao é o proprietario desta conta.");
    process.exit(1);
  }
  
  // Adiciona guardiões
  console.log("Adicionando guardiões...");
  
  console.log(`Adicionando guardião 1: ${guardian1Address}`);
  let tx = await socialAccount.addGuardian(guardian1Address);
  await tx.wait();
  console.log("Guardião 1 adicionado com sucesso!");
  
  console.log(`Adicionando guardião 2: ${guardian2Address}`);
  tx = await socialAccount.addGuardian(guardian2Address);
  await tx.wait();
  console.log("Guardião 2 adicionado com sucesso!");
  
  // Verifica contagem de guardiões
  const guardiansCount = await socialAccount.guardiansCount();
  console.log(`Total de guardiões: ${guardiansCount}`);
  
  // Define o limiar de recuperação
  console.log("Definindo limiar de recuperação para 2 guardiões...");
  tx = await socialAccount.setRecoveryThreshold(2);
  await tx.wait();
  console.log("Limiar de recuperação definido com sucesso!");
  
  const recoveryThreshold = await socialAccount.recoveryThreshold();
  console.log(`Limiar de recuperação atual: ${recoveryThreshold}`);
  
  // Define o atraso de recuperação
  const oneDay = 24 * 60 * 60; // 1 dia em segundos
  console.log("Definindo atraso de recuperação para 1 dia...");
  tx = await socialAccount.setRecoveryDelay(oneDay);
  await tx.wait();
  console.log("Atraso de recuperação definido com sucesso!");
  
  const recoveryDelay = await socialAccount.recoveryDelay();
  console.log(`Atraso de recuperação atual: ${recoveryDelay} segundos`);
  
  console.log("\nConta configurada com sucesso para recuperação social!");
  console.log(`Endereço da conta: ${addresses.account}`);
  console.log(`proprietario: ${currentOwner}`);
  console.log(`Total de guardiões: ${guardiansCount}`);
  console.log(`Limiar de recuperação: ${recoveryThreshold} guardiões`);
  console.log(`Atraso de recuperação: ${recoveryDelay} segundos`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 