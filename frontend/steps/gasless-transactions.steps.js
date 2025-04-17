import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import TransactionService from '../src/services/TransactionService';

Given('que estou conectado à minha carteira', async function() {
  await this.navigateTo('/wallet');
  this.isConnected = await this.executeScript(() => window.isWalletConnected);
  expect(this.isConnected).to.be.true;
});

Given('minha carteira esta patrocinada pelo SponsorPaymaster', async function() {
  this.isSponsored = await TransactionService.checkSponsorStatus();
  expect(this.isSponsored).to.be.true;
});

When('eu preencho o endereço do destinatário {string}', async function(address) {
  await this.fillInput('#recipient-address', address);
});

When('preencho o valor de {string} ETH', async function(amount) {
  await this.fillInput('#transaction-amount', amount);
});

When('clico em {string}', async function(buttonText) {
  await this.clickElement(`button:contains("${buttonText}")`);
});

Then('a transação deve ser processada sem custo de gas para mim', async function() {
  // Verificar que nenhum ETH foi gasto para gas
  const beforeBalance = this.initialBalance || '0';
  const afterBalance = await TransactionService.getBalance();
  
  // Em transações patrocinadas, o saldo nao deve diminuir devido ao gas
  // Pode diminuir apenas pelo valor da transação
  const amountValue = parseFloat(this.transactionAmount || '0');
  const expectedBalance = parseFloat(beforeBalance) - amountValue;
  
  // Compara com uma pequena margem de erro para evitar problemas com precisão de ponto flutuante
  expect(parseFloat(afterBalance)).to.be.closeTo(expectedBalance, 0.0001);
});

Then('devo ver uma confirmação de transação bem-sucedida', async function() {
  // Verificar que a transação foi confirmada com sucesso
  const confirmationMessage = await this.getElement('#transaction-confirmation').getText();
  expect(confirmationMessage).to.contain('Transação enviada com sucesso');
  
  // Verificar que o hash da transação esta presente
  const txHash = await this.getElement('#transaction-hash').getText();
  expect(txHash).to.match(/^0x[a-fA-F0-9]{64}$/);
}); 