describe('DeFi Insurance API Integration Tests', () => {
  let insuranceData;

  beforeEach(() => {
    // Load fixture data
    cy.fixture('defi-insurance.json').then((data) => {
      insuranceData = data;
    });

    // Mock web3 provider
    cy.on('window:before:load', (win) => {
      win.ethereum = {
        isMetaMask: true,
        request: cy.stub().as('ethereum.request')
      };
    });
    
    // Visit the DeFi insurance page
    cy.visit('/defi-insurance');
  });

  it('Should connect to wallet and fetch account data correctly', () => {
    // Setup mock ethereum responses
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_requestAccounts' })
      .resolves([insuranceData.mockOwnerAddress]);
    
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_chainId' })
      .resolves('0x1'); // Mainnet
    
    // Click connect wallet button
    cy.get('[data-cy="connect-wallet-button"]').click();
    
    // Should display connected address
    cy.get('[data-cy="connected-address"]').should('contain', insuranceData.mockOwnerAddress);
    
    // Mock smart account data fetch
    cy.intercept('GET', '**/api/user-accounts', {
      statusCode: 200,
      body: {
        accounts: [
          {
            address: insuranceData.mockAccountAddress,
            type: 'defi-insurance',
            balance: insuranceData.accountBalance,
            triggerPrice: insuranceData.triggerPrice,
            lastCheck: new Date().toISOString(),
            isLiquidated: false
          }
        ]
      }
    }).as('getUserAccounts');
    
    // Check for account data
    cy.get('[data-cy="fetch-accounts-button"]').click();
    cy.wait('@getUserAccounts');
    
    // Should display account info
    cy.get('[data-cy="account-card"]').should('exist');
    cy.get('[data-cy="account-address"]').should('contain', insuranceData.mockAccountAddress);
    cy.get('[data-cy="account-balance"]').should('contain', insuranceData.accountBalance);
  });

  it('Should handle transaction signing for deposits correctly', () => {
    // Setup mock ethereum account
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_requestAccounts' })
      .resolves([insuranceData.mockOwnerAddress]);
    
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_chainId' })
      .resolves('0x1');
    
    // Mock having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true');
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress);
      // Refresh to apply localStorage changes
      cy.reload();
    });
    
    // Connect wallet
    cy.get('[data-cy="connect-wallet-button"]').click();
    
    // Mock transaction hash response
    const mockTxHash = '0x' + '1'.repeat(64);
    cy.get('@ethereum.request')
      .withArgs({ 
        method: 'eth_sendTransaction',
        params: [
          Cypress.sinon.match.has('to', insuranceData.mockAccountAddress)
        ]
      })
      .resolves(mockTxHash);
    
    // Try to deposit ETH
    cy.get('#depositAmount').clear().type(insuranceData.depositAmount);
    cy.get('[data-cy="deposit-button"]').click();
    
    // Should show success message with tx hash
    cy.get('[data-cy="success-message"]').should('contain', mockTxHash);
  });

  it('Should handle UserOperation for liquidation correctly', () => {
    // Setup mock ethereum account
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_requestAccounts' })
      .resolves([insuranceData.mockOwnerAddress]);
    
    // Mock having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true');
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress);
      cy.reload();
    });
    
    // Connect wallet
    cy.get('[data-cy="connect-wallet-button"]').click();
    
    // Mock price check - price below threshold
    cy.intercept('GET', '**/api/eth-price', {
      statusCode: 200,
      body: { price: insuranceData.mockPrices[5].price } // 1500
    }).as('getLowEthPrice');
    
    cy.reload();
    cy.wait('@getLowEthPrice');
    
    // Mock check liquidation API
    cy.intercept('GET', '**/api/check-liquidation', {
      statusCode: 200,
      body: { 
        canLiquidate: true, 
        currentPrice: insuranceData.mockPrices[5].price,
        triggerPrice: insuranceData.triggerPrice
      }
    }).as('checkLiquidation');
    
    // Check liquidation status
    cy.get('[data-cy="check-liquidation-button"]').click();
    cy.wait('@checkLiquidation');
    
    // Should show liquidation warning
    cy.get('[data-cy="liquidation-warning"]').should('exist');
    
    // Mock ERC-4337 bundler response for user operation
    const mockUserOpHash = '0x' + '2'.repeat(64);
    cy.intercept('POST', '**/rpc/eth_sendUserOperation', {
      statusCode: 200,
      body: {
        jsonrpc: '2.0',
        id: 1,
        result: mockUserOpHash
      }
    }).as('sendUserOperation');
    
    // Mock transaction receipt
    cy.intercept('GET', `**/api/user-op-receipt?hash=${mockUserOpHash}`, {
      statusCode: 200,
      body: {
        success: true,
        receipt: {
          userOpHash: mockUserOpHash,
          entryPoint: '0x' + '3'.repeat(40),
          blockNumber: 12345678,
          blockHash: '0x' + '4'.repeat(64),
          transactionHash: '0x' + '5'.repeat(64)
        }
      }
    }).as('getUserOpReceipt');
    
    // Execute liquidation
    cy.get('[data-cy="manual-liquidation-button"]').click();
    cy.wait('@sendUserOperation');
    cy.wait('@getUserOpReceipt');
    
    // Should show success message
    cy.get('[data-cy="liquidation-success"]').should('exist');
    cy.get('[data-cy="liquidation-history"]').should('exist');
  });

  it('Should handle error cases in the API appropriately', () => {
    // Connect wallet
    cy.get('@ethereum.request')
      .withArgs({ method: 'eth_requestAccounts' })
      .resolves([insuranceData.mockOwnerAddress]);
    
    cy.get('[data-cy="connect-wallet-button"]').click();
    
    // Mock having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true');
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress);
      cy.reload();
    });
    
    // Mock transaction error
    cy.get('@ethereum.request')
      .withArgs({ 
        method: 'eth_sendTransaction',
        params: Cypress.sinon.match.any
      })
      .rejects({ code: 4001, message: 'User rejected the transaction' });
    
    // Try to deposit ETH
    cy.get('#depositAmount').clear().type(insuranceData.depositAmount);
    cy.get('[data-cy="deposit-button"]').click();
    
    // Should show error message
    cy.get('[data-cy="error-message"]').should('contain', 'rejected');
    
    // Mock oracle service error
    cy.intercept('GET', '**/api/eth-price', {
      statusCode: 500,
      body: { error: 'Oracle service unavailable' }
    }).as('getEthPriceError');
    
    cy.reload();
    
    // Should show error message for oracle
    cy.get('[data-cy="oracle-error"]').should('exist');
    cy.get('[data-cy="oracle-error"]').should('contain', 'unavailable');
  });
}); 