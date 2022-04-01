import { TokenInfo } from "../interfaces/TokenList"

/**
 * Returns dictionary where the keys are contract address and the values are TokenInfo, 
 * merges duplicate contracts with different tokens
 * @param tokens 
 * @returns {[contractAddress: string]: TokenInfo}
 */
export function getTokenInfoByContractAddress(tokens: TokenInfo[]): {[key: string]: TokenInfo} {
  const tokenInfoByAddress: {[key: string]: TokenInfo} = {}
  tokens.forEach(tokenInfo => {
    if (!tokenInfoByAddress[tokenInfo.address]) {
      tokenInfoByAddress[tokenInfo.address] = tokenInfo
    } else {
      tokenInfoByAddress[tokenInfo.address] = {
        ...tokenInfo,
        tokenIds: Array.from(new Set([...tokenInfo.tokenIds, ...tokenInfoByAddress[tokenInfo.address].tokenIds]))
      }
    }
  })
  return tokenInfoByAddress
}

export function findTokenDifferences(original: TokenInfo[], updated: TokenInfo[]) {
  
  const newTokens: TokenInfo[] = []

  const originalTokensByAddress = getTokenInfoByContractAddress(original)
  
  for (let i = 0; i < updated.length; i++) {
    const {address, tokenIds: updatedTokenIds} = updated[i]
    if (originalTokensByAddress[address]) {
      const arr1 = originalTokensByAddress[address].tokenIds
      const arr2 = updatedTokenIds
      // Symmetric difference
      const difference = arr1
                 .filter(x => !arr2.includes(x))
                 .concat(arr2.filter(x => !arr1.includes(x)));
      if (difference.length > 0) {
        newTokens.push(updated[i])
      }
    } else {
      newTokens.push(updated[i])
    }
  }

  return newTokens
}