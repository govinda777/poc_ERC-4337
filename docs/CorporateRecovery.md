# Recuperação de Carteira Corporativa (ERC-4337)

Este documento descreve a implementação do caso de uso de recuperação de carteiras corporativas usando o padrão ERC-4337, permitindo que empresas recuperem o acesso às suas carteiras mesmo após a perda de dispositivos.

## Problema Resolvido

Empresas que utilizam carteiras multisig frequentemente enfrentam desafios quando perdem acesso a dispositivos, principalmente com a rotatividade de funcionários ou falhas em hardware. No caso de um multisig 3/5 (três de cinco assinaturas necessárias), perder 2 dispositivos ainda deixa 3 signatários, o que permite o funcionamento normal da carteira, mas cria vulnerabilidades em caso de novas perdas.

A solução implementada permite que a empresa configure uma nova lista de signatários, utilizando os dispositivos remanescentes, sem a necessidade de seed phrases, mas com um período de segurança para evitar ataques.

## Componentes Implementados

1. **CorporateRecoveryAccount.sol**
   - Contrato principal da carteira com funcionalidades multisig
   - Mecanismo de recuperação baseado em votação dos signatários remanescentes
   - Período de espera de 7 dias para prevenção de ataques
   - Atualização completa de signatários sem necessidade de seed phrase

2. **CorporateRecoveryAccountFactory.sol**
   - Fábrica para criação de novas carteiras corporativas
   - Usando padrão ERC-1967 para proxies atualizáveis
   - Compatível com o EntryPoint do ERC-4337

3. **deploy-corporate-recovery.js**
   - Script para demonstração completa do fluxo de recuperação
   - Simulação de perda de dispositivos
   - Demonstração do tempo de espera e processo de aprovação

## Fluxo de Recuperação

1. **Trigger de Recuperação** - Um dos signatários remanescentes inicia o processo através de `initiateRecovery()`, propondo a nova lista de signatários.

2. **Aprovação por Signatários** - Outros signatários remanescentes aprovam a solicitação usando `approveRecovery()`.

3. **Período de Espera** - Um período obrigatório de 7 dias (configurável) é aplicado para prevenir ataques.

4. **Execução da Recuperação** - Após o período de espera, qualquer signatário pode executar `recoverAccess()` para efetivar a mudança.

5. **Nova Configuração** - A carteira passa a operar com a nova lista de signatários, mantendo todos os ativos e histórico.

## Especificações Técnicas

- **Threshold de Recuperação**: Exige apenas que um signatário autorizado inicie o processo, mas a recuperação só é executada após o período de espera.
- **Período de Segurança**: Padrão de 7 dias, configurável pela própria empresa entre 1 e 30 dias.
- **Requisitos de Novos Signatários**: Mínimo de 3 signatários na nova configuração, sem duplicatas.
- **Segurança Adicional**: Eventos emitidos para auditoria e rastreabilidade em todas as etapas.

## Diagrama de Fluxo
```
Iniciação (por signatário atual) → Aprovações (por outros signatários) → 
Período de Espera (7 dias) → Execução da Recuperação → Nova Configuração
```

## Vantagens sobre Sistemas Tradicionais

1. **Sem Dependência de Seed Phrases**: A recuperação é feita pela própria governança interna da carteira.
2. **Flexibilidade Organizacional**: Permite adaptação à rotatividade de pessoal sem comprometer fundos.
3. **Descentralização Mantida**: Preserva o modelo de múltiplas aprovações, sem pontos centrais de falha.
4. **Auditabilidade**: Todas as mudanças são registradas em blockchain com timestamps verificáveis.

## Benefícios para o Negócio

- **Continuidade Operacional**: Evita travamento de fundos em casos de perda de dispositivos
- **Redução de Riscos**: Elimina pontos únicos de falha em seed phrases guardadas em cofres
- **Gerenciamento Simplificado**: Processo claro e auditável para substituição de signatários
- **Controle Interno**: A empresa mantém governança sobre seus próprios processos de recuperação

## Como Executar o Exemplo

Para testar este caso de uso:

```bash
# Instalar dependências
npm install

# Compilar contratos
npx hardhat compile

# Executar script de demonstração
npx hardhat run scripts/deploy-corporate-recovery.js
```

---

Este caso de uso demonstra como o padrão ERC-4337 permite implementar funcionalidades avançadas de controle e recuperação em carteiras corporativas, combinando segurança e usabilidade sem comprometer descentralização. 