import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BestTokenModule = buildModule("BestTokenModule", (moduleBuilder) => {
  const name = moduleBuilder.getParameter("name", "Best Token");
  const symbol = moduleBuilder.getParameter("symbol", "BEST");
  const initialOwner = moduleBuilder.getParameter(
    "initialOwner",
    moduleBuilder.getAccount(0)
  );

  const bestToken = moduleBuilder.contract("BestToken", [
    name,
    symbol,
    initialOwner
  ]);

  return { bestToken };
});

export default BestTokenModule;
