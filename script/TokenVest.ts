import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
    const [deployer, beneficiary1, beneficiary2] = await hre.ethers.getSigners();

    const mintAmountToContract = hre.ethers.parseUnits("1000000000000", 18);
    const claimableAmount = hre.ethers.parseUnits("100000", 18);

    const CeloTokenContract = await hre.ethers.getContractFactory("CeloToken");
    const celoTokenInstance = await CeloTokenContract.deploy(deployer.address);

    const TokenVestingContract = await hre.ethers.getContractFactory("TokenVesting");
    const tokenVestingInstance = await TokenVestingContract.deploy(celoTokenInstance);

    console.log("###### Minting Celo Tokens to the Vesting Contract #######");
    const mintTx = await celoTokenInstance.connect(deployer).mint(tokenVestingInstance.getAddress(), mintAmountToContract);
    await mintTx.wait();
    console.log({ "MintTransaction": mintTx });

    console.log("####### Adding Beneficiary ####");
    await tokenVestingInstance.addBeneficiary(beneficiary1.address, 60, 3600, claimableAmount);

    console.log("Checking Beneficiary1 balance before claiming...");
    const beneficiary1InitialBalance = await celoTokenInstance.connect(beneficiary1).balanceOf(beneficiary1.address);
    console.log({ "Beneficiary1 Balance before Claim": beneficiary1InitialBalance.toString() });

    console.log("##### Checking Beneficiary1 Releasable Amount after 1 minute #####");
    await time.increaseTo(await time.latest() + 60);
    const releasableAmount = await tokenVestingInstance.connect(beneficiary1).getReleasableAmount(beneficiary1.address);
    console.log({ "Releasable Amount for Beneficiary1": releasableAmount.toString() });

    console.log("##### Beneficiary1 Claiming Tokens after 1 minute #####");
    await time.increaseTo(await time.latest() + 1000);
    const firstClaimTx = await tokenVestingInstance.connect(beneficiary1).claimTokens();
    await firstClaimTx.wait();

    const beneficiary1BalanceAfterFirstClaim = await celoTokenInstance.connect(beneficiary1).balanceOf(beneficiary1.address);
    console.log({ "Beneficiary1 Balance after First Claim": beneficiary1BalanceAfterFirstClaim.toString() });

    console.log("### Beneficiary1 Claiming All Remaining Allocation after Full Vesting Period ###");
    await time.increaseTo(await time.latest() + 3600);
    const finalClaimTx = await tokenVestingInstance.connect(beneficiary1).claimTokens();
    await finalClaimTx.wait();

    const beneficiary1BalanceAfterFinalClaim = await celoTokenInstance.connect(beneficiary1).balanceOf(beneficiary1.address);
    console.log({ "Beneficiary1 Balance after Final Claim": beneficiary1BalanceAfterFinalClaim.toString() });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
