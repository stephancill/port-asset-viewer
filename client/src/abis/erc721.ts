import { IContractInterface } from "../interfaces/IContractInterface"

export default {
  abi: [
    "function name() view returns (string memory)",
    "function symbol() view returns (string memory)",
    "function tokenURI(uint) view returns (string memory)",
    "function ownerOf(uint256) view returns (address)",
    "function balanceOf(address owner) view returns (uint256 balance)",
  ],
  interfaceId: "0x80ac58cd"
} as IContractInterface