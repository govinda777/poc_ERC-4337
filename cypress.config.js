const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    experimentalSkipDomainInjection: true,
    testIsolation: false
  },
  retries: {
    runMode: 1,
    openMode: 0
  },
  env: {
    // Mock mode para testes sem o servidor ativo
    mockMode: true
  }
}) 