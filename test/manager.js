const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Manager", function () {
    const amount = 10 ** 15;
    async function deployMgrFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const Link = await ethers.getContractFactory("ChainlinkMock");
        const link = await Link.deploy();
        const Manager = await ethers.getContractFactory("ManagerMock");
        const mgr = await Manager.deploy(link);

        return { mgr, link, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right name", async function () {
            const { mgr, link } = await loadFixture(deployMgrFixture);
            const addr = await link.getAddress()
            expect(await mgr.getDataFeed()).to.equal(addr);
        });

        it("Should set the right owner", async function () {
            const { mgr, owner } = await loadFixture(deployMgrFixture);
            expect(await mgr.owner()).to.equal(owner.address);
        });
    })

    describe("Deposit", function () {
        it("deposit", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);
        });
    })


    describe("Withdraw", function () {
        it("withdraw", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);

            await expect(mgr.connect(otherAccount).withdraw(1, true)).to.changeEtherBalance(otherAccount, amount * 99 / 100);
        });
        it("withdraw twice", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);

            await expect(mgr.connect(otherAccount).withdraw(1, true)).to.changeEtherBalance(otherAccount, amount * 99 / 100);
            await expect(mgr.connect(otherAccount).withdraw(1, true)).to.revertedWith("not exist");
        });

        it("withdraw not exist", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);

            await link.updateTimestamp()
            ethers.provider.send("evm_increaseTime", [3600 * 24 * 500]);

            await expect(mgr.connect(otherAccount).withdraw(1, true)).to.changeEtherBalance(otherAccount, amount * 99 / 100);
            await expect(mgr.connect(otherAccount).withdraw(2, true)).to.revertedWith("not exist");
        });

    })

    describe("Liquidate", function () {
        it("liquidate", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);
            ethers.provider.send("evm_increaseTime", [3600 * 24 * 50]);
            await link.updateTimestamp()

            await expect(mgr.connect(otherAccount).liquidate(1)).to.changeEtherBalance(pairAddr, amount * 99 / 100);
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("3000000000000000000");
        });
        it("liquidate twice", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);

            ethers.provider.send("evm_increaseTime", [3600 * 24 * 50]);
            await link.updateTimestamp()

            await expect(mgr.connect(otherAccount).liquidate(1)).to.changeEtherBalance(pairAddr, amount * 99 / 100);
            await expect(mgr.connect(otherAccount).liquidate(1)).to.revertedWith("not exist");
        });
        it("not timeout", async function () {
            const { mgr, link, owner, otherAccount } = await loadFixture(deployMgrFixture);
            await link.setAnswer(3 * 10 ** 11)
            await link.updateTimestamp()
            const pairAddr = await mgr.getPairAddress()
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(0);
            await mgr.connect(otherAccount).deposit(2, true, { value: amount })
            expect(await mgr.getSCoinBalance(otherAccount.address)).to.equal("2250000000000000000");
            // expect(await mgr.getSCoinBalance(owner.address)).to.equal("30000000000000000");
            expect(await mgr.getSCoinBalance(pairAddr)).to.equal("30000000000000000");
            expect(await ethers.provider.getBalance(pairAddr)).to.equal(amount / 100);

            await expect(mgr.connect(otherAccount).liquidate(1)).to.revertedWith("not timeout");
        });


    })


});
