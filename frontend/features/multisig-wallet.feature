Feature: Carteira MultiSig
  Como usuário corporativo ou DAO
  Eu quero gerenciar fundos com múltiplas assinaturas
  Para aumentar a segurança e controle sobre os ativos

  Scenario: Criação de carteira MultiSig
    Given que estou na página de criação de carteira MultiSig
    When eu adiciono "3" proprietários
    And defino o threshold como "2"
    And defino o limite diário como "1" ETH
    And defino o limite por transação como "0.5" ETH
    And clico em "Criar Carteira MultiSig"
    Then a carteira MultiSig deve ser criada com sucesso
    And devo ver os detalhes da configuração

  Scenario: Proposta de transação MultiSig
    Given que estou conectado à carteira MultiSig
    When eu preencho um endereço de destino
    And defino um valor de "0.1" ETH
    And clico em "Propor Transação"
    Then a transação deve ser proposta com sucesso
    And deve aparecer na lista de transações pendentes 