import type { Abi, Address, GetContractReturnType, PublicClient, WalletClient } from "viem";

import { BEST_TOKEN_ABI } from "./abi";
import {
  SUBSCRIPTION_FACTORY_ABI,
  SUBSCRIPTION_HOOK_ABI,
  SUBSCRIPTION_ROUTER_ABI,
} from "./subscriptions-abi";

type ContractType<TAbi extends Abi> = GetContractReturnType<
  TAbi,
  PublicClient,
  WalletClient,
  Address
>;

export type BestTokenContract = ContractType<typeof BEST_TOKEN_ABI>;
export type SubscriptionFactoryContract = ContractType<typeof SUBSCRIPTION_FACTORY_ABI>;
export type SubscriptionRouterContract = ContractType<typeof SUBSCRIPTION_ROUTER_ABI>;
export type SubscriptionHookContract = ContractType<typeof SUBSCRIPTION_HOOK_ABI>;
