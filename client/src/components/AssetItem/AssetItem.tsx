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

export const AssetItem = ({tokenId, tokenInfo, style}: IAssetItemProps) => {
  const provider = useProvider()
  const [{ data: signer }] = useSigner()
  const {address, interfaceId, name} = tokenInfo
  const [metadata] = usePromise<ITokenMetadata | undefined>(
    async () => {
      if (tokenId && address && interfaceId && (signer || provider)) {
        return await getTokenMetadata(tokenId, address, interfaceId, signer || provider)
      }
    },
    [provider, address, signer]
  )

  useEffect(() => {
    console.log("metadata changed", metadata?.image)
  }, [metadata])

  return <div className={styles.item} style={style}>
    <img src={metadata?.image} alt={`${name} #${tokenId}`}/>
    <div className={styles.subheading}>{name}</div>
    <div style={{overflow: "hidden"}} className={styles.subheading}>#{tokenId}</div>
  </div>
}