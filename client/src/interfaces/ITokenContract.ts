import { ethers } from "ethers"

export interface ITokenContract {
  address: string
  tokenContract: ethers.Contract
  interfaceId: string
}