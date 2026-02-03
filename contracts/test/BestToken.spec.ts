import { expect } from "chai";
import { ethers } from "hardhat";

const CLAIM_AMOUNT = ethers.parseUnits("2026", 18);

describe("BestToken", () => {
  it("deploys with name, symbol, and claim amount", async () => {
    const BestToken = await ethers.getContractFactory("BestToken");
    const token = await BestToken.deploy("Best Token", "BEST", CLAIM_AMOUNT);

    expect(await token.name()).to.equal("Best Token");
    expect(await token.symbol()).to.equal("BEST");
    expect(await token.claimAmount()).to.equal(CLAIM_AMOUNT);
  });

  it("allows one claim per address", async () => {
    const [owner, other] = await ethers.getSigners();
    const BestToken = await ethers.getContractFactory("BestToken");
    const token = await BestToken.deploy("Best Token", "BEST", CLAIM_AMOUNT);

    await expect(token.connect(owner).claim())
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, owner.address, CLAIM_AMOUNT);

    await expect(token.connect(owner).claim()).to.be.revertedWith("BEST: already claimed");

    await expect(token.connect(other).claim())
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, other.address, CLAIM_AMOUNT);
  });
});
