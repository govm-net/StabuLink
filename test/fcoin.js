const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FCoin", function () {
    const amount = 10 ** 15;
    async function deployCoinFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const Coin = await ethers.getContractFactory("FCoin");
        const coin = await Coin.deploy(owner);

        return { coin, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right name", async function () {
            const { coin } = await loadFixture(deployCoinFixture);
            expect(await coin.name()).to.equal("StabuLink Fixed Coin");
        });

        it("Should set the right owner", async function () {
            const { coin, owner } = await loadFixture(deployCoinFixture);
            expect(await coin.owner()).to.equal(owner.address);
        });
    });

    describe("Mint", function () {
        it("mint to owner", async function () {
            const { coin, owner } = await loadFixture(deployCoinFixture);
            expect(await coin.balanceOf(owner)).to.equal(0);
            expect(await coin.mint(owner, amount))
            expect(await coin.balanceOf(owner)).to.equal(amount);
        });

        it("mint to other account", async function () {
            const { coin, otherAccount } = await loadFixture(deployCoinFixture);
            expect(await coin.mint(otherAccount, amount));
            expect(await coin.balanceOf(otherAccount)).to.equal(amount);
        });

        it("not owner should not be able to mint", async function () {
            const { coin, otherAccount } = await loadFixture(deployCoinFixture);
            await expect(coin.connect(otherAccount).mint(otherAccount, amount)).to.be.revertedWithCustomError(coin, "OwnableUnauthorizedAccount")
        });

        it("event", async function () {
            const { coin, owner } = await loadFixture(deployCoinFixture);
            await expect(coin.mint(owner, amount)).to.emit(coin, "Transfer").withArgs(ethers.ZeroAddress, owner.address, amount)
        });
    });

    describe("Burn", function () {
        it("burn from owner", async function () {
            const { coin, owner } = await loadFixture(deployCoinFixture);
            await coin.mint(owner, amount);
            expect(await coin.balanceOf(owner)).to.equal(amount);

            expect(await coin.burn(owner, amount));
            expect(await coin.balanceOf(owner)).to.equal(0);

        });

        it("burn from other account", async function () {
            const { coin, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(otherAccount, amount);
            expect(await coin.balanceOf(otherAccount)).to.equal(amount);
            expect(await coin.burn(otherAccount, amount));
            expect(await coin.balanceOf(otherAccount)).to.equal(0);

        })

        it("not owner should not be able to burn", async function () {
            const { coin, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(otherAccount, amount);
            await expect(coin.connect(otherAccount).burn(otherAccount, amount)).to.be.revertedWithCustomError(coin, "OwnableUnauthorizedAccount")

        })

        it("event", async function () {
            const { coin, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(otherAccount, amount);
            await expect(coin.burn(otherAccount, amount)).to.emit(coin, "Transfer").withArgs(otherAccount.address, ethers.ZeroAddress, amount)
        })
    })

    // transfer
    describe("Transfer", function () {
        it("transfer from owner", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(owner, amount);
            expect(await coin.balanceOf(owner)).to.equal(amount);
            expect(await coin.transfer(otherAccount, amount));
            expect(await coin.balanceOf(owner)).to.equal(0);
            expect(await coin.balanceOf(otherAccount)).to.equal(amount);
        });

        it("transfer from other account", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(otherAccount, amount);
            expect(await coin.balanceOf(otherAccount)).to.equal(amount);
            expect(await coin.connect(otherAccount).transfer(owner, amount));
            expect(await coin.balanceOf(otherAccount)).to.equal(0);
            expect(await coin.balanceOf(owner)).to.equal(amount);

        })

        it("event", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(otherAccount, amount);
            await expect(coin.connect(otherAccount).transfer(owner, amount)).to.emit(coin, "Transfer").withArgs(otherAccount.address, owner.address, amount)
        })
    })

    //approve
    describe("Approve", function () {
        it("approve from owner", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(owner, amount);
            expect(await coin.approve(otherAccount, amount));
            expect(await coin.allowance(owner, otherAccount)).to.equal(amount);
            // transfer from otherAccount
            expect(await coin.connect(otherAccount).transferFrom(owner, otherAccount, amount));
            expect(await coin.balanceOf(owner)).to.equal(0);
            expect(await coin.balanceOf(otherAccount)).to.equal(amount);
        });

        it("approve from other account", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            expect(await coin.connect(otherAccount).approve(owner, amount));
            expect(await coin.allowance(otherAccount,owner)).to.equal(amount);
        })

        it("event", async function () {
            const { coin, owner, otherAccount } = await loadFixture(deployCoinFixture);
            await coin.mint(owner, amount);
            await expect(coin.connect(otherAccount).approve(owner, amount)).to.emit(coin, "Approval").withArgs(otherAccount.address, owner.address, amount)
        })
    })
});
