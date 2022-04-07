import Ajv from "ajv"
import addFormats from "ajv-formats"
import { TokenList, TokenInfo, schema, Version } from "../../interfaces/TokenList"
import { ethers } from "ethers"
import { useParams } from "react-router-dom"
import { useAccount, useContractRead, useProvider, useSigner } from "wagmi"
import { Directory } from "../../../../backend/types"
import { useContractAdapter } from "../../hooks/useContractAdapter"
import { useDirectoryContract } from "../../hooks/useDirectoryContract"
import usePromise from "../../hooks/usePromise"
import { IPFS } from "ipfs-core"
import { useEffect, useState } from "react"
import { useStartIPFS } from "../../hooks/useStartIPFS"
import { GenericModal } from "../../components/GenericModal/GenericModal"
import { TrackModal } from "../../components/TrackModal/TrackModal"
import { AssetItemList } from "../../components/AssetItemList/AssetItemList"
import { SyncModal } from "../../components/SyncModal/SyncModal"
import { getTokenInfoByContractAddress } from "../../utils/tokenListUtilities"

const {isAddress, getAddress} = ethers.utils

const defaultTokenList: TokenList = {
  name: "Port List",
  timestamp: (new Date()).toISOString(),
  tokens: [],
  version: {
    major: 1,
    minor: 0,
    patch: 0
  },
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)

async function fetchTokenList(ipfs: IPFS, tokenURI: string | undefined): Promise<TokenList | undefined> {
  if (!tokenURI) {
    return
  }
  console.log("tokenURI", tokenURI)
  let tokenListJson: JSON
  if (tokenURI.indexOf("ipfs://") === 0 && ipfs) {
    console.log("loading tokenList from IPFS")
    const stream = ipfs.cat(tokenURI.split("ipfs://")[1])
    let data = ""

    for await (const chunk of stream) {
      data += Buffer.from(chunk).toString('utf-8')
    }
    try {
      tokenListJson = JSON.parse(data)
    } catch(_) {
      tokenListJson = JSON.parse("{}")
    }
  } else {
    const response = await fetch(tokenURI)
    tokenListJson = await response.json()
  }

  console.log(tokenListJson)
  
  const valid = validate(tokenListJson) // TODO: Check schema
  if (valid) {
    return tokenListJson as unknown as TokenList
    // setTokenList(tokenListJson as unknown as TokenList)
    // setCanonicalTokenList(tokenListJson as unknown as TokenList)
  } else {
    console.log("invalid tokenListJson")
  }
  return
}

async function publishTokenList(ipfs: IPFS, directoryContract: Directory, address: string, tokenList: TokenList): Promise<string | undefined> {
  // Publish to IPFS
  if (!ipfs) {
    console.error("no ipfs")
    // TODO: Handle this
    return undefined
  }
  const data = JSON.stringify(tokenList);

  console.log("adding file to ipfs", Buffer.from(data).length, "bytes")
  const result = await ipfs.add(data)
  // Store hash on-chain
  try {
    const cid = result.cid.toString()
    const tx = await directoryContract.setListForAddress(address, `ipfs://${result.cid.toString()}`)
    await tx.wait()
    // Force refresh
    return cid
  } catch (error) {
    console.error(error)
  }

  return undefined
}

function bumpVersionPatch(version: Version): Version {
  const newVersion = {
    ...version,
    patch: version.patch + 1
  }
  return newVersion
}

export const AddressDetail = () => {

  const [shouldShowTrackingModal, setShouldShowTrackingModal] = useState(false)
  const [shouldShowSyncModal, setShouldShowSyncModal] = useState(false)
  const [shouldShowRemoveTokens, setShouldShowRemoveTokens] = useState(false)
  // const [shouldShowOverrideModal, setShouldShowOverrideModal] = useState(false)

  const provider = useProvider()
  const [{ data: signer }] = useSigner()
  const [{ data: account }] = useAccount()
  const directoryContract = useDirectoryContract(signer || provider)
  const directoryContractConfig = useContractAdapter(directoryContract)

  const {address: rawAddress} = useParams()
  const address = rawAddress ? isAddress(rawAddress.toLowerCase()) ? getAddress(rawAddress.toLowerCase()) : undefined : undefined

  // TODO: Store this in context when app starts
  const ipfs = useStartIPFS()

  const [{ data: tokenListURI }, readTokenListURI] = useContractRead(
    directoryContractConfig,
    "listURIs",
    {args: [address]}
  ) 

  const [tokenListResult] = usePromise(
    async () => {
      if (ipfs) {
        console.log("trying to fetch token list from IPFS")
        const fetchedTokenList = await fetchTokenList(ipfs, tokenListURI ? tokenListURI as unknown as string : undefined)
        console.log("fetchedTokenList", fetchedTokenList)
        return fetchedTokenList
      } else {
        return undefined
      }
    }, 
    [tokenListURI, ipfs]
  )

  const [tokenList, setTokenList] = useState<TokenList>(defaultTokenList)
  const [canonicalTokenList, setCanonicalTokenList] = useState<TokenList | undefined>()

  const onAddToken = (token: TokenInfo) => {
    const newTokenList = {...tokenList!}
    // TODO: When token address already entered, should update token IDs
    if (tokenList?.tokens.filter(_token => _token.address === token.address && _token.tokenIds.sort() === token.tokenIds.sort()).length === 0) {
      newTokenList!.tokens.push(token)
      if (canonicalTokenList) {
        newTokenList.version = bumpVersionPatch(canonicalTokenList.version)
      }
    }
    setTokenList(newTokenList)
    setShouldShowTrackingModal(false)
  }

  const onSyncTokens = (newTokens: TokenInfo[]) => {
    const newTokenList = {...tokenList!}
    const tokens = getTokenInfoByContractAddress(tokenList.tokens)
    newTokens.forEach(newToken => {
      tokens[newToken.address] = newToken
    })
    newTokenList.tokens = Object.values(tokens)
    if (canonicalTokenList) {
      newTokenList.version = bumpVersionPatch(canonicalTokenList.version)
    }
    setTokenList(newTokenList)
    setShouldShowSyncModal(false)
  }

  const onRemoveToken = (token: TokenInfo, tokenId: string) => {
    const otherTokens = tokenList!.tokens.filter(_token => _token.address !== token.address)
    let updatedCollection = tokenList!.tokens.find(_token => _token.address === token.address)
    if (updatedCollection) {
      const ids = new Set(updatedCollection?.tokenIds)
      ids.delete(tokenId)
      if (ids.size > 0) {
        updatedCollection = {
          ...updatedCollection,
          tokenIds: Array.from(ids)
        }
        otherTokens.push(updatedCollection)
      }
    }
    const newTokenList: TokenList = {
      ...tokenList!,
      tokens: otherTokens,
      version:  canonicalTokenList ? bumpVersionPatch(canonicalTokenList.version) : tokenList!.version
    }
    setTokenList(newTokenList)
  } 

  const onRemoveCollection = (token: TokenInfo) => {
    const newTokenList: TokenList = {
      ...tokenList!,
      tokens: tokenList!.tokens.filter(_token => _token.address !== token.address),
      version:  canonicalTokenList ? bumpVersionPatch(canonicalTokenList.version) : tokenList!.version
    }
    setTokenList(newTokenList)
  } 

  

  useEffect(() => {
    console.log("tokenListResult changed", tokenListResult)
    if (tokenListResult) {
      setTokenList(tokenListResult)
      setCanonicalTokenList(tokenListResult)
    }
  }, [tokenListResult])

  useEffect(() => {
    if (isAddress(address || "") && ipfs) {
      readTokenListURI({args: [address]})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, ipfs])

  useEffect(() => {
    console.log("token list URI changed", tokenListURI)
  }, [tokenListURI])

  useEffect(() => {
    console.log("ipfs changed", ipfs && "connected")
  }, [ipfs])

  useEffect(() => {
    console.log("address changed", address)
  }, [address])

  const ready = ipfs && address && (provider || signer)

  return <div>
    <div>{JSON.stringify(tokenList)}</div>
    <div>{tokenListURI || "No tokenListURI"}</div>
    <div>{canonicalTokenList ? "canonicalTokenList" : "No canonicalTokenList"}</div>
    <GenericModal setShouldShow={setShouldShowTrackingModal} shouldShow={shouldShowTrackingModal} content={
      <TrackModal onAddToken={onAddToken}/>
    }/>
    <GenericModal setShouldShow={setShouldShowSyncModal} shouldShow={shouldShowSyncModal} content={
      <SyncModal onSync={onSyncTokens} tokenList={tokenList} />
    }/>
    <GenericModal setShouldShow={setShouldShowRemoveTokens} shouldShow={shouldShowRemoveTokens} content={
      <div>
        {
          tokenList?.tokens.map(token => <div key={token.address} style={{border: "1px solid black"}}>
            <div>
              <div>{token.name}</div>
              {token.tokenIds.map(id => <div key={id} style={{marginLeft: "20px"}}>#{id}</div>)}
            </div>
            
            <button onClick={() => onRemoveCollection(token)}>Remove</button>
          </div>)
        }
      </div>
    }/>
    {
      account && account.address === address && <div>
        <button disabled={!ready || tokenList.tokens.length === 0 || !validate(tokenList)} onClick={async () => {
          if (ipfs && address) {
            await publishTokenList(ipfs, directoryContract, address, tokenList)
            readTokenListURI()
          }
        }}>{canonicalTokenList ? "Update" : "Publish"} list</button>
        {ready && <span>
          {tokenList && tokenList!.tokens.length > 0 &&
            <button onClick={() => setShouldShowRemoveTokens(true)}>Remove</button>
          }
          <button onClick={() => setShouldShowTrackingModal(true)}>Add</button>
          <button onClick={() => setShouldShowSyncModal(true)}>Sync</button>
        </span> }
      </div>
    }
    
    {address && <div style={{marginTop: "20px"}}>
      <AssetItemList tokenList={tokenList} ownerAddress={address} />
    </div>}
    
  </div>
}