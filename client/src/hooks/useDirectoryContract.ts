import { Signer } from 'ethers'
import { Provider } from '@ethersproject/providers'
import deployments from "../deployments.json"
import { Directory } from "../../../backend/types"
import { useContract } from "wagmi"

export const useDirectoryContract = (signerOrProvider: Signer | Provider) => {
  return useContract<Directory>({
    addressOrName: deployments.contracts.Directory.address,
    contractInterface: deployments.contracts.Directory.abi,
    signerOrProvider
  })
}