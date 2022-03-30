import Ajv from "ajv"
import addFormats from "ajv-formats"
import { TokenList, schema, TokenInfo } from "@uniswap/token-lists"
import { ethers } from "ethers"
import { useParams } from "react-router-dom"
import { useContractRead, useProvider, useSigner } from "wagmi"
import { Directory } from "../../../../backend/types"
import { useContractAdapter } from "../../hooks/useContractAdapter"
import { useDirectoryContract } from "../../hooks/useDirectoryContract"
import usePromise from "../../hooks/usePromise"
import { IPFS } from "ipfs-core"
import { useEffect, useState } from "react"
import { useStartIPFS } from "../../hooks/useStartIPFS"

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
  
  const valid = validate(tokenListJson)
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
  } catch (error) {}

  return undefined
}

export const AddressDetail = () => {

  const provider = useProvider()
  const [{ data: signer }] = useSigner()
  const directoryContract = useDirectoryContract(signer || provider)
  const directoryContractConfig = useContractAdapter(directoryContract)

  const {address: rawAddress} = useParams()
  const address = rawAddress ? isAddress(rawAddress.toLowerCase()) ? getAddress(rawAddress.toLowerCase()) : undefined : undefined

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

  // On mount
  useEffect(() => {
    console.log("ipfs changed", ipfs && "connected")
  }, [ipfs])

  useEffect(() => {
    console.log("address changed", address)
  }, [address])


  return <div>
    <div>{JSON.stringify(tokenList)}</div>
    <div>{tokenListURI || "No tokenListURI"}</div>
    <div>{canonicalTokenList ? "canonicalTokenList" : "No canonicalTokenList"}</div>
    <button disabled={!ipfs || !address || tokenList.tokens.length === 0} onClick={async () => {
      if (ipfs && address) {
        await publishTokenList(ipfs, directoryContract, address, tokenList)
        readTokenListURI()
      }
    }}>{canonicalTokenList ? "Update" : "Publish"} list</button>
  </div>
}