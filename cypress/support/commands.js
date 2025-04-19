// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Comando para simular a conexão de carteira em aplicações web3
Cypress.Commands.add('connectWallet', () => {
  // Simulando a existência do objeto ethereum do Metamask
  cy.window().then((win) => {
    // Mock do objeto ethereum
    win.ethereum = {
      request: () => Promise.resolve(['0x0000000000000000000000000000000000000001']),
      on: () => {},
      removeListener: () => {},
      autoRefreshOnNetworkChange: false,
      isMetaMask: true,
      isConnected: () => true,
      networkVersion: '1',
      chainId: '0x1'
    };
    
    // Simular um clique no botão de conectar carteira
    cy.get('button').contains(/conectar|connect/i).click();
  });
}); 