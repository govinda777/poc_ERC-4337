const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

// Helper functions
const parseEther = (value) => {
  if (typeof value === 'string' && value.includes('ETH')) {
    return ethers.utils.parseEther(value.replace(' ETH', ''));
  }
  return ethers.utils.parseEther(value);
};

const parseTokens = (value) => {
  if (typeof value === 'string' && value.includes('tokens')) {
    return ethers.utils.parseEther(value.replace(' tokens', ''));
  }
  return ethers.utils.parseEther(value);
};

// Globals for test state
let contracts = {};
let accounts = {};
let auctions = {};

// Background steps
Given('the governance token contract is deployed', async function() {
  const GovernanceToken = await ethers.getContractFactory('GovernanceToken');
  contracts.govToken = await GovernanceToken.deploy();
  await contracts.govToken.deployed();
});

Given('the NFT contract is deployed', async function() {
  const SimpleNFT = await ethers.getContractFactory('SimpleNFT');
  contracts.nft = await SimpleNFT.deploy();
  await contracts.nft.deployed();
});

Given('the complex NFT auction contract is deployed', async function() {
  const ComplexNFTAuction = await ethers.getContractFactory('ComplexNFTAuction');
  contracts.auction = await ComplexNFTAuction.deploy(contracts.govToken.address);
  await contracts.auction.deployed();
});

Given('the auction account contract is deployed', async function() {
  // First deploy EntryPoint contract which is required for ERC-4337
  try {
    const EntryPoint = await ethers.getContractFactory('contracts/mocks/EntryPoint.sol:EntryPoint');
    contracts.entryPoint = await EntryPoint.deploy();
    await contracts.entryPoint.deployed();
    
    // Then deploy the AuctionAccountFactory
    const AuctionAccountFactory = await ethers.getContractFactory('AuctionAccountFactory');
    contracts.accountFactory = await AuctionAccountFactory.deploy(contracts.entryPoint.address);
    await contracts.accountFactory.deployed();
  } catch (error) {
    console.error("Error deploying EntryPoint or AuctionAccountFactory:", error.message);
    throw error;
  }
});

Given('users have been minted tokens and NFTs', async function() {
  [
    accounts.deployer, 
    accounts.alice, 
    accounts.bob, 
    accounts.charlie, 
    accounts.dave, 
    accounts.eve
  ] = await ethers.getSigners();
  
  // Mint governance tokens to users
  const tokenAmount = ethers.utils.parseEther('1000');
  await contracts.govToken.mint(accounts.bob.address, tokenAmount);
  await contracts.govToken.mint(accounts.charlie.address, tokenAmount);
  await contracts.govToken.mint(accounts.dave.address, tokenAmount);
  await contracts.govToken.mint(accounts.eve.address, tokenAmount);
  
  // Mint NFTs to Alice
  await contracts.nft.mint(accounts.alice.address, 1);
  await contracts.nft.mint(accounts.alice.address, 2);
});

// Auction creation steps
Given('Alice has an NFT with ID {int}', async function(tokenId) {
  const owner = await contracts.nft.ownerOf(tokenId);
  expect(owner).to.equal(accounts.alice.address);
});

When('Alice creates an auction with the following parameters:', async function(dataTable) {
  const params = dataTable.rowsHash();
  
  // Convert parameters to appropriate formats
  const tokenId = parseInt(params.tokenId);
  const startingPrice = parseEther(params.startingPrice);
  const minTokenAmount = parseTokens(params.minTokenAmount);
  
  // Parse duration to seconds
  let duration;
  if (params.duration.includes('day')) {
    duration = 24 * 60 * 60 * parseInt(params.duration);
  } else if (params.duration.includes('hour')) {
    duration = 60 * 60 * parseInt(params.duration);
  } else {
    duration = parseInt(params.duration);
  }
  
  // Approve NFT for auction contract
  await contracts.nft.connect(accounts.alice).approve(contracts.auction.address, tokenId);
  
  // Create auction
  const tx = await contracts.auction.connect(accounts.alice).createAuction(
    tokenId,
    contracts.nft.address,
    startingPrice,
    minTokenAmount,
    duration
  );
  
  // Save transaction details for later assertions
  auctions.lastTx = tx;
  auctions.lastTokenId = tokenId;
  auctions.lastStartingPrice = startingPrice;
  auctions.lastMinTokenAmount = minTokenAmount;
  auctions.lastDuration = duration;
});

Then('the auction should be created successfully', async function() {
  const receipt = await auctions.lastTx.wait();
  const event = receipt.events.find(e => e.event === 'AuctionCreated');
  expect(event).to.not.be.undefined;
  
  auctions.currentId = event.args.auctionId.toNumber();
});

Then('the NFT should be transferred to the auction contract', async function() {
  const owner = await contracts.nft.ownerOf(auctions.lastTokenId);
  expect(owner).to.equal(contracts.auction.address);
});

Then('the auction details should be correctly stored', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  expect(auctionData.tokenId).to.equal(auctions.lastTokenId);
  expect(auctionData.nftContract).to.equal(contracts.nft.address);
  expect(auctionData.seller).to.equal(accounts.alice.address);
  expect(auctionData.startingPrice).to.equal(auctions.lastStartingPrice);
  expect(auctionData.minTokenAmount).to.equal(auctions.lastMinTokenAmount);
  expect(auctionData.active).to.be.true;
});

// Bidding steps
Given('an active auction with ID {int} for NFT with ID {int}', async function(auctionId, tokenId) {
  // If auction doesn't exist yet, create it
  if (!(await contracts.auction.auctions(auctionId)).active) {
    await contracts.nft.connect(accounts.alice).approve(contracts.auction.address, tokenId);
    await contracts.auction.connect(accounts.alice).createAuction(
      tokenId,
      contracts.nft.address,
      parseEther('0.1'),
      parseTokens('100'),
      24 * 60 * 60 // 1 day
    );
  }
  
  auctions.currentId = auctionId;
  const auctionData = await contracts.auction.getAuction(auctionId);
  expect(auctionData.active).to.be.true;
});

Given('Bob has {float} ETH and {int} governance tokens', async function(ethAmount, tokenAmount) {
  const balance = await ethers.provider.getBalance(accounts.bob.address);
  expect(balance).to.be.gt(parseEther(ethAmount.toString()));
  
  const tokenBalance = await contracts.govToken.balanceOf(accounts.bob.address);
  expect(tokenBalance).to.be.gte(parseTokens(tokenAmount.toString()));
});

Given('Charlie has {float} ETH and {int} governance tokens', async function(ethAmount, tokenAmount) {
  const balance = await ethers.provider.getBalance(accounts.charlie.address);
  expect(balance).to.be.gt(parseEther(ethAmount.toString()));
  
  const tokenBalance = await contracts.govToken.balanceOf(accounts.charlie.address);
  expect(tokenBalance).to.be.gte(parseTokens(tokenAmount.toString()));
});

Given('Dave has {float} ETH and {int} governance tokens', async function(ethAmount, tokenAmount) {
  const balance = await ethers.provider.getBalance(accounts.dave.address);
  expect(balance).to.be.gt(parseEther(ethAmount.toString()));
  
  const tokenBalance = await contracts.govToken.balanceOf(accounts.dave.address);
  expect(tokenBalance).to.be.gte(parseTokens(tokenAmount.toString()));
});

Given('Bob is the highest bidder with {float} ETH and {int} tokens', async function(ethAmount, tokenAmount) {
  // Approve tokens
  await contracts.govToken.connect(accounts.bob).approve(
    contracts.auction.address, 
    parseTokens(tokenAmount.toString())
  );
  
  // Place the bid
  await contracts.auction.connect(accounts.bob).placeBid(
    auctions.currentId,
    parseTokens(tokenAmount.toString())
  , { value: parseEther(ethAmount.toString()) });
  
  // Verify Bob is highest bidder
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.bob.address);
});

Given('Charlie is the highest bidder with {float} ETH and {int} tokens', async function(ethAmount, tokenAmount) {
  // Approve tokens
  await contracts.govToken.connect(accounts.charlie).approve(
    contracts.auction.address, 
    parseTokens(tokenAmount.toString())
  );
  
  // Place the bid
  await contracts.auction.connect(accounts.charlie).placeBid(
    auctions.currentId,
    parseTokens(tokenAmount.toString())
  , { value: parseEther(ethAmount.toString()) });
  
  // Verify Charlie is highest bidder
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.charlie.address);
});

When('Bob places a bid with {float} ETH and {int} governance tokens', async function(ethAmount, tokenAmount) {
  // Store balances before bidding
  auctions.bobEthBefore = await ethers.provider.getBalance(accounts.bob.address);
  auctions.bobTokensBefore = await contracts.govToken.balanceOf(accounts.bob.address);
  
  // Approve tokens
  await contracts.govToken.connect(accounts.bob).approve(
    contracts.auction.address, 
    parseTokens(tokenAmount.toString())
  );
  
  // Place the bid
  auctions.lastTx = await contracts.auction.connect(accounts.bob).placeBid(
    auctions.currentId,
    parseTokens(tokenAmount.toString())
  , { value: parseEther(ethAmount.toString()) });
  
  // Save values for assertions
  auctions.lastEthAmount = parseEther(ethAmount.toString());
  auctions.lastTokenAmount = parseTokens(tokenAmount.toString());
});

When('Charlie places a bid with {float} ETH and {int} governance tokens', async function(ethAmount, tokenAmount) {
  // Store previous bidder's balances
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  auctions.prevBidder = auctionData.highestBidder;
  auctions.prevEthBid = auctionData.highestEthBid;
  auctions.prevTokenBid = auctionData.highestTokenBid;
  
  if (auctions.prevBidder === accounts.bob.address) {
    auctions.bobEthBefore = await ethers.provider.getBalance(accounts.bob.address);
    auctions.bobTokensBefore = await contracts.govToken.balanceOf(accounts.bob.address);
  }
  
  // Approve tokens
  await contracts.govToken.connect(accounts.charlie).approve(
    contracts.auction.address, 
    parseTokens(tokenAmount.toString())
  );
  
  // Place the bid
  auctions.lastTx = await contracts.auction.connect(accounts.charlie).placeBid(
    auctions.currentId,
    parseTokens(tokenAmount.toString())
  , { value: parseEther(ethAmount.toString()) });
  
  // Save values for assertions
  auctions.lastEthAmount = parseEther(ethAmount.toString());
  auctions.lastTokenAmount = parseTokens(tokenAmount.toString());
});

When('Dave attempts to place a bid with {float} ETH and {int} tokens', async function(ethAmount, tokenAmount) {
  // Approve tokens
  await contracts.govToken.connect(accounts.dave).approve(
    contracts.auction.address, 
    parseTokens(tokenAmount.toString())
  );
  
  // Try to place the bid, expect revert
  auctions.attemptedBid = contracts.auction.connect(accounts.dave).placeBid(
    auctions.currentId,
    parseTokens(tokenAmount.toString())
  , { value: parseEther(ethAmount.toString()) });
});

When('the auction end time has passed', async function() {
  // Get current auction end time
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  const endTime = auctionData.endTime.toNumber();
  
  // Advance time to after auction end
  await time.increaseTo(endTime + 1);
});

When('the seller finalizes the auction', async function() {
  // Save balances before finalization
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  auctions.sellerEthBefore = await ethers.provider.getBalance(accounts.alice.address);
  auctions.sellerTokensBefore = await contracts.govToken.balanceOf(accounts.alice.address);
  auctions.winnerNftBefore = await contracts.nft.balanceOf(auctionData.highestBidder);
  auctions.contractTokensBefore = await contracts.govToken.balanceOf(contracts.auction.address);
  
  // Finalize auction
  auctions.finalizeTx = await contracts.auction.connect(accounts.alice).finalizeAuction(auctions.currentId);
  await auctions.finalizeTx.wait();
});

When('the seller cancels the auction', async function() {
  // Save balances before cancellation
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  auctions.bidderEthBefore = await ethers.provider.getBalance(auctionData.highestBidder);
  auctions.bidderTokensBefore = await contracts.govToken.balanceOf(auctionData.highestBidder);
  auctions.sellerNftBefore = await contracts.nft.balanceOf(accounts.alice.address);
  
  // Cancel auction
  auctions.cancelTx = await contracts.auction.connect(accounts.alice).cancelAuction(auctions.currentId);
  await auctions.cancelTx.wait();
});

Given('Eve has an ERC-4337 auction account with {float} ETH and {int} tokens', async function(ethAmount, tokenAmount) {
  // Create auction account for Eve
  const createTx = await contracts.accountFactory.createAccount(accounts.eve.address, 0);
  const receipt = await createTx.wait();
  
  // Get account address from event
  const event = receipt.events.find(e => e.event === 'AccountCreated');
  accounts.eveAccount = event.args.account;
  
  // Connect to the account contract
  const AuctionAccount = await ethers.getContractFactory('AuctionAccount');
  accounts.eveAccountContract = await AuctionAccount.attach(accounts.eveAccount);
  
  // Fund the account with ETH
  await accounts.eve.sendTransaction({
    to: accounts.eveAccount,
    value: parseEther(ethAmount.toString())
  });
  
  // Transfer tokens to the account
  await contracts.govToken.connect(accounts.eve).transfer(
    accounts.eveAccount,
    parseTokens(tokenAmount.toString())
  );
  
  // Verify balances
  const ethBalance = await ethers.provider.getBalance(accounts.eveAccount);
  expect(ethBalance).to.equal(parseEther(ethAmount.toString()));
  
  const tokenBalance = await contracts.govToken.balanceOf(accounts.eveAccount);
  expect(tokenBalance).to.equal(parseTokens(tokenAmount.toString()));
});

When('Eve uses her account to place a bid with {float} ETH and {int} tokens', async function(ethAmount, tokenAmount) {
  // Store previous bidder's balances
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  auctions.prevBidder = auctionData.highestBidder;
  auctions.prevEthBid = auctionData.highestEthBid;
  auctions.prevTokenBid = auctionData.highestTokenBid;
  
  // Place bid using the ERC-4337 account
  auctions.lastTx = await accounts.eveAccountContract.connect(accounts.eve).placeBid(
    contracts.auction.address,
    auctions.currentId,
    parseEther(ethAmount.toString()),
    contracts.govToken.address,
    parseTokens(tokenAmount.toString())
  );
  
  // Save values for assertions
  auctions.lastEthAmount = parseEther(ethAmount.toString());
  auctions.lastTokenAmount = parseTokens(tokenAmount.toString());
});

// Assertion steps
Then('the bid should be accepted', async function() {
  const receipt = await auctions.lastTx.wait();
  const event = receipt.events.find(e => e.event === 'BidPlaced');
  expect(event).to.not.be.undefined;
});

Then('Bob should be registered as the highest bidder', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.bob.address);
});

Then('Charlie should be registered as the highest bidder', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.charlie.address);
});

Then('Eve should be registered as the highest bidder', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.eveAccount);
});

Then('the auction\'s highest ETH bid should be {float} ETH', async function(ethAmount) {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestEthBid).to.equal(parseEther(ethAmount.toString()));
});

Then('the auction\'s highest token bid should be {int} tokens', async function(tokenAmount) {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestTokenBid).to.equal(parseTokens(tokenAmount.toString()));
});

Then('Bob\'s ETH and tokens should be refunded', async function() {
  // Check ETH refund (excluding gas costs)
  const bobEthAfter = await ethers.provider.getBalance(accounts.bob.address);
  expect(bobEthAfter).to.be.gt(auctions.bobEthBefore.sub(parseEther('0.01'))); // Allow for gas costs
  
  // Check token refund
  const bobTokensAfter = await contracts.govToken.balanceOf(accounts.bob.address);
  expect(bobTokensAfter).to.equal(auctions.bobTokensBefore);
});

Then('the previous bidder\'s ETH and tokens should be refunded', async function() {
  if (auctions.prevBidder !== ethers.constants.AddressZero) {
    // Check token refund
    const prevBidderTokensAfter = await contracts.govToken.balanceOf(auctions.prevBidder);
    expect(prevBidderTokensAfter).to.be.gte(auctions.prevTokenBid);
    
    // ETH refund is harder to check precisely due to gas costs, just verify it happened
    const tx = await auctions.lastTx.wait();
    const transferEvents = tx.events.filter(e => e.address === auctions.prevBidder);
    expect(transferEvents.length).to.be.gt(0);
  }
});

Then('the bid should be rejected with message {string}', async function(errorMessage) {
  await expect(auctions.attemptedBid).to.be.revertedWith(errorMessage);
});

Then('Bob should remain the highest bidder', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.highestBidder).to.equal(accounts.bob.address);
});

Then('the NFT should be transferred to Charlie', async function() {
  const tokenId = auctions.lastTokenId || 1;
  const owner = await contracts.nft.ownerOf(tokenId);
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(owner).to.equal(auctionData.highestBidder);
});

Then('the seller should receive ETH minus platform fee', async function() {
  const sellerEthAfter = await ethers.provider.getBalance(accounts.alice.address);
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  // Platform fee is 5%
  const platformFee = auctionData.highestEthBid.mul(500).div(10000);
  const expectedSellerAmount = auctionData.highestEthBid.sub(platformFee);
  
  // Account for gas costs in the comparison
  const txCost = await auctions.finalizeTx.wait();
  const gasCost = txCost.gasUsed.mul(txCost.effectiveGasPrice);
  
  expect(sellerEthAfter).to.be.gte(auctions.sellerEthBefore.add(expectedSellerAmount).sub(gasCost));
});

Then('{int}% of the tokens should be sent to the seller', async function(percentage) {
  const sellerTokensAfter = await contracts.govToken.balanceOf(accounts.alice.address);
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  const expectedTokens = auctionData.highestTokenBid.mul(percentage).div(100);
  expect(sellerTokensAfter).to.be.gte(auctions.sellerTokensBefore.add(expectedTokens));
});

Then('{int}% of the tokens should be burned', async function(percentage) {
  // Check that tokens were removed from circulation
  const contractTokensAfter = await contracts.govToken.balanceOf(contracts.auction.address);
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  const expectedBurnAmount = auctionData.highestTokenBid.mul(percentage).div(100);
  const expectedRemainingTokens = auctions.contractTokensBefore.sub(auctionData.highestTokenBid);
  
  expect(contractTokensAfter).to.be.equal(expectedRemainingTokens);
});

Then('the auction should be marked as inactive', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  expect(auctionData.active).to.be.false;
});

Then('the NFT should be returned to the seller', async function() {
  const tokenId = auctions.lastTokenId || 1;
  const owner = await contracts.nft.ownerOf(tokenId);
  expect(owner).to.equal(accounts.alice.address);
});

Then('Charlie\'s ETH and tokens should be refunded', async function() {
  const auctionData = await contracts.auction.getAuction(auctions.currentId);
  
  // Check token refund
  const charlieTokensAfter = await contracts.govToken.balanceOf(accounts.charlie.address);
  expect(charlieTokensAfter).to.be.gte(auctions.bidderTokensBefore.add(auctions.prevTokenBid));
  
  // ETH refund is harder to check precisely due to gas costs
  const charlieEthAfter = await ethers.provider.getBalance(accounts.charlie.address);
  expect(charlieEthAfter).to.be.gt(auctions.bidderEthBefore);
}); 