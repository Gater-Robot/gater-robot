import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SubscriptionDaysTokenModule = buildModule(
  "SubscriptionDaysTokenModule",
  (moduleBuilder) => {
    const name = moduleBuilder.getParameter(
      "name",
      "Gater Private Group: Subscription Days Remaining"
    );
    const symbol = moduleBuilder.getParameter("symbol", "GATER-days");
    const initialDefaultAdmin = moduleBuilder.getParameter(
      "initialDefaultAdmin",
      moduleBuilder.getAccount(0)
    );
    const initialMinter = moduleBuilder.getParameter(
      "initialMinter",
      moduleBuilder.getAccount(0)
    );

    const subscriptionDaysToken = moduleBuilder.contract(
      "SubscriptionDaysToken",
      [name, symbol, initialDefaultAdmin, initialMinter]
    );

    return { subscriptionDaysToken };
  }
);

export default SubscriptionDaysTokenModule;
