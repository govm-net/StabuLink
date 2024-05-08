// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
// File: contracts/libraries/UQ112x112.sol
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Pair is Ownable {
    using Math for uint;
    uint private priceDecimals = 10 ** 8;

    // rebase token
    address public token;

    uint public lastPrice;
    uint public lastPriceTime;
    uint public priceCumulativeLast;
    uint public lastCumulativeTime;
    uint public priceCumulativeLastDay;
    uint private twapPrice;

    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        token = _token;
    }

    function averagePrice() external view returns (uint) {
        return twapPrice;
    }

    // 10 decimals
    function _price() private view returns (uint256) {
        uint eth_balance = address(this).balance;
        uint token_balance = IERC20(token).balanceOf(address(this)) /
            priceDecimals;

        return eth_balance / token_balance;
    }

    function _startSwap() private {
        uint t = block.timestamp - lastPriceTime;
        if (t == 0) {
            return;
        }
        priceCumulativeLast += t * lastPrice;
        lastPriceTime = block.timestamp;

        if (lastPriceTime / 86400 != lastCumulativeTime / 86400) {
            t = lastPriceTime - lastCumulativeTime;
            twapPrice = (priceCumulativeLast - priceCumulativeLastDay) / t;
            lastCumulativeTime = lastPriceTime;
            priceCumulativeLastDay = priceCumulativeLast;
        }
    }

    // sell eth
    function sell(uint amountOut) external payable {
        require(amountOut > 0, "amount must be greater than 0");
        require(msg.value > 0, "value must be greater than 0");
        _startSwap();

        uint eth_balance = (address(this).balance-msg.value)/priceDecimals;
        uint token_balance = IERC20(token).balanceOf(address(this)) /
            priceDecimals;
        uint k = eth_balance*token_balance;
        uint new_eth_balance = address(this).balance/priceDecimals;

        uint tokenAmount = k/new_eth_balance * priceDecimals;
        tokenAmount = (tokenAmount * 999) / 1000;
        require(
            tokenAmount >= amountOut,
            "amountOut must be less than or equal to tokenAmount"
        );
        IERC20(token).transfer(msg.sender, tokenAmount);
        lastPrice = _price();
    }

    // buy eth
    function buy(uint amountIn, uint amountOut) external {
        require(amountIn > 0, "amount must be greater than 0");
        _startSwap();
        uint eth_balance = address(this).balance/priceDecimals;
        uint token_balance = IERC20(token).balanceOf(address(this)) /
            priceDecimals;
        uint k = eth_balance*token_balance;
        IERC20(token).transferFrom(msg.sender, address(this), amountIn);
        uint new_token_balance = IERC20(token).balanceOf(address(this)) /
            priceDecimals;

        uint ethAmount = k/new_token_balance * priceDecimals;
        ethAmount = (ethAmount * 999) / 1000;
        require(
            ethAmount >= amountOut,
            "amountOut must be less than or equal to ethAmount"
        );
        payable(msg.sender).transfer(ethAmount);
        lastPrice = _price();
    }

    function escape() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
        IERC20(token).transfer(msg.sender, IERC20(token).balanceOf(address(this)));
    }
}
