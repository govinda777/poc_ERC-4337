const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const args = process.argv.slice(2);
  
  // Carrega os endereços dos contratos implantados
  const addresses = JSON.parse(fs.readFileSync("addresses.json", "utf8"));
  
  if (!addresses.biometricAuthFactory) {
    console.error("Factory de contas biométricas não encontrada! Execute deployBiometricAuthFactory.js primeiro.");
    process.exit(1);
  }
  
  // Conecta à factory
  const factory = await hre.ethers.getContractAt(
    "BiometricAuthAccountFactory", 
    addresses.biometricAuthFactory
  );
  
  // Obtém a carteira do administrador
  const [admin] = await hre.ethers.getSigners();
  
  // Obtém dispositivos ou usa padrão (o próprio admin)
  let devices = [admin.address];
  let minDevices = 1;
  
  if (args.length >= 1) {
    // Formato: device1,device2,device3
    devices = args[0].split(',');
  }
  
  if (args.length >= 2) {
    minDevices = parseInt(args[1]);
    if (isNaN(minDevices)) {
      console.error("O número mínimo de dispositivos deve ser um número válido");
      process.exit(1);
    }
    
    if (minDevices <= 0 || minDevices > devices.length) {
      console.error(`O número mínimo de dispositivos deve estar entre 1 e ${devices.length}`);
      process.exit(1);
    }
  }
  
  // Cria uma nova conta com salt aleatório
  const salt = Math.floor(Math.random() * 1000000);
  console.log(`Criando conta biométrica para admin ${admin.address} com ${devices.length} dispositivo(s) e salt ${salt}...`);
  console.log("Dispositivos:", devices);
  console.log("Dispositivos mínimos:", minDevices);
  
  // Calcula o endereço da conta antes de criá-la
  const accountAddress = await factory.getAddress(admin.address, devices, minDevices, salt);
  console.log("Endereço previsto da conta:", accountAddress);
  
  // Cria a conta
  const tx = await factory.createAccount(admin.address, devices, minDevices, salt);
  await tx.wait();
  
  // Verifica se a conta foi criada corretamente
  const accountAddress2 = await factory.getAddress(admin.address, devices, minDevices, salt);
  console.log("Conta biométrica criada em:", accountAddress2);
  
  // Salva o endereço da conta para uso posterior
  addresses.biometricAccount = accountAddress2;
  fs.writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
  
  console.log("\nUso da conta:");
  console.log("- Esta conta pode ser acessada pelos dispositivos autorizados");
  console.log("- A autenticação biométrica é validada off-chain pelo app");
  console.log("- As transações são assinadas com as chaves privadas dos dispositivos autorizados");
}

// Verifica argumentos e exibe ajuda se necessário
if (process.argv.includes("--help")) {
  console.log(`
Uso: node createBiometricAccount.js [dispositivos] [minDispositivos]

Argumentos:
  dispositivos      Lista de endereços separados por vírgula (ex: 0x123,0x456)
  minDispositivos   Número mínimo de dispositivos necessários (padrão: 1)

Exemplos:
  node createBiometricAccount.js
  node createBiometricAccount.js 0x123,0x456,0x789 2
  `);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 