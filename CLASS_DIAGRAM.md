```mermaid
classDiagram
    direction LR

    class IEntryPoint {
        <<interface>>
    }
    class IAccount {
        <<interface>>
    }
    class GameAccount {
        <<interface>>
        +initialize(bytes32, address)
        +isGameAccount() bool
        +getPaymaster() address
        +getSocialAuthId() bytes32
        +entryPoint() IEntryPoint
        +addGameTokens(uint256)
        +gameTokenBalance() uint256
        +addNFT(uint256)
        +ownsNFT(uint256) bool
    }
    class BaseAccount {
        <<abstract>>
    }
    class BasePaymaster {
        <<abstract>>
    }
    class Ownable {
        <<abstract>>
        #_owner address
        +owner() address
        +transferOwnership(address)
        +renounceOwnership()
    }
    class EntryPoint {
        +IEntryPoint
    }
    class GameAccountImpl {
        -bytes32 _socialAuthId
        -address _paymaster
        -IEntryPoint _entryPoint
        -uint256 _gameTokenBalance
        -mapping~uint256,bool~ _ownedNFTs
        +initialize(bytes32, address)
        +isGameAccount() bool
        +getPaymaster() address
        +getSocialAuthId() bytes32
        +entryPoint() IEntryPoint
        +_validateSignature(UserOperation, bytes32) uint256
        +_call(address, uint256, bytes)
        +addGameTokens(uint256)
        +gameTokenBalance() uint256
        +addNFT(uint256)
        +ownsNFT(uint256) bool
    }
    class GameAccountFactory {
        +address accountImplementation
        +GamePaymaster gamePaymaster
        +mapping~bytes32,address~ socialAuthAccounts
        +createAccountViaSocialAuth(bytes, uint256) GameAccountImpl
        +addNFTCollateral(address, uint256)
        +getAddress(bytes32, uint256) address
    }
    class GamePaymaster {
        +IERC20 gameToken
        +address gameTokenAddress
        +mapping~address,bool~ newPlayerWallets
        +mapping~address,bool~ hasCollateral
        +address gameContract
        +uint256 maxTransactionsPerPlayer
        +mapping~address,uint256~ playerTransactionCount
        +registerNewPlayer(address)
        +addCollateral(address)
        +removeCollateral(address)
        +_validatePaymasterUserOp(UserOperation, bytes32, uint256) (bytes, uint256)
        +_postOp(PostOpMode, bytes, uint256)
    }
    class SponsorPaymaster {
        +mapping~address,bool~ sponsoredAddresses
        +mapping~address,bool~ sponsoredApps
        +mapping~address,SponsorshipLimit~ addressLimits
        +mapping~address,SponsorshipLimit~ appLimits
        +uint256 defaultDailyLimit
        +uint256 defaultTxLimit
        +sponsorAddress(address)
        +sponsorApp(address)
        +_validatePaymasterUserOp(UserOperation, bytes32, uint256) (bytes, uint256)
        +_postOp(PostOpMode, bytes, uint256)
    }
    class ERC1967Proxy

    EntryPoint ..|> IEntryPoint
    GameAccountImpl --|> BaseAccount
    GameAccountImpl ..|> GameAccount
    GameAccountFactory --|> Ownable
    GamePaymaster --|> BasePaymaster
    SponsorPaymaster --|> BasePaymaster

    GameAccountFactory ..> GameAccountImpl : creates via proxy
    GameAccountFactory ..> GamePaymaster : uses
    GameAccountFactory ..> IEntryPoint : uses
    GameAccountFactory ..> ERC1967Proxy : uses
    GameAccountImpl ..> IEntryPoint : uses
    GamePaymaster ..> IEntryPoint : uses
    SponsorPaymaster ..> IEntryPoint : uses
