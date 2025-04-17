// Este script demonstra o fluxo completo de recuperação de carteira corporativa
// 1. Implanta a fábrica de carteiras corporativas
// 2. Cria uma nova carteira com 5 signatários (3/5)
// 3. Simula a perda de 2 dispositivos e executa o processo de recuperação

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Iniciando demonstração de Recuperação de Carteira Corporativa (ERC-4337)");
  
  // Obter signers para simulação
  const [deployer, signer1, signer2, signer3, signer4, signer5, newSigner1, newSigner2] = await ethers.getSigners();
  
  // Endereços dos signatários para a carteira corporativa (3/5)
  const initialSigners = [
    signer1.address,
    signer2.address,
    signer3.address,
    signer4.address,
    signer5.address
  ];
  
  // Endereços para substituir signatários perdidos
  const newSigners = [
    signer1.address, // signatário remanescente
    signer3.address, // signatário remanescente
    signer5.address, // signatário remanescente
    newSigner1.address, // novo dispositivo
    newSigner2.address // novo dispositivo
  ];
  
  console.log("Implantando EntryPoint...");
  // Deploy do EntryPoint (simplificado para exemplo)
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.deployed();
  console.log("EntryPoint implantado em:", entryPoint.address);
  
  console.log("Implantando CorporateRecoveryAccountFactory...");
  // Deploy da fábrica de carteiras
  const CorporateRecoveryAccountFactory = await ethers.getContractFactory("CorporateRecoveryAccountFactory");
  const factory = await CorporateRecoveryAccountFactory.deploy(entryPoint.address);
  await factory.deployed();
  console.log("CorporateRecoveryAccountFactory implantado em:", factory.address);
  
  console.log("Criando nova carteira corporativa (multisig 3/5)...");
  // Criar nova carteira com threshold 3/5
  const tx = await factory.createAccount(initialSigners, 3, 12345); // salt = 12345 para exemplo
  const receipt = await tx.wait();
  
  // Extrair endereço da carteira do evento
  const accountCreatedEvent = receipt.events.find(e => e.event === "AccountCreated");
  const corporateWalletAddress = accountCreatedEvent.args.account;
  console.log("Carteira corporativa criada em:", corporateWalletAddress);
  
  // Conectar à carteira
  const CorporateRecoveryAccount = await ethers.getContractFactory("CorporateRecoveryAccount");
  const wallet = await CorporateRecoveryAccount.attach(corporateWalletAddress);
  
  // Enviar algum ETH para a carteira (para usar em transações futuras)
  console.log("Enviando 1 ETH para a carteira...");
  await deployer.sendTransaction({
    to: wallet.address,
    value: ethers.utils.parseEther("1.0")
  });
  
  console.log("Saldo da carteira:", ethers.utils.formatEther(await ethers.provider.getBalance(wallet.address)), "ETH");
  
  // Demonstrar confirmação de transação normal (antes da recuperação)
  console.log("\nSimulando transação regular (antes da recuperação):");
  // Propor transação para enviar 0.1 ETH para o deployer
  const proposeTx = await wallet.connect(signer1).proposeTransaction(
    deployer.address,
    ethers.utils.parseEther("0.1"),
    "0x" // sem dados adicionais
  );
  const proposeReceipt = await proposeTx.wait();
  const txIndex = proposeReceipt.events.find(e => e.event === "TransactionProposed").args.txIndex;
  console.log("Transação proposta com índice:", txIndex.toString());
  
  // Confirmar a transação com mais 2 signatários para atingir o threshold
  console.log("Confirmando com signer2...");
  await wallet.connect(signer2).confirmTransaction(txIndex);
  console.log("Confirmando com signer3...");
  await wallet.connect(signer3).confirmTransaction(txIndex);
  
  // Executar a transação após confirmações suficientes
  console.log("Executando transação...");
  await wallet.connect(signer1).executeTransaction(txIndex);
  console.log("Transação executada com sucesso!");
  
  // CENÁRIO DE RECUPERAÇÃO
  // Simulando perda de acesso a signer2 e signer4 (empresa perdeu 2/5 dispositivos)
  console.log("\n======= SIMULAÇÃO DE RECUPERAÇÃO =======");
  console.log("Empresa perdeu acesso a 2 dispositivos (signer2 e signer4)");
  console.log("Restam apenas signer1, signer3 e signer5 com acesso");
  
  // Iniciar pedido de recuperação com um signatário restante (signer1)
  console.log("\nIniciando processo de recuperação com signer1...");
  const initiateRecovery = await wallet.connect(signer1).initiateRecovery(newSigners);
  await initiateRecovery.wait();
  console.log("Solicitação de recuperação iniciada!");
  
  // Outros signatários restantes aprovam a recuperação
  console.log("Aprovando recuperação com signer3...");
  await wallet.connect(signer3).approveRecovery();
  console.log("Aprovando recuperação com signer5...");
  await wallet.connect(signer5).approveRecovery();
  
  // Verificar status atual do pedido
  const recoveryStatus = await wallet.getRecoveryStatus();
  console.log("\nStatus da recuperação:");
  console.log("- Novos signatários:", recoveryStatus.newSigners);
  console.log("- Timestamp da solicitação:", recoveryStatus.requestTime.toString());
  console.log("- Tempo restante (segundos):", recoveryStatus.remainingTime.toString());
  console.log("- Número de aprovações:", recoveryStatus.approvalCount.toString());
  console.log("- Pode executar agora:", recoveryStatus.canExecute);
  
  // Em produção, teria que esperar 7 dias
  // Para este exemplo, vamos simular a passagem do tempo com manipulação do timestamp
  console.log("\nEm produção seria necessário aguardar 7 dias!");
  console.log("Para fins de demonstração, vamos simular a passagem do tempo...");
  
  // Avançar o tempo em 8 dias (+1 dia de margem)
  await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
  await ethers.provider.send("evm_mine");
  
  const recoveryStatusAfterWaiting = await wallet.getRecoveryStatus();
  console.log("\nStatus da recuperação após período de espera:");
  console.log("- Tempo restante (segundos):", recoveryStatusAfterWaiting.remainingTime.toString());
  console.log("- Pode executar agora:", recoveryStatusAfterWaiting.canExecute);
  
  // Executar a recuperação após o período de espera
  if (recoveryStatusAfterWaiting.canExecute) {
    console.log("\nExecutando recuperação...");
    const recoverAccess = await wallet.connect(signer1).recoverAccess();
    await recoverAccess.wait();
    console.log("Recuperação concluída com sucesso!");
    
    // Verificar os novos signatários
    const newSignersList = await wallet.getSigners();
    console.log("\nNovos signatários da carteira:");
    for (let i = 0; i < newSignersList.length; i++) {
      console.log(`- Signer ${i+1}: ${newSignersList[i]}`);
    }
    
    // Demonstrar transação após recuperação
    console.log("\nSimulando transação após recuperação:");
    // Propor transação com novo signatário
    const proposeNewTx = await wallet.connect(newSigner1).proposeTransaction(
      deployer.address,
      ethers.utils.parseEther("0.1"),
      "0x" // sem dados adicionais
    );
    const proposeNewReceipt = await proposeNewTx.wait();
    const newTxIndex = proposeNewReceipt.events.find(e => e.event === "TransactionProposed").args.txIndex;
    console.log("Nova transação proposta com índice:", newTxIndex.toString());
    
    // Confirmar com outros 2 signatários para atingir o threshold
    console.log("Confirmando com signer1...");
    await wallet.connect(signer1).confirmTransaction(newTxIndex);
    console.log("Confirmando com signer3...");
    await wallet.connect(signer3).confirmTransaction(newTxIndex);
    
    // Executar a transação
    console.log("Executando transação após recuperação...");
    await wallet.connect(newSigner1).executeTransaction(newTxIndex);
    console.log("Transação pós-recuperação executada com sucesso!");
  } else {
    console.error("Erro: nao foi possível executar a recuperação!");
  }
  
  console.log("\n=========================================");
  console.log("DEMONSTRAÇÃO COMPLETA DE RECUPERAÇÃO DE CARTEIRA CORPORATIVA");
  console.log("O caso de uso foi implementado com sucesso!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 