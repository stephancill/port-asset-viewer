import { AssetItem, IAssetItem } from "../AssetItem/AssetItem"

interface IAssetItemListProps {
  items: Array<IAssetItem>
}

export const AssetItemList = ({items}: IAssetItemListProps) => {
  return <div>
    {[...new Array(items.length)].map((_, index) => {
      return <AssetItem style={{marginRight: "15px", marginBottom: "15px"}} key={index} {...items[index]}/>
    })}
  </div> 
}