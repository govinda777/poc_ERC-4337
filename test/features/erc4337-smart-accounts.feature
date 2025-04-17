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

  @corporate @multisig
  Scenario: Criar uma carteira corporativa multisig
    Given o contrato CorporateRecoveryAccountFactory está implantado
    When eu crio uma nova carteira corporativa com 5 signatários e limiar 3
    Then a carteira deve ser criada com sucesso
    And os 5 signatários devem ser registrados corretamente
    And o limiar de aprovação deve ser configurado como 3

  @corporate @recovery
  Scenario: Iniciar processo de recuperação de carteira corporativa
    Given eu tenho uma carteira corporativa com 5 signatários e limiar 3
    And 2 signatários perderam acesso aos seus dispositivos
    When um signatário remanescente inicia o processo de recuperação
    And propõe uma nova lista com 5 signatários
    Then o processo de recuperação deve ser iniciado
    And a proposta de novos signatários deve ser registrada
    And o período de espera de 7 dias deve ser iniciado

  @corporate @recovery
  Scenario: Completar recuperação de carteira corporativa
    Given eu tenho uma carteira corporativa em processo de recuperação
    And o período de espera de 7 dias foi concluído
    When um signatário autorizado executa a recuperação
    Then a lista de signatários deve ser atualizada
    And a carteira deve continuar funcionando com a nova configuração
    And todos os ativos devem permanecer na carteira

  @onboarding @gaming
  Scenario: Criar conta de jogador com login social
    Given o contrato GameAccountFactory está implantado
    And o GamePaymaster está configurado
    When um novo jogador se autentica via Google
    And cria uma carteira sem ETH inicial
    Then a conta do jogador deve ser criada com sucesso
    And o jogador deve poder realizar transações patrocinadas

  @onboarding @gaming
  Scenario: Realizar primeira transação em jogo sem ETH
    Given eu tenho uma conta de jogador recém-criada
    And eu não possuo ETH na carteira
    When eu tento adquirir um item no jogo que custa 10 tokens
    Then a transação deve ser patrocinada pelo GamePaymaster
    And eu devo receber o item no jogo
    And o custo de gas deve ser coberto pelo jogo

  @auction @nft
  Scenario: Configurar conta para leilões de NFTs
    Given o contrato AuctionAccountFactory está implantado
    When eu crio uma nova conta para leilões
    And eu deposito 1 ETH e 100 tokens de governança na conta
    Then a conta deve ser configurada corretamente para leilões
    And o saldo deve mostrar 1 ETH e 100 tokens disponíveis

  @auction @nft
  Scenario: Fazer lance em leilão com pagamento composto
    Given eu tenho uma conta de leilão configurada
    And um leilão de NFT está ativo
    When eu faço um lance de 0.5 ETH e 50 tokens de governança
    Then o lance deve ser registrado com sucesso
    And os valores devem ser reservados para o leilão
    And o lance deve ser processado em uma única transação

  @batch @payments
  Scenario: Configurar pagamentos em lote
    Given eu tenho uma conta compatível com ERC-4337
    When eu configuro 3 pagamentos recorrentes para diferentes destinatários
    And defino uma frequência mensal para execução
    Then os pagamentos recorrentes devem ser registrados corretamente
    And a próxima data de execução deve ser configurada

  @batch @payments
  Scenario: Executar pagamentos em lote automaticamente
    Given eu tenho pagamentos em lote configurados
    And a data de execução foi atingida
    When o serviço automatizado dispara a execução
    Then todos os pagamentos devem ser processados em uma única transação
    And eu devo pagar apenas uma vez o custo de gas
    And os destinatários devem receber os valores corretos 