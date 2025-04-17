#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Parando ERC-4337 Smart Accounts Demo ===${NC}"

# Verifica se o arquivo com o PID existe
if [ -f .node_pid ]; then
  NODE_PID=$(cat .node_pid)
  echo -e "${YELLOW}Parando node Hardhat (PID: ${NODE_PID})...${NC}"
  
  # Tenta matar o processo
  if kill $NODE_PID 2>/dev/null; then
    echo -e "${GREEN}Node Hardhat parado com sucesso.${NC}"
  else
    echo -e "${RED}nao foi possível parar o Node Hardhat. Talvez ele já tenha sido encerrado.${NC}"
  fi
  
  # Remove o arquivo de PID
  rm .node_pid
else
  echo -e "${YELLOW}Arquivo de PID nao encontrado. Verificando se o node esta rodando na porta 8545...${NC}"
  
  # Verifica se existe algum processo rodando na porta 8545
  if nc -z localhost 8545 2>/dev/null; then
    echo -e "${YELLOW}Node detectado na porta 8545. Tentando encontrar e parar o processo...${NC}"
    
    # Em sistemas Unix/Linux, podemos tentar encontrar o processo usando lsof ou netstat
    if command -v lsof > /dev/null; then
      PID=$(lsof -i:8545 -t)
      if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}Processo encontrado (PID: ${PID}). Tentando parar...${NC}"
        if kill $PID 2>/dev/null; then
          echo -e "${GREEN}Processo parado com sucesso.${NC}"
        else
          echo -e "${RED}nao foi possível parar o processo. Pode ser necessário fazer isso manualmente.${NC}"
        fi
      fi
    else
      echo -e "${RED}Ferramenta lsof nao encontrada. nao é possível identificar o PID do processo.${NC}"
      echo -e "${YELLOW}Por favor, pare o node manualmente.${NC}"
    fi
  else
    echo -e "${GREEN}Nenhum node detectado na porta 8545.${NC}"
  fi
fi

echo -e "${BLUE}=== Operação concluída ===${NC}" 