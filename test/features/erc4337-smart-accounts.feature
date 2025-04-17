@erc4337
Feature: ERC-4337 Smart Accounts
  Como usuário da plataforma
  Quero utilizar contas inteligentes compatíveis com ERC-4337
  Para gerenciar meus ativos com maior segurança e flexibilidade

  Background:
    Given a Hardhat node is running
    And the EntryPoint contract is deployed
    And the Account Factory contract is deployed

  @social-recovery
  Scenario: Criar uma conta com recuperação social
    Given o contrato SocialRecoveryAccountFactory está implantado
    When eu crio uma nova conta com recuperação social
    Then a conta deve ser criada com sucesso
    And o endereço da conta deve ser registrado corretamente
    And eu devo ser o proprietário da conta

  @social-recovery
  Scenario: Configurar guardiões para recuperação social
    Given eu tenho uma conta com recuperação social
    When eu adiciono 3 guardiões à minha conta
    And eu configuro um limiar de recuperação de 2 guardiões
    And eu defino um atraso de recuperação de 24 horas
    Then os guardiões devem ser registrados corretamente
    And o limiar de recuperação deve ser definido como 2
    And o atraso de recuperação deve ser definido como 24 horas

  @social-recovery
  Scenario: Recuperar uma conta social após perda da chave privada
    Given eu tenho uma conta com recuperação social configurada com 3 guardiões e limiar 2
    And eu perdi acesso à minha chave privada
    When o guardião 1 inicia o processo de recuperação para um novo endereço
    And o guardião 2 aprova a recuperação
    And o período de espera é concluído
    And o guardião 1 executa a recuperação
    Then a propriedade da conta deve ser transferida para o novo endereço
    And o novo proprietário deve poder operar a conta

  @biometric
  Scenario: Criar uma conta com autenticação biométrica
    Given o contrato BiometricAuthAccountFactory está implantado
    When eu crio uma nova conta com autenticação biométrica
    Then a conta deve ser criada com sucesso
    And eu devo ser capaz de registrar dispositivos biométricos

  @biometric
  Scenario: Configurar dispositivos com limites de transação diários
    Given eu tenho uma conta com autenticação biométrica
    When eu registro um dispositivo principal com limite diário de 0.5 ETH
    And eu registro um dispositivo de backup com limite diário de 0.2 ETH
    Then o dispositivo principal deve ter limite de 0.5 ETH
    And o dispositivo de backup deve ter limite de 0.2 ETH

  @gasless @paymaster
  Scenario: Realizar transações sem custos de gas usando Paymaster
    Given eu tenho uma conta compatível com ERC-4337
    And o SponsorPaymaster está implantado e configurado
    When minha conta é patrocinada pelo Paymaster
    And eu envio uma transação sem gas para um endereço
    Then a transação deve ser processada com sucesso
    And eu não devo pagar pelos custos de gas
    And o Paymaster deve cobrir os custos de gas

  @biometric @limites
  Scenario: Rejeitar transações que excedem o limite diário do dispositivo
    Given eu tenho uma conta com autenticação biométrica
    And um dispositivo registrado com limite diário de 0.1 ETH
    When eu tento enviar 0.2 ETH usando o dispositivo
    Then a transação deve ser rejeitada
    And devo receber um erro informando que o limite diário foi excedido 