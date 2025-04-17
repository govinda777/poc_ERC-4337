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
  
  // Obtém as carteiras
  const [oldOwner, guardian1, guardian2, newOwner] = await hre.ethers.getSigners();
  const oldOwnerAddress = await oldOwner.getAddress();
  const guardian1Address = await guardian1.getAddress();
  const guardian2Address = await guardian2.getAddress();
  const newOwnerAddress = await newOwner.getAddress();
  
  // Verifica o proprietario atual
  const currentOwner = await socialAccount.owner();
  console.log("proprietario atual:", currentOwner);
  
  // Verifica se os guardiões estão configurados
  const isGuardian1 = await socialAccount.guardians(guardian1Address);
  const isGuardian2 = await socialAccount.guardians(guardian2Address);
  
  if (!isGuardian1 || !isGuardian2) {
    console.error("Guardiões nao configurados. Execute manageGuardians.js primeiro.");
    process.exit(1);
  }
  
  console.log("Simulando o processo de recuperação de conta...");
  console.log(`Novo proprietario será: ${newOwnerAddress}`);
  
  // Guardião 1 inicia o processo de recuperação
  console.log("\n1. Guardião 1 inicia o processo de recuperação...");
  let tx = await socialAccount.connect(guardian1).initiateRecovery(newOwnerAddress);
  await tx.wait();
  console.log("Processo de recuperação iniciado com sucesso!");
  
  // Verificar o status da recuperação
  let status = await socialAccount.getRecoveryStatus();
  console.log("\nStatus da recuperação:");
  console.log(`Novo proprietario: ${status[0]}`);
  console.log(`Aprovações: ${status[1]}`);
  console.log(`Timestamp: ${new Date(status[2] * 1000)}`);
  console.log(`Pode executar: ${status[3]}`);
  
  // Guardião 2 aprova o processo de recuperação
  console.log("\n2. Guardião 2 aprova o processo de recuperação...");
  tx = await socialAccount.connect(guardian2).approveRecovery();
  await tx.wait();
  console.log("Processo de recuperação aprovado pelo guardião 2!");
  
  // Verificar o status da recuperação novamente
  status = await socialAccount.getRecoveryStatus();
  console.log("\nStatus da recuperação atualizado:");
  console.log(`Novo proprietario: ${status[0]}`);
  console.log(`Aprovações: ${status[1]}`);
  console.log(`Timestamp: ${new Date(status[2] * 1000)}`);
  console.log(`Pode executar: ${status[3]}`);
  
  // Verificar o tempo de espera necessário
  const recoveryDelay = await socialAccount.recoveryDelay();
  console.log(`\nTempo de espera necessário: ${recoveryDelay} segundos`);
  
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("\nComo estamos em uma rede local, vamos avançar o tempo...");
    // Avança o tempo em um bloco para simular a passagem do tempo
    await hre.network.provider.send("evm_increaseTime", [recoveryDelay.toNumber()]);
    await hre.network.provider.send("evm_mine");
    console.log("Tempo avançado com sucesso!");
  } else {
    console.log("\nComo estamos em uma rede real, você precisará esperar o período de atraso.");
    console.log("Execute este script novamente após o período de atraso para finalizar a recuperação.");
    process.exit(0);
  }
  
  // Verificar o status da recuperação após o tempo avançado
  status = await socialAccount.getRecoveryStatus();
  console.log("\nStatus da recuperação após o período de espera:");
  console.log(`Novo proprietario: ${status[0]}`);
  console.log(`Aprovações: ${status[1]}`);
  console.log(`Timestamp: ${new Date(status[2] * 1000)}`);
  console.log(`Pode executar: ${status[3]}`);
  
  // Guardião 1 executa a recuperação
  console.log("\n3. Guardião 1 executa a recuperação...");
  tx = await socialAccount.connect(guardian1).executeRecovery();
  await tx.wait();
  console.log("Recuperação executada com sucesso!");
  
  // Verificar o novo proprietario
  const newCurrentOwner = await socialAccount.owner();
  console.log("\nproprietario antigo:", currentOwner);
  console.log("proprietario novo:", newCurrentOwner);
  
  if (newCurrentOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
    console.log("\nProcesso de recuperação concluído com sucesso!");
  } else {
    console.error("\nProblema na recuperação: o proprietario nao foi alterado.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 