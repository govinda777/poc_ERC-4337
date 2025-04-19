describe('Testes da carteira inteligente ERC-4337', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('Deve permitir conectar a carteira', () => {
    // Usando o comando personalizado para conectar a carteira
    cy.connectWallet()
    
    // Após conectar, deve mostrar o endereço da carteira
    cy.get('body').contains(/0x[a-fA-F0-9]{40}/i).should('exist')
  })

  it('Deve exibir opções de criação de carteira inteligente', () => {
    // Conectar carteira primeiro
    cy.connectWallet()
    
    // Depois de conectado, deve exibir opções para criar carteira inteligente
    cy.contains(/criar carteira|create wallet/i).should('exist')
  })

  it('Deve permitir acessar informações sobre recuperação social', () => {
    cy.visit('/')
    
    // Deve ter alguma menção sobre recuperação social na interface
    cy.contains(/recuperação social|social recovery/i).should('exist')
  })
}) 