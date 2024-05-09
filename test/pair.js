const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Pair", function () {
    const amount = 10 ** 15;
    async function deployPairFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const Coin = await ethers.getContractFactory("FCoin");
        const coin = await Coin.deploy(owner);
        const Pair = await ethers.getContractFactory("Pair");
        const pair = await Pair.deploy(owner, coin);

        return { pair, coin, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set the right name", async function () {
            const { pair, coin } = await loadFixture(deployPairFixture);
            const coinAddr = await coin.getAddress()
            // expect(await coin.name()).to.equal("StabuLink Scalable Coin");
            expect(await pair.getTokenAddr()).to.equal(coinAddr);
        });

        it("Should set the right owner", async function () {
            const { coin, owner } = await loadFixture(deployPairFixture);
            expect(await coin.owner()).to.equal(owner.address);
        });
    })

    describe("Sell", function () {
        it("sell eth", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });
            await pair.connect(otherAccount).sell(amount * 9 / 20, { value: amount });
            const balance = await coin.balanceOf(otherAccount.address);

            expect(balance).to.above(amount / 4);
            expect(balance).to.below(amount / 2);
            console.log("balance", balance);

        });

        it("amountOut must be less than or equal to tokenAmount", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });
            await expect(pair.connect(otherAccount).sell(amount / 2, { value: amount })).to.be.revertedWith("amountOut");
        });
    })


    describe("Buy", function () {
        it("buy eth", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });

            await coin.mint(otherAccount, amount);
            await coin.connect(otherAccount).approve(pair, amount);
            const balance = await ethers.provider.getBalance(otherAccount.address);

            await pair.connect(otherAccount).buy(amount, amount * 9 / 20);
            const newBalance = await ethers.provider.getBalance(otherAccount.address);
            expect(newBalance).to.above(BigInt(balance) + BigInt(amount / 4));
            expect(newBalance).to.below(BigInt(balance) + BigInt(amount / 2));
            console.log("balance", newBalance, balance, newBalance - balance);
        });
        it("wrong, hope to get more", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });

            await coin.mint(otherAccount, amount);
            await coin.connect(otherAccount).approve(pair, amount);

            await expect(pair.connect(otherAccount).buy(amount, amount / 2)).to.be.revertedWith("amountOut");

        });
    })


    describe("Price", function () {
        it("last price", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });

            await coin.mint(otherAccount, amount);
            await coin.connect(otherAccount).approve(pair, amount);
            var lastprice = await pair.lastPrice();
            expect(lastprice).to.equal(0);
            await pair.connect(otherAccount).buy(BigInt(amount / 100), BigInt(amount / 200));
            lastprice = await pair.lastPrice();
            expect(lastprice).to.above(0);
            await pair.connect(otherAccount).buy(BigInt(amount / 100), BigInt(amount / 200));
            const newprice = await pair.lastPrice();
            expect(newprice).to.below(lastprice);
            await pair.connect(otherAccount).sell(BigInt(amount / 200), { value: BigInt(amount / 100) });
            const newprice2 = await pair.lastPrice();
            expect(newprice2).to.above(newprice);
        });

        it("average price", async function () {
            const { pair, owner, coin, otherAccount } = await loadFixture(deployPairFixture);

            await coin.mint(pair, amount);
            await owner.sendTransaction({
                to: await pair.getAddress(),
                value: amount,
            });
            const addr = await pair.getAddress();

            await coin.mint(otherAccount, amount);
            await coin.connect(otherAccount).approve(pair, amount);
            var lastprice = await pair.averagePrice();
            console.log("price1", lastprice, await pair.lastPrice());
            console.log("balance1", await ethers.provider.getBalance(addr), await coin.balanceOf(addr),BigInt(amount / 100));
            expect(lastprice).to.equal(0);
            await pair.connect(otherAccount).buy(BigInt(amount / 100), BigInt(amount / 200));
            console.log("balance2", await ethers.provider.getBalance(addr), await coin.balanceOf(addr));
            ethers.provider.send("evm_increaseTime", [3600 * 24]);
            await pair.connect(otherAccount).buy(BigInt(amount / 100), BigInt(amount / 200));
            console.log("balance3", await ethers.provider.getBalance(addr), await coin.balanceOf(addr));
            lastprice = await pair.averagePrice();
            console.log("price2", lastprice, await pair.lastPrice());
            expect(lastprice).to.above(0);
            ethers.provider.send("evm_increaseTime", [3600 * 24]);
            await pair.connect(otherAccount).buy(BigInt(amount / 100), amount / 400);
            console.log("balance4", await ethers.provider.getBalance(addr), await coin.balanceOf(addr));
            const newprice = await pair.averagePrice();
            console.log("price3", newprice, await pair.lastPrice());
            expect(newprice).to.below(lastprice);
            ethers.provider.send("evm_increaseTime", [3600 * 24]);
            await pair.connect(otherAccount).sell(BigInt(amount / 200), { value: BigInt(amount / 100) });
            console.log("balance5", await ethers.provider.getBalance(addr), await coin.balanceOf(addr));
            const newprice2 = await pair.averagePrice();
            expect(newprice2).to.below(newprice);
            console.log("price4", newprice2, await pair.lastPrice());
            ethers.provider.send("evm_increaseTime", [3600 * 24]);
            await pair.connect(otherAccount).sell(BigInt(amount / 200), { value: BigInt(amount / 100) });
            const newprice3 = await pair.averagePrice();
            expect(newprice3).to.above(newprice2);
        });
    })
});
