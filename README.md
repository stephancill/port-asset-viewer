# Stephan's Dapp Template

## Stack
### Backend
- Hardhat
- Typescript
- Typechain

### Frontend
- React
- wagmi

## Usage
### Cloning
```
git clone <repo name>
```

### `./backend`
```
FORK=mainnet npx hardhat node
```
```
FORK=mainnet npx hardhat deploy --export-all ../client/src/deployments.json --network localhost
```

Optionally include `OPEN=true` to deploy open Directory, which allows editing of any address' list by any other address.

### `./frontend`
```
yarn
```
```
yarn start
```

## TODO

- [ ] Token lists
  - [x] Create
  - [x] Generate/sync from OpenSea/Etherscan
  - [x] Publish
  - [ ] Pinning
  - [x] Update
  - [ ] Default
    - [x] No tokens
    - [ ] Popular tokens
- [x] Contract
  - [x] Store URI to [token list](https://github.com/Uniswap/token-lists)
- [ ] Token types
  - [ ] Support ENS NFTs 
  - [ ] ERC1155
  - [x] ERC721
- [ ] Separate asset and Directory networks