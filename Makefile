# ERC-4337 Smart Wallet Project Makefile

.PHONY: setup clean test compile lint verify-ci dev deploy-local deploy-sepolia

setup:
	yarn install

clean:
	yarn clean

compile:
	yarn compile

test:
	yarn test

test-bdd:
	yarn test:bdd-erc4337

lint:
	yarn solhint 'contracts/**/*.sol'

verify-ci:
	./scripts/verify-ci.sh

dev:
	yarn start

dev-full:
	yarn start:full

deploy-local:
	yarn deploy

deploy-sepolia:
	yarn deploy:sepolia

all: clean compile test lint 