import styles from "./AssetItem.module.css"
import React, { useEffect } from "react"
import { TokenInfo } from "../../interfaces/TokenList"
import { useProvider, useSigner } from "wagmi"
import { ethers } from "ethers"
import { ITokenMetadata } from "../../interfaces/ITokenMetadata"
import ERC721 from "../../abis/erc721"
import ERC1155 from "../../abis/erc1155"
import { parseTokenURI } from "../../utils/parseTokenURI"
import usePromise from "../../hooks/usePromise"

interface IAssetItemProps extends React.HTMLAttributes<HTMLElement> {
  tokenInfo: TokenInfo
  tokenId: string
  ownerAddress: string
}

type SigerOrProvider = ethers.providers.Provider | ethers.Signer

async function getTokenMetadata(tokenId: string, address: string, interfaceId: string, provider: SigerOrProvider): Promise<ITokenMetadata | undefined> {
  let tokenContract: ethers.Contract | undefined
  let metadataURI: string | undefined
  if (interfaceId === ERC721.interfaceId) {
    tokenContract = new ethers.Contract(address, ERC721.abi, provider)
    metadataURI = await tokenContract.tokenURI(tokenId)
  } else if (interfaceId === ERC1155.interfaceId) {
    tokenContract = new ethers.Contract(address, ERC1155.abi, provider)
    metadataURI = await tokenContract.uri(tokenId)
  }

  if (metadataURI) {
    return await parseTokenURI(metadataURI)
  }

  return undefined
}

async function validateOwnership(ownerAddress: string, tokenId: string, tokenAddress: string, interfaceId: string, provider: SigerOrProvider): Promise<boolean> {
  let tokenContract: ethers.Contract | undefined
  if (interfaceId === ERC721.interfaceId) {
    tokenContract = new ethers.Contract(tokenAddress, ERC721.abi, provider)
    const owner = await tokenContract.ownerOf(tokenId)
    return owner === ownerAddress
  } else if (interfaceId === ERC1155.interfaceId) {
    tokenContract = new ethers.Contract(tokenAddress, ERC1155.abi, provider)
    const balance = await tokenContract.balanceOf(ownerAddress, tokenId)
    return balance > 0
  }

  return false
}

export const AssetItem = ({tokenId, tokenInfo, style, ownerAddress}: IAssetItemProps) => {
  const provider = useProvider()
  const [{ data: signer }] = useSigner()
  const {address, interfaceId, name} = tokenInfo
  const [metadata] = usePromise<ITokenMetadata | undefined>(
    async () => {
      if (signer || provider) {
        const result = await getTokenMetadata(tokenId, address, interfaceId, signer || provider)
        return result
      }
    },
    [provider, address, signer]
  )
  const [isOwner] = usePromise<boolean>(async () => {
    if (signer || provider) {
      return await validateOwnership(ownerAddress, tokenId, address, interfaceId, signer || provider)
    } else {
      return false
    }
  }, [provider, signer, tokenId, address, ownerAddress])

  useEffect(() => {
    console.log("metadata changed", metadata?.image)
  }, [metadata])

  return <div className={styles.item} style={style}>
    {metadata?.image ? <img src={metadata?.image} alt={`${name} #${tokenId}`}/> : <div>Loading</div>}
    
    <div className={styles.subheading}>{name}</div>
    <div style={{overflow: "hidden"}} className={styles.subheading}>#{tokenId}</div>
    <div>Ownership: { isOwner ? "✓" : "⨯"}</div>
  </div>
}