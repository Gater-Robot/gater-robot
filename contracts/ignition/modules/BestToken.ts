import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

export default buildModule("BestTokenModule", (m) => {
  const existingAddress = m.getParameter("existingAddress", "");
  const name = m.getParameter("name", "Best Token");
  const symbol = m.getParameter("symbol", "BEST");
  const claimAmount = m.getParameter("claimAmount", parseUnits("2026", 18));

  if (existingAddress) {
    const bestToken = m.contractAt("BestToken", existingAddress);
    return { bestToken };
  }

  const bestToken = m.contract("BestToken", [name, symbol, claimAmount]);
  return { bestToken };
});
