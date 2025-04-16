# BDD Tests for Complex NFT Auction

Este diretório contém testes Behavior-Driven Development (BDD) para o caso de uso de Leilão Automático de NFTs com Lances Complexos.

## O que é BDD?

BDD (Behavior-Driven Development) é uma metodologia de desenvolvimento que enfoca o comportamento esperado do software a partir da perspectiva do usuário. Os testes são escritos em linguagem natural usando a sintaxe Gherkin (Given-When-Then), tornando-os compreensíveis por stakeholders não-técnicos.

## Estrutura dos Testes

- **features/**: Contém os arquivos `.feature` que descrevem os comportamentos esperados
  - **complex-nft-auction.feature**: Especificações do leilão de NFTs com lances complexos
- **steps/**: Contém os arquivos que implementam os passos descritos nos arquivos `.feature`
  - **complex-nft-auction.steps.js**: Implementação dos passos para o teste de leilão

## Cenários Testados

1. **Criação de Leilão**: Verifica a criação de um novo leilão com um NFT
2. **Lances com ETH e Tokens**: Testa a funcionalidade de dar lances combinando ETH e tokens de governança
3. **Superação de Lances**: Verifica o comportamento quando um lance é superado por outro usuário
4. **Validações de Lances**: Testa as validações para lances com ETH ou tokens insuficientes
5. **Finalização de Leilão**: Verifica o processo de encerramento de um leilão bem-sucedido
6. **Cancelamento de Leilão**: Testa o cancelamento de um leilão pelo vendedor
7. **Integração com ERC-4337**: Verifica o uso de contas ERC-4337 para dar lances complexos

## Como Executar os Testes

1. Instale as dependências:
   ```
   npm install
   ```

2. Compile os contratos:
   ```
   npm run compile
   ```

3. Execute os testes BDD:
   ```
   npm run test:bdd
   ```

4. Para gerar um relatório detalhado:
   ```
   npx cucumber-js --format html:cucumber-report.html
   ```

## Benefícios do BDD para o Projeto

- **Documentação Viva**: Os arquivos `.feature` servem como documentação executável
- **Comunicação Clara**: Facilita a comunicação entre desenvolvedores e stakeholders
- **Foco no Comportamento**: Garante que a implementação atenda aos requisitos do usuário
- **Cobertura Abrangente**: Os cenários cobrem fluxos normais e casos de erro 