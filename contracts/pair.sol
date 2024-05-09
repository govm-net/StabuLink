// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
// File: contracts/libraries/UQ112x112.sol
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Pair is Ownable {
    using Math for uint;
    uint private kRatio = 10**5;
    uint private priceDecimals = 10 ** 8;

    // rebase token
    address public token;

    uint public lastPrice;
    uint public lastPriceTime;
    uint public priceCumulativeLast;
    uint public lastCumulativeTime;
    uint public priceCumulativeLastDay;
    uint public twapPrice;

    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        token = _token;
    }

    function averagePrice() external view returns (uint) {
        return twapPrice;
    }

    function getTokenAddr() external view returns (address) {
        return token;
    }

    // 10 decimals
    function _price() private view returns (uint256) {
        uint ethBalance = address(this).balance;
        uint tokenBalance = IERC20(token).balanceOf(address(this)) /
            priceDecimals;

        return ethBalance / tokenBalance;
    }

    function _startSwap() private {
        uint t = block.timestamp - lastPriceTime;
        if (t == 0) {
            return;
        }
        priceCumulativeLast += t * lastPrice;
        lastPriceTime = block.timestamp;

        if (lastPriceTime / 86400 == lastCumulativeTime / 86400) {
            return;
        }
        t = lastPriceTime - lastCumulativeTime;
        twapPrice = (priceCumulativeLast - priceCumulativeLastDay) / t;
        lastCumulativeTime = lastPriceTime;
        priceCumulativeLastDay = priceCumulativeLast;
    }

    // sell eth
    function sell(uint amountOut) external payable {
        require(amountOut > 0, "amount=0");
        require(msg.value > 0, "msg.value=0");
        _startSwap();

        uint ethBalance = (address(this).balance - msg.value) / kRatio;
        uint tokenBalance = IERC20(token).balanceOf(address(this)) / kRatio;
        uint k = ethBalance * tokenBalance;
        uint new_eth_balance = address(this).balance / kRatio;

        uint tokenAmount = k / new_eth_balance;
        uint out = (tokenBalance - tokenAmount) * kRatio;
        out = (out * 999) / 1000;
        require(out >= amountOut, "amountOut");
        IERC20(token).transfer(msg.sender, out);
        lastPrice = _price();
    }

    // buy eth
    function buy(uint amountIn, uint amountOut) external {
        require(amountIn > 0, "amountIn");
        _startSwap();
        uint ethBalance = address(this).balance / kRatio;
        uint tokenBalance = IERC20(token).balanceOf(address(this)) / kRatio;
        uint k = ethBalance * tokenBalance;
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        uint new_token_balance = IERC20(token).balanceOf(address(this))/ kRatio;

        uint ethAmount = k / new_token_balance;
        uint out = (ethBalance - ethAmount) * kRatio;
        out = (out * 999) / 1000;
        require(out >= amountOut, "amountOut");
        payable(msg.sender).transfer(out);

        lastPrice = _price();
    }

    function escape() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
        IERC20(token).transfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }

    receive() external payable {}
}
