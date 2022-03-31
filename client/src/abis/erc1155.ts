import { IContractInterface } from "../interfaces/IContractInterface"

export default {
  abi: [
    "function uri(uint256) view returns (string memory)",
    "function balanceOf(address, uint256) view returns (uint256)"
  ],
  interfaceId: "0xd9b67a26"
} as IContractInterface