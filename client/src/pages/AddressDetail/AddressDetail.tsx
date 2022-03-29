import Ajv from "ajv"
import addFormats from "ajv-formats"
import { TokenList, TokenInfo, schema } from "@uniswap/token-lists"
import { ethers } from "ethers"
import { useParams } from "react-router-dom"
import { useAccount, useContractRead, useProvider, useSigner } from "wagmi"
import { Directory } from "../../../../backend/types"
import { AssetItemList } from "../../components/AssetItemList/AssetItemList"
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
  }
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)

async function fetchTokenList(tokenURI: string | undefined): Promise<TokenList> {
  return defaultTokenList
}

async function publishTokenList(ipfs: IPFS, directoryContract: Directory, address: string, tokenList: TokenList): Promise<string | undefined> {
  // Publish to IPFS
  console.log("hello")
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
  const [{ data: account }] = useAccount({fetchEns: true})
  const address = rawAddress ? isAddress(rawAddress.toLowerCase()) ? getAddress(rawAddress.toLowerCase()) : undefined : undefined

  const ipfs = useStartIPFS()

  const [{ data: tokenListURI }, readTokenListURI] = useContractRead(
    directoryContractConfig,
    "listURIs",
    {args: [address]}
  ) 

  const [tokenListResult] = usePromise(
    () => fetchTokenList(tokenListURI ? tokenListURI[0] as string : undefined), 
    [tokenListURI]
  )

  const [tokenList, setTokenList] = useState<TokenList>(defaultTokenList)

  useEffect(() => {
    if (tokenListResult) {
      setTokenList(tokenListResult)
    }
  }, [tokenListResult])

  return <div>
    {/* <AssetItemList items={[]}/> */}
    {JSON.stringify(tokenList)}
    <button onClick={async () => {
      if (ipfs && address) {
        await publishTokenList(ipfs, directoryContract, address, tokenList)
        readTokenListURI()
      }
    }}>Publish default list</button>
  </div>
}