import { ITokenMetadata } from "../interfaces/ITokenMetadata"

export const parseTokenURI = async (uri: string): Promise<ITokenMetadata | undefined> => {
  let metadata: ITokenMetadata | undefined

  if (uri.indexOf("data:application/json;base64,") === 0) {
    metadata = JSON.parse(atob(uri.split("data:application/json;base64,")[1]))
  } else if (uri.indexOf("ipfs://") === 0) {
    const response = await fetch(`https://ipfs.io/ipfs/${uri.split("ipfs://")[1]}`)
    metadata = await response.json()
  } else if (uri.indexOf("http://") === 0 || uri.indexOf("https://") === 0) {
    const response = await fetch(uri)
    metadata = await response.json()
  } else {
    // No image found
    return undefined
  }

  if (metadata && metadata.image.indexOf("ipfs://") === 0) {
    metadata = {
      ...metadata,
      image: `https://ipfs.io/ipfs/${metadata.image.split("ipfs://")[1]}`
    } 
  }

  console.log("metadata", metadata)
  
  return metadata
}