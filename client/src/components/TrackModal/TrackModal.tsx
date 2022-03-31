import style from "./TrackModal.module.css"
import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useProvider } from "wagmi"
import { TokenInfo } from "../../interfaces/TokenList"
import ERC165 from "../../abis/erc165"
import ERC721 from "../../abis/erc721"
import ERC1155 from "../../abis/erc1155"
import { parseTokenURI } from "../../utils/parseTokenURI"
import usePromise from "../../hooks/usePromise"
import { truncateAddress } from "../../utilities"
import erc1155 from "../../abis/erc1155"
import erc721 from "../../abis/erc721"
import { ITokenDetail } from "../../interfaces/ITokenDetail"
import { ITokenContract } from "../../interfaces/ITokenContract"
import { ITokenMetadata } from "../../interfaces/ITokenMetadata"

interface ITrackModalProps {
  onAddToken: (token: TokenInfo) => void
}

async function getTokenMetadata(addressOrENS: string, provider: ethers.providers.BaseProvider): Promise<ITokenContract & ITokenMetadata> {
  let tokenContract = new ethers.Contract(addressOrENS, ERC165.abi, provider)
  const [isERC721, isERC1155] = await Promise.all<[boolean, boolean]>(
    [tokenContract.supportsInterface(ERC721.interfaceId!), tokenContract.supportsInterface(ERC1155.interfaceId!)]
  )
  let interfaceId: string | undefined
  let contractName = ""
  if (isERC721) {
    tokenContract = new ethers.Contract(addressOrENS, ERC721.abi, provider)
    contractName = await tokenContract.name()
    interfaceId = ERC721.interfaceId!
  } else if (isERC1155) {
    tokenContract = new ethers.Contract(addressOrENS, ERC1155.abi, provider)
    interfaceId = ERC1155.interfaceId!
  } else {
    throw Error("Unsupported interface")
  }

  const tokenURI = await tokenContract.tokenURI(1) as unknown as string
  const tokenMetadata = await parseTokenURI(tokenURI)

  if (!tokenMetadata) {
    throw Error("Invalid token URI for token 0")
  } else {
    if (!tokenMetadata.name && interfaceId === erc721.interfaceId) tokenMetadata.name = contractName
    return {
      ...tokenMetadata,
      tokenContract,
      address: ethers.utils.getAddress(tokenContract.address),
      interfaceId
    }
  }
}

export const TrackModal = ({onAddToken}: ITrackModalProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [tokenId, setTokenId] = useState<string | undefined>()
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [shouldClear, setShouldClear] = useState(false)
  const provider = useProvider()

  const [tokenContractResult, tokenContractLoading, tokenContractError] = usePromise<ITokenContract & ITokenMetadata | undefined>(
    async () => {
      const isAddressOrENS = ethers.utils.isAddress(searchQuery.toLowerCase()) || (searchQuery.indexOf(".eth") > -1 && searchQuery.split(".eth")[1].length === 0)
      if (!isAddressOrENS || !searchQuery || !provider) {
        return undefined
      }
      return await getTokenMetadata(searchQuery, provider)
    }, 
    [searchQuery, provider]
  )

  const [tokens, setTokens] = useState<ITokenDetail[]>([])

  useEffect(() => {
    if (shouldClear) {
      console.log("clearing")
      setTokenId(undefined)
      setTokenInfo(undefined)
      setTokens([])
      setError(undefined)
      setSearchQuery("")
      setShouldClear(false)
    }
  }, [shouldClear])

  useEffect(() => {
    if (tokenContractResult) {
      const tokenInfo: TokenInfo = {
        address: tokenContractResult.address,
        chainId: provider.network.chainId,
        tokenIds: [],
        interfaceId: tokenContractResult.interfaceId,
        name: tokenContractResult.name
      }
      setError(undefined)
      setTokenInfo(tokenInfo)
    } else if (tokenContractError) {
      setError("Something went wrong")
      setTokenInfo(undefined)
    }
  }, [tokenContractResult, tokenContractError, provider])

  return <div>
    <div className={style.heading}>Add Collection</div>
    <input className={style.searchInput} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder="Search address or ENS" />
    {tokenContractResult && tokenInfo?.address !== tokenContractResult?.address && !error && !tokenContractLoading ? 
    // TODO: Style this
    <button className={style.collectionRow} onClick={() => {
      const tokenInfo: TokenInfo = {
        address: tokenContractResult.address,
        chainId: provider.network.chainId,
        tokenIds: [],
        interfaceId: tokenContractResult.interfaceId,
        name: tokenContractResult.name
      }
      setTokenInfo(tokenInfo)
    }}>
      {/* TODO: Show error/loading */}
      <img src={tokenContractResult.image} alt="" />
      <div>
        <div>{tokenContractResult.name}</div>
        <div>{truncateAddress(tokenContractResult.address)}</div>
      </div>
    </button>
    : 
    tokenContractLoading && <div>Loading</div>}

    {tokenInfo && <div>
      <div className={style.collectionHeading}>
        <img src={tokenContractResult?.image} alt="" />
        <div>
          <div>{tokenInfo.name}</div>
          <div>{truncateAddress(tokenInfo.address)}</div>
        </div>
      </div>

      <div>
        <input className={style.searchInput} onChange={(e) => setTokenId(e.target.value)} type="number" placeholder="Token ID" value={tokenId || ""} />
        <button onClick={async () => {
          console.log("fetching token uri", tokenId)
          let tokenMetadataRaw: string | undefined
          if (tokenContractResult?.interfaceId === erc1155.interfaceId) {
            tokenMetadataRaw = await tokenContractResult?.tokenContract.uri(tokenId)
          } else if (tokenContractResult?.interfaceId === erc721.interfaceId) {
            tokenMetadataRaw = await tokenContractResult?.tokenContract.tokenURI(tokenId)
          } else {
            return
          }
          try {
            console.log("got token metadata", tokenMetadataRaw)
            const tokenMetadata = await parseTokenURI(tokenMetadataRaw!)
            if (tokenMetadata && tokenId) {
              setTokens([...tokens, {...tokenMetadata, tokenId}])
            } else {
              console.error("!(tokenMetadata && tokenId)")
            }
          } catch (e) {
            console.error(e)
          }
        }}>Add</button>
      </div>

      {tokens.map((token, index) => {
        return <div key={index}>
          <img style={{width: "100px", height: "100px"}} src={token.image} alt="" />
        </div>
      })}

      <button onClick={() => {
        onAddToken({
          ...tokenInfo,
          tokenIds: tokens.map(token => token.tokenId)
        })
        setShouldClear(true)
      }}>Complete</button>
    </div>
    
    }

  </div>
}