import { TokenList } from "../../interfaces/TokenList"
import { AssetItem } from "../AssetItem/AssetItem"

interface IAssetItemListProps {
  tokenList: TokenList
}

export const AssetItemList = ({tokenList}: IAssetItemListProps) => {
  return <div>
    {[...tokenList.tokens.map((token, i) => {
      return token.tokenIds.map((tokenId, j) => {
        return <AssetItem style={{marginRight: "15px", marginBottom: "15px"}} key={`${i} ${j}`} tokenInfo={token} tokenId={tokenId}/>
      })
    })]}
  </div> 
}