import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BestEthGlobal2026TokenModule = buildModule("BestEthGlobal2026TokenModule", (moduleBuilder) => {
  const name = moduleBuilder.getParameter("name", "Best Token");
  const symbol = moduleBuilder.getParameter("symbol", "BEST");
  const initialOwner = moduleBuilder.getParameter(
    "initialOwner",
    moduleBuilder.getAccount(0)
  );

  const bestEthGlobal2026Token = moduleBuilder.contract("BestEthGlobal2026Token", [
    name,
    symbol,
    initialOwner
  ]);

  return { bestEthGlobal2026Token };
});

export default BestEthGlobal2026TokenModule;
