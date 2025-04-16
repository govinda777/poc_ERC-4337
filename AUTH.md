# Autenticação Biométrica em Contas ERC-4337

Este documento detalha a implementação da autenticação biométrica para carteiras inteligentes (smart wallets) baseadas no padrão ERC-4337, direcionada à melhoria da experiência de usuários não técnicos.

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Componentes](#componentes)
4. [Fluxo de Operação](#fluxo-de-operação)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Guia de Uso](#guia-de-uso)
7. [Autenticação em Dois Fatores (2FA)](#autenticação-em-dois-fatores-2fa)
8. [Considerações de Segurança](#considerações-de-segurança)
9. [Limitações Atuais](#limitações-atuais)
10. [Roadmap Futuro](#roadmap-futuro)
11. [Perguntas Frequentes](#perguntas-frequentes)

## Visão Geral

A autenticação biométrica para contas ERC-4337 permite que usuários interajam com blockchain Ethereum usando identificação biométrica (impressão digital, reconhecimento facial) em vez de frases-semente ou chaves privadas. Isso simplifica drasticamente a experiência do usuário e elimina uma barreira significativa para adoção em massa.

### Principais Benefícios

- **Sem frases-semente**: Usuários não precisam gerenciar ou memorizar frases mnemônicas
- **Segurança aprimorada**: Vincula acesso à conta a características físicas únicas do usuário
- **Experiência familiar**: Utiliza o mesmo método de autenticação que muitos aplicativos móveis
- **Recuperação flexível**: Suporta múltiplos dispositivos para redundância e recuperação

## Arquitetura

A implementação integra três componentes principais:

1. **Contratos inteligentes**: Implementam a lógica de validação de contas ERC-4337 com suporte a múltiplos dispositivos
2. **Backend/scripts**: Permitem deployment e gerenciamento das contas biométricas
3. **Frontend**: Oferece interface para interagir com autenticação biométrica nos dispositivos

### Diagrama de Arquitetura

```
+-------------------+     +----------------------+     +------------------+
|                   |     |                      |     |                  |
|  Dispositivo do   |     |  Contratos ERC-4337  |     |                  |
|     Usuário       |     |                      |     |    Bundler       |
|                   |     |  BiometricAuth       |     |    ERC-4337      |
| +---------------+ |     |  Account             |     |                  |
| |               | |     |                      |     |                  |
| |  WebAuthn API | |     |                      |     |                  |
| |               | |     |                      |     |                  |
| +-------+-------+ |     |                      |     |                  |
|         |         |     |                      |     |                  |
| +-------v-------+ |     |                      |     |                  |
| |               +--------->                    +------>                 |
| |  Frontend UI  | |     |                      |     |                  |
| |               |<---------+                   |<------+                |
| +---------------+ |     |                      |     |                  |
|                   |     |                      |     |                  |
+-------------------+     +----------------------+     +------------------+
```

## Componentes

### Contratos Inteligentes

#### BiometricAuthAccount.sol

Este contrato é uma implementação de conta ERC-4337 que permite autenticação via dispositivos biométricos.

**Características principais:**
- Gerenciamento de múltiplos dispositivos autorizados
- Configuração de número mínimo de dispositivos necessários
- Validação de assinaturas vinda de dispositivos registrados
- Suporte à execução de transações individuais e em lote

#### BiometricAuthAccountFactory.sol

Contrato factory que permite a criação e gerenciamento de contas BiometricAuthAccount.

**Características principais:**
- Criação predictível de endereços usando Create2
- Inicialização de contas com conjuntos de dispositivos autorizados
- Reutilização de implementação para economizar gas

### Scripts de Backend

#### deployBiometricAuthFactory.js

Script para implantar a BiometricAuthAccountFactory na rede Ethereum.

#### createBiometricAccount.js

Script para criar uma nova conta BiometricAuthAccount com dispositivos específicos.

#### manageBiometricDevices.js

Script para gerenciar dispositivos biométricos, permitindo adicionar/remover dispositivos e ajustar configurações.

### Frontend

#### biometricAuth.js

Módulo JavaScript para interação com a API Web Authentication do navegador e conexão com contratos BiometricAuthAccount.

**Funcionalidades:**
- Detecção de capacidades biométricas do dispositivo
- Criação e gerenciamento de chaves biométricas
- Execução de transações com autenticação biométrica

#### biometricUI.html

Interface de usuário para criar contas biométricas e executar transações.

## Fluxo de Operação

### Criação de Conta

1. O usuário acessa a interface web no dispositivo móvel
2. O sistema verifica se o dispositivo suporta autenticação biométrica
3. O usuário solicita a criação de uma nova conta biométrica
4. O sistema solicita autenticação biométrica (impressão digital/face)
5. O navegador gera um par de chaves criptográficas associado à biometria
6. O endereço Ethereum é derivado da chave pública
7. A conta BiometricAuthAccount é criada com o dispositivo registrado
8. O usuário pode adicionar dispositivos adicionais para redundância

### Execução de Transação

1. O usuário inicia uma transação (ex: envio de tokens)
2. O sistema prepara a UserOperation conforme ERC-4337
3. O sistema solicita autenticação biométrica do usuário
4. O navegador usa a chave privada protegida por biometria para assinar
5. A assinatura é enviada ao bundler ERC-4337
6. O contrato BiometricAuthAccount valida a assinatura
7. Se a assinatura for válida, a transação é executada

## Instalação e Configuração

### Pré-requisitos

- Node.js v14+
- Hardhat
- MetaMask ou carteira compatível com WalletConnect
- Dispositivo com capacidades biométricas (smartphone/tablet moderno)

### Implantação dos Contratos

```bash
# Instalar dependências
npm install

# Compilar contratos
npx hardhat compile

# Implantar EntryPoint e BiometricAuthAccountFactory
npx hardhat run scripts/deployBiometricAuthFactory.js --network <rede>
# ou usando alias npm
npm run deploy-biometric-factory
```

### Configuração do Frontend

1. Edite o arquivo `frontend/biometricUI.html` para incluir os endereços corretos dos contratos implantados
2. Hospede os arquivos frontend em um servidor HTTPS (requisito para WebAuthn)
3. Acesse a interface via dispositivo móvel com suporte a biometria

## Guia de Uso

### Criação de Conta Biométrica

**Via Frontend:**
1. Acesse a interface web no dispositivo móvel
2. Conecte sua carteira (MetaMask/WalletConnect) 
3. Clique em "Criar Conta com Biometria"
4. Siga as instruções para autenticação biométrica
5. Confirme a transação de criação de conta

**Via CLI:**
```bash
# Criar conta com dispositivo padrão
npx hardhat run scripts/createBiometricAccount.js --network <rede>

# Criar conta com múltiplos dispositivos
npx hardhat run scripts/createBiometricAccount.js --network <rede> 0xDevice1,0xDevice2,0xDevice3 2
```

### Gerenciamento de Dispositivos

**Via Frontend:**
1. Acesse a interface web no dispositivo
2. Conecte-se à conta biométrica
3. Navegue até "Gerenciar Dispositivos"
4. Utilize as opções para adicionar/remover dispositivos

**Via CLI:**
```bash
# Listar informações da conta
npx hardhat run scripts/manageBiometricDevices.js --network <rede> -- list 0xCONTA

# Adicionar dispositivo
npx hardhat run scripts/manageBiometricDevices.js --network <rede> -- add 0xCONTA 0xNOVO_DISPOSITIVO

# Remover dispositivo
npx hardhat run scripts/manageBiometricDevices.js --network <rede> -- remove 0xCONTA 0xDISPOSITIVO

# Atualizar mínimo de dispositivos
npx hardhat run scripts/manageBiometricDevices.js --network <rede> -- set-min 0xCONTA 2
```

### Execução de Transações

1. Acesse a interface web no dispositivo
2. Conecte-se à conta biométrica
3. Preencha os detalhes da transação (destinatário, valor)
4. Clique em "Enviar com Biometria"
5. Autentique-se usando biometria quando solicitado

## Autenticação em Dois Fatores (2FA)

Além da autenticação biométrica, o sistema suporta integração com Autenticação em Dois Fatores (2FA) para aumentar a segurança e fornecer métodos alternativos de verificação.

### Visão Geral do 2FA

A autenticação em dois fatores adiciona uma camada extra de segurança exigindo dois métodos distintos de verificação antes de autorizar transações ou alterações na conta. Isto segue o princípio de segurança de "algo que você tem" (dispositivo) combinado com "algo que você sabe" (código) ou "algo que você é" (biometria).

### Métodos de 2FA Implementados

#### TOTP (Time-based One-Time Password)

- Utiliza aplicativos como Google Authenticator, Authy ou Microsoft Authenticator
- Gera códigos temporários (normalmente de 6 dígitos) que mudam a cada 30 segundos
- Não requer conexão à internet para gerar códigos

#### SMS/E-mail

- Envia códigos de verificação via SMS ou e-mail
- Útil como método de backup quando o acesso ao autenticador primário não está disponível
- Menos seguro que TOTP, mas oferece redundância

#### Chaves de Segurança Físicas

- Suporte para dispositivos como YubiKey ou chaves FIDO2
- Requer presença física e interação com o dispositivo (toque)
- Alta segurança contra ataques remotos

### Integração 2FA com Contas Biométricas

O 2FA pode ser integrado às contas biométricas de duas maneiras:

#### 1. Verificação Complementar

Neste modelo, tanto a autenticação biométrica quanto o 2FA são necessários para autorizar transações de alto valor ou operações críticas (ex: adicionar/remover dispositivos).

```
+----------------+     +-------------------+     +----------------+
| Autenticação   |     | Verificação       |     | Transação      |
| Biométrica     |---->| de Código 2FA     |---->| Autorizada     |
|                |     |                   |     |                |
+----------------+     +-------------------+     +----------------+
```

#### 2. Método de Recuperação/Fallback

Neste modelo, o 2FA serve como método alternativo quando a autenticação biométrica não está disponível ou falha.

```
                      +----------------+
                 +--->| Autenticação   |
                 |    | Biométrica     |----+
+------------+   |    +----------------+    |    +----------------+
| Iniciar    |---+                          +--->| Transação      |
| Transação  |   |    +----------------+    |    | Autorizada     |
+------------+   |    | Verificação    |    |    |                |
                 +--->| de Código 2FA  |----+    +----------------+
                      +----------------+
```

### Implementação de 2FA

#### Componentes de Backend

O sistema implementa 2FA através dos seguintes componentes:

1. **TwoFactorAuthManager.sol**
   - Contrato que gerencia associações entre contas e métodos 2FA
   - Armazena hashes de segredos TOTP
   - Valida provas de autenticação

2. **2FAVerifier.js**
   - Módulo JavaScript para verificar códigos TOTP
   - Gerencia comunicação com APIs de envio de SMS/e-mail
   - Valida provas de autenticação com chaves físicas

#### Frontend

A interface de usuário para 2FA inclui:

1. **Configuração de 2FA**
   - Geração de códigos QR para configuração em aplicativos autenticadores
   - Validação inicial do código para confirmar configuração correta
   - Opções para adicionar métodos de backup

2. **Fluxo de Autenticação**
   - Campo para inserção de código TOTP
   - Suporte para NFC/USB para chaves físicas
   - Opções para solicitar códigos alternativos via SMS/e-mail

### Fluxo de Operação com 2FA

#### Configuração Inicial

1. Usuário acessa configurações de segurança na interface
2. Seleciona "Configurar 2FA" e escolhe o método (TOTP, SMS, chave física)
3. Para TOTP:
   - Sistema gera segredo e exibe QR code
   - Usuário escaneia com aplicativo autenticador
   - Sistema solicita código gerado para verificar configuração
4. O contrato armazena as informações de verificação

#### Autorização de Transação

1. Usuário inicia uma transação
2. Sistema solicita autenticação biométrica (primeiro fator)
3. Após aprovação biométrica, solicita código 2FA (segundo fator)
4. Sistema verifica o código:
   - TOTP: verifica se o código corresponde ao esperado para o timestamp atual
   - SMS/E-mail: verifica se o código enviado corresponde ao digitado
   - Chave física: verifica a assinatura criptográfica do dispositivo
5. Transação é executada apenas após verificação de ambos os fatores

### Benefícios do 2FA

1. **Segurança Aprimorada**: Mitigação de riscos mesmo se um fator de autenticação for comprometido
2. **Flexibilidade**: Múltiplas opções de autenticação adaptadas às necessidades do usuário
3. **Redundância**: Métodos alternativos garantem acesso mesmo se um sistema falhar
4. **Proteção contra Phishing**: Chaves físicas e TOTP são resistentes a ataques de phishing
5. **Conformidade**: Atende requisitos de segurança para aplicações financeiras

### Configuração de 2FA via CLI

```bash
# Configurar TOTP para uma conta
npx hardhat run scripts/setup2FA.js --network <rede> -- totp 0xCONTA

# Configurar SMS para uma conta
npx hardhat run scripts/setup2FA.js --network <rede> -- sms 0xCONTA +5511999999999

# Configurar e-mail para uma conta
npx hardhat run scripts/setup2FA.js --network <rede> -- email 0xCONTA usuario@exemplo.com

# Verificar configuração 2FA
npx hardhat run scripts/verify2FA.js --network <rede> -- 0xCONTA 123456
```

### Considerações de Segurança Específicas para 2FA

- **SMS**: Vulnerável a ataques de SIM swapping; use apenas como backup
- **E-mail**: Sensível à segurança da conta de e-mail; use com autenticação forte
- **TOTP**: Proteja o segredo inicial durante a configuração
- **Backup de Códigos**: Forneça códigos de recuperação para emergências

### Integração com Recuperação Social

O 2FA pode ser combinado com mecanismos de recuperação social para criar um sistema completo de recuperação de conta:

1. Para operações de baixo risco: apenas 2FA
2. Para operações de médio risco: biometria + 2FA
3. Para recuperação de conta: biometria/2FA + aprovação de guardiões sociais

## Considerações de Segurança

### Modelo de Segurança

A segurança da implementação atual depende de:

1. **Segurança do dispositivo**: O dispositivo do usuário deve estar seguro e livre de malware
2. **Implementação WebAuthn**: A segurança da API WebAuthn e seu enclave seguro no dispositivo
3. **Número mínimo de dispositivos**: Configurar adequadamente para balancear conveniência e segurança
4. **Smart contract**: Validação adequada de assinaturas e controle de acesso

### Práticas Recomendadas

- **Múltiplos dispositivos**: Registre pelo menos 2 dispositivos distintos
- **Atualizações regulares**: Mantenha seu dispositivo atualizado com patches de segurança
- **Redundância**: Considere implementar um método de recuperação alternativo
- **Teste inicial**: Realize operações de pequeno valor até ganhar confiança no sistema

### Limitações do WebAuthn

- A autenticação é específica para o dispositivo e navegador usados
- Algumas implementações WebAuthn têm quirks específicos por navegador
- Requer HTTPS ou localhost para funcionar

## Limitações Atuais

1. **Simulação vs Implementação Real**: A versão atual simula a API WebAuthn para fins de demonstração
2. **Recuperação de Conta**: Sistema de recuperação limitado se todos os dispositivos forem perdidos
3. **UX em Diferentes Navegadores**: Experiência inconsistente entre diferentes navegadores/SO
4. **Rastreamento off-chain**: Não há mecanismo on-chain para listar todos os dispositivos
5. **Custos de Gas**: Adicionar/remover dispositivos requer transações que consomem gas

## Roadmap Futuro

- **Implementação WebAuthn Completa**: Substituir simulação por implementação real
- **Integração de Recuperação Social**: Combinar biometria com recuperação social
- **Banco de Dados Off-chain**: Armazenar metadados de dispositivos para melhor UX
- **Monitoramento de Segurança**: Alertas para atividades suspeitas
- **Integração de Identidade Descentralizada (DID)**: Vincular biometria a identidade verificável

## Perguntas Frequentes

**P: O que acontece se meu dispositivo biométrico for comprometido?**
R: Você pode remover o dispositivo da lista de autorizados e adicionar um novo. Por isso é importante ter múltiplos dispositivos registrados.

**P: Onde são armazenadas as chaves biométricas?**
R: As chaves privadas são armazenadas no enclave seguro do seu dispositivo e nunca deixam o dispositivo. Apenas a chave pública (ou endereço derivado) é armazenada na blockchain.

**P: Como migrar para um novo dispositivo?**
R: Se você tiver acesso a um dispositivo anteriormente registrado, pode adicionar o novo dispositivo e depois remover o antigo.

**P: Posso usar esta solução em um ambiente de produção?**
R: A implementação atual é uma prova de conceito. Para produção, seria necessário implementar a API WebAuthn completa e realizar auditorias de segurança.

**P: Quais tipos de biometria são suportados?**
R: Dependendo do dispositivo, pode incluir impressão digital, reconhecimento facial, reconhecimento de íris, etc. A implementação usa o que estiver disponível no dispositivo via WebAuthn.

---

## Recursos Adicionais

- [Especificação ERC-4337](https://eips.ethereum.org/EIPS/eip-4337)
- [Documentação WebAuthn](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Guia de Segurança de Chaves Biométricas](https://webauthn.guide/)
