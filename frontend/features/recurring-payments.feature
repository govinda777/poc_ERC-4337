Feature: Pagamentos Recorrentes
  Como usuário da plataforma
  Eu quero configurar pagamentos automáticos periódicos
  Para gerenciar assinaturas e obrigações financeiras regulares

  Scenario: Configuração de pagamento recorrente
    Given que estou conectado à minha carteira de pagamentos recorrentes
    When eu preencho o endereço do beneficiário "0xPayee"
    And defino o valor de "0.1" ETH
    And seleciono um período de "30" dias
    And clico em "Criar Assinatura"
    Then a assinatura recorrente deve ser criada com sucesso
    And deve aparecer na lista de assinaturas ativas 