describe('DeFi Insurance with Automatic Redemption Tests', () => {
  let insuranceData;

  beforeEach(() => {
    // Load fixture data
    cy.fixture('defi-insurance.json').then((data) => {
      insuranceData = data;
    });

    // Visit the insurance page before each test
    cy.visit('/defi-insurance');
    
    // Intercept API calls to mock price data
    cy.intercept('GET', '**/api/eth-price', (req) => {
      req.reply({
        statusCode: 200,
        body: { price: insuranceData.initialEthPrice }
      });
    }).as('getEthPrice');

    // Wait for the page to load
    cy.wait('@getEthPrice');
  })

  it('Should display the DeFi Insurance interface components', () => {
    // Check main elements exist
    cy.get('h1').contains('Seguro DeFi').should('exist')
    cy.get('[data-cy="eth-price-display"]').should('contain', insuranceData.initialEthPrice)
    cy.get('[data-cy="trigger-price-display"]').should('contain', insuranceData.triggerPrice)
  })

  it('Should display account creation UI when no smart account exists', () => {
    // Set up the test to simulate no smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'false')
      // Reload to apply changes
      cy.reload()
      // Wait for eth price to load again
      cy.wait('@getEthPrice')
    })

    cy.get('[data-cy="create-account-button"]').should('exist')
    cy.get('[data-cy="deposit-eth"]').should('not.exist')
  })

  it('Should display account details when smart account exists', () => {
    // Set up the test to simulate having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true')
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress)
      // Reload to apply changes
      cy.reload()
      // Wait for eth price to load again
      cy.wait('@getEthPrice')
    })

    // Mock the account balance API call
    cy.intercept('GET', '**/api/account-balance', {
      statusCode: 200,
      body: { balance: insuranceData.accountBalance }
    }).as('getAccountBalance')

    cy.get('[data-cy="account-address"]').should('contain', insuranceData.mockAccountAddress)
    cy.wait('@getAccountBalance')
    cy.get('[data-cy="account-balance"]').should('contain', insuranceData.accountBalance)
    cy.get('[data-cy="deposit-eth"]').should('exist')
  })

  it('Should validate deposit amount input', () => {
    // Set up the test to simulate having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true')
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress)
      // Reload to apply changes
      cy.reload()
      // Wait for eth price to load again
      cy.wait('@getEthPrice')
    })

    // Mock the deposit API call
    cy.intercept('POST', '**/api/deposit', (req) => {
      if (parseFloat(req.body.amount) <= 0) {
        req.reply({
          statusCode: 400,
          body: { error: "Deposit amount must be positive" }
        })
      } else {
        req.reply({
          statusCode: 200,
          body: { success: true, transaction: { hash: "0x123..." } }
        })
      }
    }).as('depositEth')

    // Test invalid deposit amount
    cy.get('#depositAmount').clear().type('-0.01')
    cy.get('[data-cy="deposit-button"]').click()
    cy.wait('@depositEth')
    cy.get('[data-cy="error-message"]').should('exist')

    // Test valid deposit amount
    cy.get('#depositAmount').clear().type(insuranceData.depositAmount)
    cy.get('[data-cy="deposit-button"]').click()
    cy.wait('@depositEth')
    cy.get('[data-cy="success-message"]').should('exist')
  })

  it('Should simulate checking for liquidation conditions when price is above threshold', () => {
    // Set up the test to simulate having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true')
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress)
      // Reload to apply changes
      cy.reload()
      // Wait for eth price to load again
      cy.wait('@getEthPrice')
    })

    // Mock normal price check using a safe price from the fixture
    const safePrice = insuranceData.mockPrices[1] // 1900 price, should be safe
    
    cy.intercept('GET', '**/api/check-liquidation', {
      statusCode: 200,
      body: { 
        canLiquidate: safePrice.canLiquidate, 
        currentPrice: safePrice.price, 
        triggerPrice: insuranceData.triggerPrice,
        timestamp: safePrice.timestamp
      }
    }).as('checkLiquidation')

    cy.get('[data-cy="check-liquidation-button"]').click()
    cy.wait('@checkLiquidation')
    cy.get('[data-cy="price-status"]').should('contain', 'Seus fundos estão seguros')
    cy.get('[data-cy="last-check-time"]').should('contain', new Date(safePrice.timestamp).toLocaleString())
  })

  it('Should simulate liquidation process when price drops below threshold', () => {
    // Set up the test to simulate having a smart account
    cy.window().then((win) => {
      win.localStorage.setItem('hasSmartAccount', 'true')
      win.localStorage.setItem('smartAccountAddress', insuranceData.mockAccountAddress)
      // Reload to apply changes
      cy.reload()
      // Wait for eth price to load again
      cy.wait('@getEthPrice')
    })

    // Mock a price that will trigger liquidation using fixture data
    const dangerPrice = insuranceData.mockPrices[4] // 1590 price, triggers liquidation
    
    // Update the current ETH price
    cy.intercept('GET', '**/api/eth-price', {
      statusCode: 200,
      body: { price: dangerPrice.price }
    }).as('getLowEthPrice')

    // Mock the liquidation check
    cy.intercept('GET', '**/api/check-liquidation', {
      statusCode: 200,
      body: { 
        canLiquidate: dangerPrice.canLiquidate, 
        currentPrice: dangerPrice.price, 
        triggerPrice: insuranceData.triggerPrice,
        timestamp: dangerPrice.timestamp
      }
    }).as('checkLiquidation')

    // Mock the liquidation execution
    cy.intercept('POST', '**/api/execute-liquidation', {
      statusCode: 200,
      body: { 
        success: true, 
        ...insuranceData.liquidationHistory
      }
    }).as('executeLiquidation')

    // Reload to get the updated price
    cy.reload()
    cy.wait('@getLowEthPrice')

    // Check liquidation
    cy.get('[data-cy="check-liquidation-button"]').click()
    cy.wait('@checkLiquidation')
    cy.get('[data-cy="liquidation-warning"]').should('exist')

    // Execute liquidation
    cy.get('[data-cy="manual-liquidation-button"]').should('be.enabled')
    cy.get('[data-cy="manual-liquidation-button"]').click()
    cy.wait('@executeLiquidation')
    
    // Check that liquidation history is displayed
    cy.get('[data-cy="liquidation-history"]').should('exist')
    cy.get('[data-cy="liquidation-timestamp"]').should('contain', new Date(insuranceData.liquidationHistory.timestamp).toLocaleString())
    cy.get('[data-cy="rescued-amount"]').should('contain', insuranceData.liquidationHistory.amountRescued)
    cy.get('[data-cy="rescue-destination"]').should('contain', insuranceData.liquidationHistory.rescueDestination)
    cy.get('[data-cy="create-new-account-button"]').should('exist')
  })

  it('Should be able to create a new insurance account', () => {
    // Mock the create account API call
    cy.intercept('POST', '**/api/create-insurance-account', {
      statusCode: 200,
      body: { 
        success: true, 
        accountAddress: insuranceData.mockAccountAddress,
        owner: insuranceData.mockOwnerAddress,
        oracle: insuranceData.mockOracleAddress,
        rescueDestination: insuranceData.mockRescueDestination,
        triggerPrice: insuranceData.triggerPrice
      }
    }).as('createAccount')

    cy.get('[data-cy="rescue-destination-input"]').type(insuranceData.mockRescueDestination)
    cy.get('[data-cy="create-account-button"]').click()
    cy.wait('@createAccount')
    
    cy.get('[data-cy="account-address"]').should('contain', insuranceData.mockAccountAddress)
    cy.get('[data-cy="deposit-eth"]').should('exist')
  })
}) 