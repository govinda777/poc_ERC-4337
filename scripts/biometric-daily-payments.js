// Este script demonstra o fluxo completo de carteira com autenticação biométrica para pagamentos diários
// 1. Implanta a fábrica de carteiras biométricas
// 2. Cria uma nova carteira com limite diário de R$ 500 (ou ~0.15 ETH)
// 3. Registra dispositivos e simula transações com e sem autenticação biométrica

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Iniciando demonstração de Pagamentos Diários com Autenticação Biométrica (ERC-4337)");
  
  // Obter signers para simulação
  const [deployer, owner, recipient1, recipient2] = await ethers.getSigners();
  
  // Definir limites de gastos diários (R$ 500 convertidos para ETH ~0.15 ETH na época)
  const DAILY_LIMIT = ethers.utils.parseEther("0.15");
  
  // Gerar IDs para dispositivos (baseado em hash para simular identificadores biométricos)
  const deviceId1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("smartphone-principal"));
  const deviceId2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("smartphone-backup"));
  
  console.log("Implantando EntryPoint...");
  // Deploy do EntryPoint (simplificado para exemplo)
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("EntryPoint implantado em:", entryPoint.address);
  
  console.log("Implantando BiometricAuthAccountFactory...");
  // Deploy da fábrica de carteiras
  const BiometricAuthAccountFactory = await ethers.getContractFactory("BiometricAuthAccountFactory");
  const factory = await BiometricAuthAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("BiometricAuthAccountFactory implantado em:", factory.address);
  
  console.log("Criando nova carteira com autenticação biométrica...");
  // Criar nova carteira
  const tx = await factory.createAccount(owner.address, 12345); // salt = 12345 para exemplo
  const receipt = await tx.wait();
  
  // Extrair endereço da carteira do evento
  const accountCreatedEvent = receipt.events.find(e => e.event === "AccountCreated");
  const walletAddress = accountCreatedEvent.args.account;
  console.log("Carteira biométrica criada em:", walletAddress);
  
  // Conectar à carteira
  const BiometricAuthAccount = await ethers.getContractFactory("BiometricAuthAccount");
  const wallet = await BiometricAuthAccount.attach(walletAddress);
  
  // Enviar algum ETH para a carteira (para usar em transações futuras)
  console.log("Enviando 1 ETH para a carteira...");
  await deployer.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther("1.0")
  });
  
  console.log("Saldo da carteira:", ethers.utils.formatEther(await ethers.provider.getBalance(wallet.address)), "ETH");
  
  // Registrar dispositivos com limites diários
  console.log("\nRegistrando dispositivos biométricos:");
  console.log("- Registrando smartphone principal com limite de 0.15 ETH/dia (~R$ 500)");
  await wallet.connect(owner).registerDevice(deviceId1, "Smartphone Principal", DAILY_LIMIT);
  
  console.log("- Registrando smartphone backup com limite de 0.05 ETH/dia (~R$ 170)");
  await wallet.connect(owner).registerDevice(deviceId2, "Smartphone Backup", ethers.utils.parseEther("0.05"));
  
  // Listar dispositivos registrados
  const devices = await wallet.getDevices();
  console.log("\nDispositivos registrados:");
  for (let i = 0; i < devices.length; i++) {
    console.log(`- Dispositivo ${i+1}: ${devices[i].deviceName}`);
    console.log(`  ID: ${devices[i].deviceId}`);
    console.log(`  Registrado em: ${new Date(devices[i].registeredAt.toNumber() * 1000).toLocaleString()}`);
    console.log(`  Ativo: ${devices[i].active}`);
    
    const dailyLimit = await wallet.dailyLimit(devices[i].deviceId);
    console.log(`  Limite diário: ${ethers.utils.formatEther(dailyLimit)} ETH`);
  }
  
  // Criar assinatura biométrica simulada (para exemplo)
  function createBiometricSignature(deviceId, owner) {
    // Na implementação real, seria gerada pelo smartphone com dados biométricos
    // Para o exemplo, usamos uma assinatura ECDSA padrão com o timestamp da hora
    const messageHash = ethers.utils.solidityKeccak256(
      ["bytes32", "uint256"],
      [deviceId, Math.floor(Date.now() / (1000 * 60 * 60))] // Hora atual
    );
    
    const messageHashBinary = ethers.utils.arrayify(messageHash);
    return owner.signMessage(messageHashBinary);
  }
  
  // Simular transações biométricas
  console.log("\n======= SIMULAÇÃO DE TRANSAÇÕES BIOMÉTRICAS =======");
  
  // Primeira transação - dentro do limite
  const value1 = ethers.utils.parseEther("0.05");
  console.log(`\nExecutando transação de ${ethers.utils.formatEther(value1)} ETH usando smartphone principal...`);
  
  // Criar assinatura biométrica simulada
  const biometricSignature1 = await createBiometricSignature(deviceId1, owner);
  
  // Executar transação
  await wallet.connect(owner).executeBiometric(
    deviceId1,
    recipient1.address,
    value1,
    "0x", // sem dados adicionais
    biometricSignature1
  );
  
  console.log(`Transação executada! Enviado ${ethers.utils.formatEther(value1)} ETH para ${recipient1.address}`);
  
  // Verificar uso diário
  const usage1 = await wallet.getDailyUsage(deviceId1);
  console.log("Uso diário após primeira transação:");
  console.log("- Usado:", ethers.utils.formatEther(usage1.used), "ETH");
  console.log("- Limite:", ethers.utils.formatEther(usage1.limit), "ETH");
  console.log("- Restante:", ethers.utils.formatEther(usage1.remaining), "ETH");
  
  // Segunda transação - ainda dentro do limite
  const value2 = ethers.utils.parseEther("0.07");
  console.log(`\nExecutando segunda transação de ${ethers.utils.formatEther(value2)} ETH...`);
  
  // Criar assinatura biométrica simulada
  const biometricSignature2 = await createBiometricSignature(deviceId1, owner);
  
  // Executar transação
  await wallet.connect(owner).executeBiometric(
    deviceId1,
    recipient2.address,
    value2,
    "0x", // sem dados adicionais
    biometricSignature2
  );
  
  console.log(`Transação executada! Enviado ${ethers.utils.formatEther(value2)} ETH para ${recipient2.address}`);
  
  // Verificar uso diário
  const usage2 = await wallet.getDailyUsage(deviceId1);
  console.log("Uso diário após segunda transação:");
  console.log("- Usado:", ethers.utils.formatEther(usage2.used), "ETH");
  console.log("- Limite:", ethers.utils.formatEther(usage2.limit), "ETH");
  console.log("- Restante:", ethers.utils.formatEther(usage2.remaining), "ETH");
  
  // Terceira transação - excederia o limite
  const value3 = ethers.utils.parseEther("0.1");
  console.log(`\nTentando executar transação de ${ethers.utils.formatEther(value3)} ETH (excederia o limite)...`);
  
  // Criar assinatura biométrica simulada
  const biometricSignature3 = await createBiometricSignature(deviceId1, owner);
  
  try {
    // Tentar executar transação
    await wallet.connect(owner).executeBiometric(
      deviceId1,
      recipient1.address,
      value3,
      "0x", // sem dados adicionais
      biometricSignature3
    );
    console.log("Transação executada - não deveria ser possível!");
  } catch (error) {
    console.log("Transação rejeitada como esperado:", 
      error.message.includes("Excede limite") ? "Excede limite diário" : error.message);
  }
  
  // Transação usando o dispositivo de backup
  const backupValue = ethers.utils.parseEther("0.04");
  console.log(`\nExecutando transação com smartphone backup (${ethers.utils.formatEther(backupValue)} ETH)...`);
  
  // Criar assinatura biométrica simulada
  const backupSignature = await createBiometricSignature(deviceId2, owner);
  
  // Executar transação
  await wallet.connect(owner).executeBiometric(
    deviceId2,
    recipient1.address,
    backupValue,
    "0x", // sem dados adicionais
    backupSignature
  );
  
  console.log(`Transação com dispositivo backup executada! Enviado ${ethers.utils.formatEther(backupValue)} ETH`);
  
  // Verificar uso diário do dispositivo backup
  const backupUsage = await wallet.getDailyUsage(deviceId2);
  console.log("Uso diário do smartphone backup:");
  console.log("- Usado:", ethers.utils.formatEther(backupUsage.used), "ETH");
  console.log("- Limite:", ethers.utils.formatEther(backupUsage.limit), "ETH");
  console.log("- Restante:", ethers.utils.formatEther(backupUsage.remaining), "ETH");
  
  // Simular uma transação manual (sem autenticação biométrica)
  console.log("\n======= TRANSAÇÃO MANUAL (SEM BIOMETRIA) =======");
  const manualValue = ethers.utils.parseEther("0.3"); // Valor acima do limite diário
  
  console.log(`Executando transação manual de ${ethers.utils.formatEther(manualValue)} ETH (acima do limite)...`);
  
  // Executar transação manual (sem verificação de limite diário)
  await wallet.connect(owner).execute(
    recipient2.address,
    manualValue,
    "0x" // sem dados adicionais
  );
  
  console.log(`Transação manual executada! Enviado ${ethers.utils.formatEther(manualValue)} ETH`);
  console.log("Observe que transações manuais não possuem limite diário, mas exigem confirmação explícita do usuário");
  
  // Resumo final
  console.log("\n=========================================");
  console.log("DEMONSTRAÇÃO COMPLETA DE CARTEIRA COM AUTENTICAÇÃO BIOMÉTRICA");
  console.log("Recursos demonstrados:");
  console.log("1. Registro de múltiplos dispositivos biométricos");
  console.log("2. Definição de limites diários por dispositivo");
  console.log("3. Transações automáticas com verificação biométrica");
  console.log("4. Controle de limites diários para transações biométricas");
  console.log("5. Transações manuais sem limite para casos excepcionais");
  
  // Saldo final
  console.log("\nSaldo final da carteira:", 
    ethers.utils.formatEther(await ethers.provider.getBalance(wallet.address)), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 