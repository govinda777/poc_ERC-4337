# Assinaturas Biométricas para Pagamentos Diários (ERC-4337)

Este documento detalha a implementação do caso de uso de assinaturas biométricas para pagamentos diários, permitindo que usuários façam transações abaixo de um limite definido usando apenas autenticação biométrica, sem confirmações adicionais.

## Problema Resolvido

Usuários de carteiras digitais frequentemente precisam realizar diversas transações de pequeno valor ao longo do dia, e o processo de aprovação manual para cada transação prejudica a experiência do usuário. Ao mesmo tempo, permitir transações automáticas sem limites representa um risco de segurança.

A solução implementada resolve este dilema ao:
1. Permitir transações automáticas com autenticação biométrica (digital no smartphone)
2. Impor um limite diário (R$ 500 ou ~0.15 ETH) para tais transações
3. Manter a opção de transações manuais (sem limite) para necessidades excepcionais

## Componentes Implementados

1. **BiometricAuthAccount.sol**
   - Contrato principal da carteira com suporte a identificação biométrica
   - Sistema de limites diários por dispositivo
   - Controle de uso diário com reset automático a cada 24 horas
   - Suporte a múltiplos dispositivos biométricos

2. **BiometricAuthAccountFactory.sol**
   - Fábrica para criação de novas carteiras biométricas
   - Usando padrão ERC-1967 para proxies atualizáveis
   - Compatível com o EntryPoint do ERC-4337

3. **biometric-daily-payments.js**
   - Script para demonstração do fluxo de transações biométricas
   - Simulação de diferentes dispositivos e limites
   - Testes de limites diários e autenticação

## Fluxo de Transações Biométricas

1. **Registro de Dispositivo** - O usuário registra seu smartphone como dispositivo autorizado, definindo um limite diário (R$ 500).

2. **Autenticação Biométrica** - Para realizar uma transação, o usuário utiliza sua digital/face no smartphone.

3. **Verificação de Limite** - O contrato verifica automaticamente se a transação está dentro do limite diário disponível.

4. **Execução Automática** - Se dentro do limite, a transação é executada sem confirmações adicionais.

5. **Reset Diário** - O limite é automaticamente reiniciado a cada 24 horas.

## Especificações Técnicas

- **Identificação de Dispositivos**: Cada dispositivo recebe um ID único (hash) que é associado às credenciais biométricas.

- **Limites Configuráveis**: Cada dispositivo pode ter um limite diário diferente, permitindo configurações específicas.

- **Verificação Biométrica**: Implementada como função interna:
  ```solidity
  modifier biometricCheck(uint amount) {
      require(amount <= dailyLimit[msg.sender], "Excede limite");
      require(_verifyBiometricSignature(), "Autenticação falhou");
      _;
  }
  ```

- **Controle de Uso**: A carteira mantém registro do uso diário por dispositivo e reseta automaticamente o contador.

- **Segurança Adicional**: Eventos são emitidos para todas as transações, proporcionando trilha de auditoria.

## Diagrama de Fluxo

```
Identificação Biométrica → Verificação de Limite Diário → Execução Automática
     │                              │                             │
     └─ Digital/FaceID              └─ Máximo R$ 500/dia          └─ Sem confirmação adicional
```

## Vantagens sobre Sistemas Tradicionais

1. **Melhor Experiência do Usuário**: Transações de valor baixo acontecem instantaneamente sem fricção adicional.

2. **Segurança por Design**: Limite diário contém potenciais riscos, mesmo se as credenciais forem comprometidas.

3. **Flexibilidade**: O usuário ainda pode fazer transações acima do limite usando aprovação manual.

4. **Multi-dispositivo**: Suporte para múltiplos dispositivos com configurações independentes.

## Casos de Uso Típicos

- **Pagamentos Diários**: Café, transporte, refeições e outras compras cotidianas.
- **Micropagamentos**: Subscrições, gorjetas e pequenas taxas de serviço.
- **Aplicações DeFi**: Staking automatizado, yield farming e outras operações recorrentes.

## Implementação Técnica

A implementação usa três componentes principais:

1. **Verificação Biométrica**: Na implementação real, seria integrada aos sistemas biométricos do dispositivo (Touch ID/Face ID). Para o exemplo de demonstração, usamos assinaturas ECDSA padrão.

2. **Controle de Limites**:
   ```solidity
   if (block.timestamp > dailyUsage[deviceId].lastResetTime + 1 days) {
       dailyUsage[deviceId].used = 0;
       dailyUsage[deviceId].lastResetTime = block.timestamp;
   }
   require(dailyUsage[deviceId].used + value <= dailyLimit[deviceId], "Excede limite");
   ```

3. **Execução Atômica**: O contrato verifica limite, atualiza uso e executa a transação em uma única operação atômica.

## Como Executar o Exemplo

Para testar este caso de uso:

```bash
# Instalar dependências
npm install

# Compilar contratos
npx hardhat compile

# Executar script de demonstração
npx hardhat run scripts/biometric-daily-payments.js
```

---

Este caso de uso demonstra como o padrão ERC-4337 permite implementar funcionalidades de autenticação avançada com limites controlados, aprimorando simultaneamente a experiência do usuário e a segurança. 