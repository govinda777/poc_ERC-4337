Feature: Complex NFT Auction with Governance Tokens
  As a user of the platform
  I want to participate in NFT auctions with combined ETH and governance token payments
  So that I can acquire NFTs through complex bidding processes

  Background:
    Given the governance token contract is deployed
    And the NFT contract is deployed
    And the complex NFT auction contract is deployed
    And the auction account contract is deployed
    And users have been minted tokens and NFTs

  Scenario: Creating a new auction with an NFT
    Given Alice has an NFT with ID 1
    When Alice creates an auction with the following parameters:
      | Parameter       | Value          |
      | tokenId         | 1              |
      | startingPrice   | 0.1 ETH        |
      | minTokenAmount  | 100 tokens     |
      | duration        | 1 day          |
    Then the auction should be created successfully
    And the NFT should be transferred to the auction contract
    And the auction details should be correctly stored

  Scenario: Placing a valid bid with ETH and governance tokens
    Given an active auction with ID 0 for NFT with ID 1
    And Bob has 0.2 ETH and 200 governance tokens
    When Bob places a bid with 0.15 ETH and 150 governance tokens
    Then the bid should be accepted
    And Bob should be registered as the highest bidder
    And the auction's highest ETH bid should be 0.15 ETH
    And the auction's highest token bid should be 150 tokens

  Scenario: Outbidding the highest bidder
    Given an active auction with ID 0 for NFT with ID 1
    And Bob is the highest bidder with 0.15 ETH and 150 tokens
    And Charlie has 0.3 ETH and 300 governance tokens
    When Charlie places a bid with 0.2 ETH and 200 governance tokens
    Then the bid should be accepted
    And Charlie should be registered as the highest bidder
    And Bob's ETH and tokens should be refunded
    And the auction's highest ETH bid should be 0.2 ETH
    And the auction's highest token bid should be 200 tokens

  Scenario: Attempting to place a bid with insufficient ETH
    Given an active auction with ID 0 for NFT with ID 1
    And Bob is the highest bidder with 0.15 ETH and 150 tokens
    And Dave has 0.05 ETH and 200 governance tokens
    When Dave attempts to place a bid with 0.05 ETH and 180 tokens
    Then the bid should be rejected with message "Lance em ETH abaixo do preço mínimo"
    And Bob should remain the highest bidder

  Scenario: Attempting to place a bid with insufficient tokens
    Given an active auction with ID 0 for NFT with ID 1
    And Bob is the highest bidder with 0.15 ETH and 150 tokens
    And Dave has 0.2 ETH and 80 governance tokens
    When Dave attempts to place a bid with 0.2 ETH and 80 tokens
    Then the bid should be rejected with message "Quantidade de tokens insuficiente"
    And Bob should remain the highest bidder

  Scenario: Finalizing an auction successfully
    Given an active auction with ID 0 for NFT with ID 1
    And Charlie is the highest bidder with 0.2 ETH and 200 tokens
    When the auction end time has passed
    And the seller finalizes the auction
    Then the NFT should be transferred to Charlie
    And the seller should receive ETH minus platform fee
    And 50% of the tokens should be sent to the seller
    And 50% of the tokens should be burned
    And the auction should be marked as inactive

  Scenario: Cancelling an auction
    Given an active auction with ID 0 for NFT with ID 1
    And Charlie is the highest bidder with 0.2 ETH and 200 tokens
    When the seller cancels the auction
    Then the NFT should be returned to the seller
    And Charlie's ETH and tokens should be refunded
    And the auction should be marked as inactive

  Scenario: Using an ERC-4337 account to place a complex bid
    Given an active auction with ID 0 for NFT with ID 1
    And Eve has an ERC-4337 auction account with 0.3 ETH and 300 tokens
    When Eve uses her account to place a bid with 0.25 ETH and 250 tokens
    Then the bid should be accepted
    And Eve should be registered as the highest bidder
    And the previous bidder's ETH and tokens should be refunded
    And the auction's highest ETH bid should be 0.25 ETH
    And the auction's highest token bid should be 250 tokens 