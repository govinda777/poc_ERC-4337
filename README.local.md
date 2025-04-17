# Guia de Configuração Local - ERC-4337

Este guia fornece instruções passo a passo para configurar e executar o projeto ERC-4337 em seu ambiente local.

## Requisitos

- Node.js (v14 ou superior)
- npm (v7 ou superior)
- Git

## 1. Clonar o Repositório

Se você ainda nao clonou o repositório:

```bash
git clone https://github.com/seu-usuario/poc_ERC-4337.git
cd poc_ERC-4337
```

## 2. Instalar Dependências

Instale todas as dependências do projeto:

```bash
npm install
```

## 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure as seguintes variáveis:

```
# Chave privada para testes (nao use em produção)
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# URLs de RPC
LOCALHOST_URL=http://127.0.0.1:8545
SEPOLIA_URL=https://sepolia.infura.io/v3/seu-id-infura

# Configurações da Aplicação
ENTRY_POINT_ADDRESS=0x0000000000000000000000000000000000000000
```

O endereço do EntryPoint será substituído automaticamente após o deployment.

## 4. Iniciar Node Hardhat Local

Inicie uma blockchain local para desenvolvimento:

```bash
npm run node
```

Mantenha este terminal aberto e use um novo terminal para os próximos comandos.

## 5. Deploy dos Contratos Principais

Execute o script de deployment para implantar os contratos principais (EntryPoint, factories, etc.):

```bash
npm run deploy
```

Este comando implantará os contratos necessários e atualizará o endereço do EntryPoint.

## 6. Criar Diferentes Tipos de Contas

Dependendo do tipo de conta que você quer testar, execute um dos seguintes comandos:

### Conta com Recuperação Social
```bash
npm run create-account
```

### Conta MultiSig (precisa da factory)
```bash
npm run deploy-multisig-factory
npm run create-multisig
```

### Conta com Pagamentos Recorrentes
```bash
npm run deploy-recurring-factory
npm run create-recurring-account
```

### Conta com Autenticacao Biométrica
```bash
npm run deploy-biometric-factory
npm run create-biometric-account
```

### Conta com Recuperação Corporativa
```bash
npm run deploy-corporate-recovery
```

## 7. Configurar Paymaster (para transações gasless)

Se quiser testar transações sem gas (gasless):

```bash
npm run deploy-paymaster
npm run sponsor-address
```

## 8. Testar Funcionalidades

### Executar Testes Automatizados

```bash
npm run test
```

### Testes Específicos

```bash
npm run test:corporate  # Testes para recuperação corporativa
npm run test:bdd        # Testes BDD com Cucumber
```

### Exemplos de Uso

- Gerenciar guardiões: `npm run manage-guardians`
- Recuperar conta: `npm run recover-account`
- Gerenciar transações MultiSig: `npm run multisig-tx`
- Gerenciar assinaturas recorrentes: `npm run manage-subscriptions`
- Gerenciar dispositivos biométricos: `npm run manage-biometric-devices`
- Pagamentos com Autenticacao biométrica: `npm run biometric-payments`

## 9. Execução de Transação sem Gas

Para testar uma transação sem gas (patrocinada):

```bash
npm run gasless-tx
```

## Solução de Problemas

### Erro de Nonce
Se encontrar erros relacionados a nonce:

```bash
npx hardhat clean
npm run compile
```

### Problemas com o Node Local
Reinicie o node Hardhat:

```bash
# Ctrl+C para parar o node atual
npm run node
```

### Erro de Conexão com RPC
Verifique se o node Hardhat esta rodando e se o URL no .env esta correto.

---

Este guia cobre a configuração básica para desenvolvimento local. Para implantação em testnets como Sepolia, use os comandos com a flag `--network sepolia`. 