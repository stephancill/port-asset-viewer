import { BigNumber, ethers } from "ethers"
import { Provider } from "@ethersproject/abstract-provider";
import ERC721 from "../abis/erc721"

function addressEqual(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

interface ITransferEventArgs {
  from: string,
  to: string,
  tokenId: BigNumber
}

// Source: https://github.com/frangio/erc721-list/blob/master/list.js
export async function listTokensOfOwner(tokenAddress: string, account: string, provider: Provider): Promise<Array<number>> {
  const token = new ethers.Contract(
    tokenAddress,
    ERC721.abi,
    provider
  )

  const sentLogs = await token.queryFilter(
    token.filters.Transfer(account, null),
  )
  const receivedLogs = await token.queryFilter(
    token.filters.Transfer(null, account),
  )

  const logs = sentLogs.concat(receivedLogs)
    .sort(
      (a, b) =>
        a.blockNumber - b.blockNumber ||
        a.transactionIndex - b.transactionIndex,
    )

  const owned = new Set<number>()

  logs.forEach(log => {
    const args = log.args as unknown as ITransferEventArgs
    const { from, to, tokenId } = args 
    if (addressEqual(to, account)) {
      owned.add(tokenId.toNumber())
    } else if (addressEqual(from, account)) {
      owned.delete(tokenId.toNumber())
    }
  })

  return Array.from(owned)
}