Feature: Autenticacao Biométrica
  Como usuário da plataforma
  Eu quero criar e acessar minha carteira usando biometria
  Para que eu nao precise gerenciar frases-semente complexas

  Scenario: Verificação de Compatibilidade do Dispositivo
    Given que estou na página de criação de conta
    When o sistema verifica a compatibilidade do meu dispositivo
    Then devo ver uma mensagem indicando se meu dispositivo suporta biometria

  Scenario: Criação de Conta com Biometria
    Given que estou na página de criação de conta
    And meu dispositivo suporta biometria
    When eu clico no botão "Criar Conta com Biometria"
    And autorizo o uso da minha biometria
    Then uma nova carteira deve ser criada
    And devo ser redirecionado para o dashboard

  Scenario: Autenticacao com Biometria
    Given que possuo uma conta biométrica
    When eu tento acessar minha carteira
    And forneço minha Autenticacao biométrica
    Then devo ser autenticado com sucesso
    And visualizar meu saldo e transações 