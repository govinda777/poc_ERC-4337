#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Iniciando ERC-4337 Smart Accounts Demo ===${NC}"

# Limpa o ambiente anterior
echo -e "${YELLOW}Limpando ambiente...${NC}"
npx hardhat clean

# Compila os contratos
echo -e "${YELLOW}Compilando contratos...${NC}"
npx hardhat compile

# Verifica se o node já esta rodando
if nc -z localhost 8545 2>/dev/null; then
  echo -e "${GREEN}Node Hardhat já esta rodando na porta 8545.${NC}"
else
  echo -e "${YELLOW}Iniciando node Hardhat em segundo plano...${NC}"
  # Inicia o node Hardhat em segundo plano
  npx hardhat node > logs/node.log 2>&1 &
  NODE_PID=$!
  
  # Registra o PID para limpar depois
  echo $NODE_PID > .node_pid
  
  echo -e "${GREEN}Node Hardhat iniciado em segundo plano. PID: ${NODE_PID}${NC}"
  
  # Espera o node iniciar
  echo -e "${YELLOW}Aguardando node iniciar...${NC}"
  until nc -z localhost 8545 2>/dev/null
  do
    sleep 1
  done
  echo -e "${GREEN}Node esta pronto!${NC}"
fi

# Deploy dos contratos principais
echo -e "${YELLOW}Implantando contratos principais...${NC}"
npx hardhat run scripts/deploy.js --network localhost

# Implanta o Paymaster para transações sem gas
echo -e "${YELLOW}Implantando e configurando Paymaster...${NC}"
npx hardhat run scripts/deploySponsorPaymaster.js --network localhost

# Cria uma conta com recuperação social
echo -e "${YELLOW}Criando conta com recuperação social...${NC}"
npx hardhat run scripts/createAccount.js --network localhost

# Implanta a factory de carteiras com Autenticacao biométrica
echo -e "${YELLOW}Implantando factory de Autenticacao biométrica...${NC}"
npx hardhat run scripts/deployBiometricAuthFactory.js --network localhost

# Cria uma conta com Autenticacao biométrica
echo -e "${YELLOW}Criando conta com Autenticacao biométrica...${NC}"
npx hardhat run scripts/createBiometricAccount.js --network localhost

echo -e "${GREEN}=== Configuração completa! ===${NC}"
echo -e "${BLUE}A aplicação esta rodando e configurada. O node Hardhat continua em execução em segundo plano.${NC}"
echo -e "${YELLOW}Para interromper o node, execute: kill $(cat .node_pid)${NC}"
echo -e "${YELLOW}Ou execute: npm run stop${NC}"

# Instruções sobre próximos passos
echo -e "\n${BLUE}=== Próximos passos ===\n${NC}"
echo -e "${YELLOW}1. Patrocinar uma conta:${NC}"
echo -e "   Permite que uma conta realize transações sem pagar gas (gasless transactions)"
echo -e "   Uso: ${GREEN}npm run sponsor-address -- [address|app] <endereço-alvo>${NC}"
echo -e "   Parâmetros:"
echo -e "   - Tipo: 'address' para patrocinar uma carteira ou 'app' para patrocinar um contrato"
echo -e "   - Endereço: Endereço Ethereum da carteira ou contrato a ser patrocinado"
echo -e "   Exemplo: ${GREEN}npm run sponsor-address -- address 0x71C7656EC7ab88b098defB751B7401B5f6d8976F${NC}"
echo -e ""

echo -e "${YELLOW}2. Enviar uma transação sem gas:${NC}"
echo -e "   Envia uma transação utilizando uma conta patrocinada (sem pagar gas)"
echo -e "   Uso: ${GREEN}npm run gasless-tx -- <endereço-da-conta> <endereço-alvo> [valor-em-wei] [dados-hex]${NC}"
echo -e "   Parâmetros:"
echo -e "   - Endereço da conta: Endereço da sua Smart Account ERC-4337"
echo -e "   - Endereço alvo: Endereço de destino da transação"
echo -e "   - Valor (opcional): Quantidade de ETH a ser enviada em wei (0 por padrão)"
echo -e "   - Dados (opcional): Dados da transação em formato hexadecimal (0x por padrão)"
echo -e "   Exemplo: ${GREEN}npm run gasless-tx -- 0x71C7656EC7ab88b098defB751B7401B5f6d8976F 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 1000000000000000 0x${NC}"
echo -e ""

echo -e "${YELLOW}3. Gerenciar guardiões:${NC}"
echo -e "   Configura guardiões para recuperação social da sua conta ERC-4337"
echo -e "   Uso: ${GREEN}npm run manage-guardians${NC}"
echo -e "   Operações disponíveis:"
echo -e "   - Adicionar guardiões: Adiciona endereços Ethereum como guardiões da sua conta"
echo -e "   - Definir limiar de recuperação: Número mínimo de guardiões necessários para recuperação"
echo -e "   - Definir atraso de recuperação: Período de espera antes da recuperação ser finalizada"
echo -e "   Este comando não requer parâmetros adicionais e utiliza a conta definida em addresses.json"
echo -e ""

echo -e "${YELLOW}4. Recuperar conta:${NC}"
echo -e "   Simula o processo completo de recuperação social de uma conta"
echo -e "   Uso: ${GREEN}npm run recover-account${NC}"
echo -e "   Processo:"
echo -e "   - Um guardião inicia o processo de recuperação para um novo proprietário"
echo -e "   - Outros guardiões aprovam a recuperação até atingir o limiar definido"
echo -e "   - Após o período de espera, qualquer guardião pode executar a recuperação"
echo -e "   - A propriedade da conta é transferida para o novo endereço"
echo -e "   Este comando não requer parâmetros adicionais e utiliza a conta e guardiões em addresses.json"
echo -e ""

echo -e "${YELLOW}5. Testar Autenticacao biométrica:${NC}"
echo -e "   Demonstra o uso de uma conta com verificação biométrica e limites diários"
echo -e "   Uso: ${GREEN}npm run biometric-payments${NC}"
echo -e "   Recursos demonstrados:"
echo -e "   - Registro de dispositivos com limites diários diferentes"
echo -e "   - Transações com verificação biométrica dentro do limite diário"
echo -e "   - Rejeição automática de transações que excedem o limite"
echo -e "   - Uso de dispositivo de backup para transações"
echo -e "   - Transações manuais sem limite (com aprovação do proprietário)"
echo -e "   Este comando não requer parâmetros adicionais e cria uma nova conta para demonstração" 