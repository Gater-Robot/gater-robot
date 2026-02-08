import { strict as assert } from "node:assert";
import { describe, it } from "mocha";
import hre from "hardhat";
import { parseEther } from "viem";

const TOKEN_NAME = "Best Token";
const TOKEN_SYMBOL = "BEST";

async function getViem() {
  const { viem } = await hre.network.connect();
  return viem;
}

describe("BestEthGlobal2026Token", () => {
  it("allows a one-time faucet claim", async () => {
    const viem = await getViem();
    const [deployer, alice] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucet({ account: alice.account });

    const balance = await contract.read.balanceOf([alice.account.address]);
    assert.equal(balance, parseEther("2026"));
  });

  it("rejects duplicate faucet claims", async () => {
    const viem = await getViem();
    const [deployer, alice] = await viem.getWalletClients();

    const contract = await viem.deployContract(
      "BestEthGlobal2026Token",
      [TOKEN_NAME, TOKEN_SYMBOL, deployer.account.address],
      { account: deployer.account }
    );

    await contract.write.faucet({ account: alice.account });

    await assert.rejects(contract.write.faucet({ account: alice.account }));
  });
});
