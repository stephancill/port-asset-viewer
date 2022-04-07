# Port Digital Asset Viewer

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
FORK=mainnet npx hardhat node --export ../client/src/deployments.json
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
  - [ ] Generate/sync from OpenSea/Etherscan
  - [x] Publish
  - [ ] Pinning
  - [x] Update
    - [x] Add
    - [x] Remove
  - [x] Default
    - [x] No tokens
- [x] Contract
  - [x] Store URI to token list adapted from [Uniswap standard](https://github.com/Uniswap/token-lists)
- [x] Token types
  - [x] ERC1155
  - [x] ERC721
- [x] Verify ownership
- [ ] Separate asset and Directory networks
- [ ] Multi-chain
  - [ ] Customize RPC urls to use for each chain - allows for adding arbitrary EVM-compatible chains
- [ ] Token detail view

## References

* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-165.md