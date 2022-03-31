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

## References

* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md
* https://github.com/ethereum/EIPs/blob/master/EIPS/eip-165.md