import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import BiometricService from '../src/services/BiometricService';
import AccountService from '../src/services/AccountService';

Given('que estou na página de criação de conta', async function() {
  await this.navigateTo('/create-account');
});

When('o sistema verifica a compatibilidade do meu dispositivo', async function() {
  this.isCompatible = await BiometricService.checkDeviceCompatibility();
});

Then('devo ver uma mensagem indicando se meu dispositivo suporta biometria', async function() {
  const message = await this.getElement('#compatibility-message').getText();
  if (this.isCompatible) {
    expect(message).to.contain('Seu dispositivo suporta Autenticacao biométrica');
  } else {
    expect(message).to.contain('Seu dispositivo nao suporta Autenticacao biométrica');
  }
});

Given('meu dispositivo suporta biometria', async function() {
  this.isCompatible = await BiometricService.checkDeviceCompatibility();
  expect(this.isCompatible).to.be.true;
});

When('eu clico no botão {string}', async function(buttonText) {
  await this.clickElement(`button:contains("${buttonText}")`);
});

When('autorizo o uso da minha biometria', async function() {
  // Simula a autorização biométrica
  this.biometricResult = await BiometricService.registerBiometric('testuser');
  expect(this.biometricResult).to.have.property('credentialId');
});

Then('uma nova carteira deve ser criada', async function() {
  // Verifica se a carteira foi criada
  this.walletAddress = await AccountService.getWalletAddress();
  expect(this.walletAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
});

Then('devo ser redirecionado para o dashboard', async function() {
  const currentUrl = await this.getCurrentUrl();
  expect(currentUrl).to.include('/dashboard');
});

Given('que possuo uma conta biométrica', async function() {
  // Configura o estado para um usuário com conta biométrica
  await this.navigateTo('/login');
  this.hasAccount = await AccountService.hasBiometricAccount();
  expect(this.hasAccount).to.be.true;
});

When('eu tento acessar minha carteira', async function() {
  await this.clickElement('#login-button');
});

When('forneço minha Autenticacao biométrica', async function() {
  // Simula a verificação biométrica
  this.authResult = await BiometricService.authenticate();
  expect(this.authResult.success).to.be.true;
});

Then('devo ser autenticado com sucesso', async function() {
  const isLoggedIn = await AccountService.isLoggedIn();
  expect(isLoggedIn).to.be.true;
});

Then('visualizar meu saldo e transações', async function() {
  const balanceElement = await this.getElement('#wallet-balance');
  const transactionsElement = await this.getElement('#transaction-history');
  
  expect(await balanceElement.isDisplayed()).to.be.true;
  expect(await transactionsElement.isDisplayed()).to.be.true;
}); 