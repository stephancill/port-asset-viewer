import { ethers, BigNumber } from "ethers"
import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import erc1155 from "../../abis/erc1155"
import erc721 from "../../abis/erc721"
import usePromise from "../../hooks/usePromise"
import { TokenList, TokenInfo } from "../../interfaces/TokenList"
import { findTokenDifferences } from "../../utils/tokenListUtilities"
import style from "./SyncModal.module.css"



interface IImportTokensModalProps {
  onSync: (tokens: Array<TokenInfo>) => void
  tokenList: TokenList
}

interface AlchemyNFTMetadata {
  contract: {
    address: string
  }
  id: {
    tokenId: string
    tokenMetadata: {
      tokenType: string // ERC721 or ERC1155
    }
  }
  title: string
}

async function getAllTokens(address: string) {
  // TODO: Pagination
  // Setup request options:
  var requestOptions: RequestInit = {
    method: 'GET',
    redirect: 'follow'
  }

  // Replace with your Alchemy API key:
  const apiKey = process.env.REACT_APP_ALCHEMY_API_KEY
  const baseURL = `https://eth-mainnet.alchemyapi.io/v2/${apiKey}/getNFTs/`
  const chainId = 1
  // Replace with the wallet address you want to query:
  let fetchURL = `${baseURL}?owner=${address}`

  let pageKey: string | undefined
  let requestCount = 0
  let allTokensJSON: AlchemyNFTMetadata[] = []

  while (pageKey || requestCount === 0) {
    console.log("making request",pageKey, requestCount )
    // Make the request and print the formatted response:
    const res = await fetch(pageKey ? `${fetchURL}&pageKey=${pageKey}` : fetchURL, requestOptions)
    const json = await res.json()
    console.log(json)
    const {ownedNfts: tokensJSON, pageKey: newPageKey} = json
    allTokensJSON = [...allTokensJSON, ...tokensJSON]
    pageKey = newPageKey
    requestCount += 1
  }
  
  const tokensJSONByContract: {[key: string]: TokenInfo} = {}
  ;(allTokensJSON as AlchemyNFTMetadata[]).forEach(metadata => {
    const contractAddress = metadata.contract.address
    const tokenId = BigNumber.from(metadata.id.tokenId).toString()
    
    if (!tokensJSONByContract[contractAddress]) {
      const tokenInfo: TokenInfo = {
        address: contractAddress,
        chainId,
        interfaceId: metadata.id.tokenMetadata.tokenType === "ERC721" ? erc721.interfaceId! : erc1155.interfaceId!,
        name: metadata.title,
        tokenIds: [tokenId]
      }
      tokensJSONByContract[contractAddress] = tokenInfo
    } else {
      const {tokenIds} = tokensJSONByContract[contractAddress]
      if (!tokenIds.includes(tokenId)) {
        tokenIds.push(tokenId)
      }
      tokensJSONByContract[contractAddress] = {
        ...tokensJSONByContract[contractAddress],
        tokenIds
      }
    }
  })

  const tokens: TokenInfo[] = Object.values(tokensJSONByContract)
  return tokens
}


async function fetchAndFilterExistingTokens(originalTokens: TokenInfo[], address: string) {
  console.log("fetch and filter")
  const updatedTokens = await getAllTokens(address)
  const differences = findTokenDifferences(originalTokens, updatedTokens)
  return differences
}

export const SyncModal = ({onSync, tokenList: originalTokenList}: IImportTokensModalProps) => {
  const [{ data: accountData, loading }] = useAccount()
  const [tokens, setTokens] = useState<Array<TokenInfo>>([])
  const [shouldSync, setShouldSync] = useState(false)
  const [shouldClear, setShouldClear] = useState(false)

  const [syncTokensResult, syncTokensLoading, syncTokensError] = usePromise<TokenInfo[] | undefined>(
    async () => {
      console.log("hello")
      if (shouldSync && accountData) {
        const newTokens = await fetchAndFilterExistingTokens(originalTokenList.tokens, accountData.address)
        return newTokens
      }
      return undefined
    }, 
    [shouldSync]
  )

  const onRemoveToken = (rawToken: TokenInfo) => {
    setTokens(tokens?.filter(token => token.address !== rawToken.address))
  }

  useEffect(() => {
    if (syncTokensResult) {
      setTokens(syncTokensResult)
      setShouldSync(false)
    }
  }, [syncTokensResult])

  useEffect(() => {
    if (shouldClear) {
      console.log("clearing")
      setTokens([])
      setShouldClear(false)
    }
  }, [shouldClear])

  return <div style={{maxHeight: "50vh", overflow: "scroll"}}>
    <button onClick={() => setShouldSync(true)}>Sync</button>
    {
      tokens.length > 0 ? 
      <div>
        <div className={style.heading}>Select Tokens</div>
        {tokens?.map(token => <div key={token.address}>
        <div>
            {token.name}
            <button onClick={() => onRemoveToken(token)}>Remove</button>
          </div>
        </div>)}
        <button onClick={() => {
          onSync(tokens)
          setShouldClear(true)
        }}>Import</button>
      </div> : <></>
    }
  </div>
}