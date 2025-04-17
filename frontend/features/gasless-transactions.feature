Feature: Transações Sem Custos de Gas
  Como usuário da plataforma
  Eu quero realizar transações sem precisar ter ETH para gas
  Para que eu possa interagir com dApps mesmo sem fundos

  Scenario: Envio de transação patrocinada
    Given que estou conectado à minha carteira
    And minha carteira esta patrocinada pelo SponsorPaymaster
    When eu preencho o endereço do destinatário "0xRecipient"
    And preencho o valor de "0.01" ETH
    And clico em "Enviar Transação"
    Then a transação deve ser processada sem custo de gas para mim
    And devo ver uma confirmação de transação bem-sucedida 