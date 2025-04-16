const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Obtém argumentos de linha de comando
  const args = process.argv.slice(2);
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const command = args[0];
  const accountAddress = args[1];

  // Carrega os endereços dos contratos implantados
  let addresses;
  try {
    addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  } catch (error) {
    console.error("Arquivo addresses.json não encontrado. Você precisa implantar os contratos primeiro.");
    process.exit(1);
  }

  // Conecta à conta biométrica
  const biometricAccount = await hre.ethers.getContractAt(
    "BiometricAuthAccount",
    accountAddress
  );

  // Executa comando
  switch (command) {
    case "list":
      await listDevices(biometricAccount);
      break;
    case "add":
      if (args.length < 3) {
        console.error("Endereço do dispositivo não especificado!");
        printUsage();
        process.exit(1);
      }
      await addDevice(biometricAccount, args[2]);
      break;
    case "remove":
      if (args.length < 3) {
        console.error("Endereço do dispositivo não especificado!");
        printUsage();
        process.exit(1);
      }
      await removeDevice(biometricAccount, args[2]);
      break;
    case "set-min":
      if (args.length < 3) {
        console.error("Número mínimo de dispositivos não especificado!");
        printUsage();
        process.exit(1);
      }
      await setMinDevices(biometricAccount, parseInt(args[2]));
      break;
    default:
      console.error(`Comando desconhecido: ${command}`);
      printUsage();
      process.exit(1);
  }
}

async function listDevices(biometricAccount) {
  // Obtém o admin da conta
  const admin = await biometricAccount.admin();
  console.log(`Admin da conta: ${admin}`);
  
  // Obtém o número de dispositivos e mínimo necessário
  const deviceCount = await biometricAccount.deviceCount();
  const minDevices = await biometricAccount.minDevices();
  console.log(`Dispositivos ativos: ${deviceCount}`);
  console.log(`Dispositivos mínimos necessários: ${minDevices}`);
  
  // Não podemos listar diretamente porque o mapeamento não é iterável
  // Podemos apenas verificar se um endereço específico está autorizado
  console.log("\nPara verificar se um dispositivo está autorizado, use:");
  console.log("npx hardhat run scripts/manageBiometricDevices.js -- check ACCOUNT_ADDRESS DEVICE_ADDRESS");
}

async function addDevice(biometricAccount, deviceAddress) {
  // Verifica se o dispositivo já está autorizado
  const isAuthorized = await biometricAccount.authorizedDevices(deviceAddress);
  if (isAuthorized) {
    console.log(`Dispositivo ${deviceAddress} já está autorizado!`);
    return;
  }
  
  // Adiciona o dispositivo
  console.log(`Adicionando dispositivo ${deviceAddress}...`);
  const tx = await biometricAccount.addDevice(deviceAddress);
  await tx.wait();
  console.log("Dispositivo adicionado com sucesso!");
  
  // Verifica se foi adicionado corretamente
  const isNowAuthorized = await biometricAccount.authorizedDevices(deviceAddress);
  if (isNowAuthorized) {
    console.log("Verificação confirmada: dispositivo está autorizado.");
  } else {
    console.error("Erro: o dispositivo não foi adicionado corretamente!");
  }
}

async function removeDevice(biometricAccount, deviceAddress) {
  // Verifica se o dispositivo está autorizado
  const isAuthorized = await biometricAccount.authorizedDevices(deviceAddress);
  if (!isAuthorized) {
    console.log(`Dispositivo ${deviceAddress} não está autorizado!`);
    return;
  }
  
  try {
    // Remove o dispositivo
    console.log(`Removendo dispositivo ${deviceAddress}...`);
    const tx = await biometricAccount.removeDevice(deviceAddress);
    await tx.wait();
    console.log("Dispositivo removido com sucesso!");
    
    // Verifica se foi removido corretamente
    const isStillAuthorized = await biometricAccount.authorizedDevices(deviceAddress);
    if (!isStillAuthorized) {
      console.log("Verificação confirmada: dispositivo não está mais autorizado.");
    } else {
      console.error("Erro: o dispositivo ainda está autorizado!");
    }
  } catch (error) {
    console.error("Erro ao remover dispositivo:", error.message);
    
    // Verifica se o erro é devido ao mínimo de dispositivos
    if (error.message.includes("mínimo de dispositivos necessário")) {
      const deviceCount = await biometricAccount.deviceCount();
      const minDevices = await biometricAccount.minDevices();
      console.log(`Você tem ${deviceCount} dispositivo(s) e o mínimo necessário é ${minDevices}.`);
      console.log("Reduza o mínimo necessário antes de remover dispositivos.");
    }
  }
}

async function setMinDevices(biometricAccount, newMinDevices) {
  try {
    // Obtém o número atual de dispositivos
    const deviceCount = await biometricAccount.deviceCount();
    
    if (newMinDevices <= 0) {
      console.error("O mínimo de dispositivos deve ser maior que zero!");
      return;
    }
    
    if (newMinDevices > deviceCount) {
      console.error(`O mínimo de dispositivos (${newMinDevices}) não pode ser maior que o total (${deviceCount})!`);
      return;
    }
    
    // Atualiza o mínimo de dispositivos
    console.log(`Atualizando mínimo de dispositivos para ${newMinDevices}...`);
    const tx = await biometricAccount.updateMinDevices(newMinDevices);
    await tx.wait();
    console.log("Mínimo de dispositivos atualizado com sucesso!");
    
    // Verifica se foi atualizado corretamente
    const minDevices = await biometricAccount.minDevices();
    console.log(`Novo mínimo de dispositivos: ${minDevices}`);
  } catch (error) {
    console.error("Erro ao atualizar mínimo de dispositivos:", error.message);
  }
}

function printUsage() {
  console.log(`
Uso: npx hardhat run scripts/manageBiometricDevices.js -- <comando> <endereço-da-conta> [parâmetros]

Comandos:
  list                  Lista informações sobre os dispositivos da conta
  add <device>          Adiciona um novo dispositivo à conta
  remove <device>       Remove um dispositivo da conta
  set-min <number>      Define o número mínimo de dispositivos necessários

Exemplos:
  npx hardhat run scripts/manageBiometricDevices.js -- list 0x1234...
  npx hardhat run scripts/manageBiometricDevices.js -- add 0x1234... 0xABCD...
  npx hardhat run scripts/manageBiometricDevices.js -- remove 0x1234... 0xABCD...
  npx hardhat run scripts/manageBiometricDevices.js -- set-min 0x1234... 2
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 