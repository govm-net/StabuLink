// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
// File: contracts/libraries/UQ112x112.sol
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./fcoin.sol";
import "./scoin.sol";
import "./pair.sol";

contract Manager is Ownable, Pausable {
    using Math for uint;
    uint private constant priceDecimals = 10 ** 8;
    uint private feedTimeLimit = 3600 * 12;

    uint256 public constant ONE_WEEK = 3600 * 24 * 7;
    uint256 public constant ONE_MONTH = 3600 * 24 * 31;
    uint256 public constant HALF_YEAR = 3600 * 24 * 183;

    SCoin public scoin;
    FCoin public fcoin;
    Pair public pair;

    uint public lastRebaseTime;

    // define record of deposit
    struct Deposit {
        address account;
        uint ethAmount;
        uint tokenAmount;
        uint timeout;
    }

    mapping(uint => Deposit) public deposits;
    uint public lastDepositID;
    uint public depositCount;
    uint public finishCount;

    AggregatorV3Interface internal dataFeed;

    event DepositRecord(
        uint indexed id,
        address indexed account,
        uint ethAmount,
        uint tokenAmount,
        uint timeout
    );

    event FinishDeposit(uint indexed id);

    event Rebase(uint indexed oldBase, uint indexed newBase);

    constructor(address _feed) Ownable(msg.sender) {
        dataFeed = AggregatorV3Interface(_feed);
        scoin = new SCoin(address(this));
        fcoin = new FCoin(address(this));
        pair = new Pair(address(this), address(scoin));
    }

    function getPairAddress() public view returns (address) {
        return address(pair);
    }

    function getSSUSDAddress() public view returns (address) {
        return address(scoin);
    }

    function getSFUSDAddress() public view returns (address) {
        return address(fcoin);
    }

    function getDataFeed() public view returns (address) {
        return address(dataFeed);
    }

    function setDataFeed(address _feed) external onlyOwner {
        dataFeed = AggregatorV3Interface(_feed);
    }

    function setFeedTimeLimit(uint _feedTimeLimit) external onlyOwner {
        feedTimeLimit = _feedTimeLimit;
    }

    function getChainlinkPrice() public view returns (uint) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            uint timeStamp,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        require(block.timestamp - timeStamp < feedTimeLimit, "data is too old");
        require(answer > 0, "data is invalid");
        return uint(answer);
    }

    // deposit eth to mint scoin
    function deposit(
        uint id,
        uint option,
        bool isSCoin
    ) external payable whenNotPaused {
        uint price = getChainlinkPrice();
        require(option > 0, "option is invalid");
        require(option < 4, "option is invalid");
        require(price > 0, "price is invalid");
        require(msg.value >= 0.001 ether, "value is invalid");
        if (id == 0) {
            lastDepositID++;
            id = lastDepositID;
        } else {
            require(id <= lastDepositID, "wrong id");
            require(deposits[id].ethAmount == 0, "id used");
        }
        uint tokenAmount = (msg.value * price) / priceDecimals;
        tokenAmount = (tokenAmount * 3) / 4;
        if (isSCoin) {
            scoin.mint(msg.sender, tokenAmount);
        } else {
            fcoin.mint(msg.sender, tokenAmount);
        }

        // option=1, 1week, fee=0.5%; option=2, 1month, fee=0.1%; option=3, 6month, fee=5%;
        uint fee;
        uint timeout;
        if (option == 1) {
            fee = msg.value / 200;
            timeout = block.timestamp + ONE_WEEK;
        } else if (option == 2) {
            fee = msg.value / 100;
            timeout = block.timestamp + ONE_MONTH;
        } else {
            fee = msg.value / 20;
            timeout = block.timestamp + HALF_YEAR;
        }
        payable(address(pair)).transfer(fee);
        uint feeAmount = (fee * price) / priceDecimals;
        scoin.mint(address(pair), feeAmount);
        // Community promotion fees
        scoin.mint(owner(), feeAmount);

        depositCount++;
        deposits[id] = Deposit(
            msg.sender,
            msg.value - fee,
            tokenAmount,
            timeout
        );
        emit DepositRecord(
            id,
            msg.sender,
            msg.value,
            tokenAmount,
            timeout
        );
    }

    // withdraw scoin to get eth
    function withdraw(uint depositID, bool isSCoin) external {
        Deposit memory record = deposits[depositID];
        delete deposits[depositID];
        require(record.tokenAmount > 0, "not exist");
        if (isSCoin) {
            scoin.burn(msg.sender, record.tokenAmount);
        } else {
            fcoin.burn(msg.sender, record.tokenAmount);
        }
        finishCount++;
        payable(record.account).transfer(record.ethAmount);
        emit FinishDeposit(depositID);
    }

    // liquidate scoin to get eth
    function liquidate(uint depositID) external whenNotPaused {
        Deposit memory record = deposits[depositID];
        require(block.timestamp > record.timeout, "not timeout");
        require(record.timeout > 0, "not exist");
        delete deposits[depositID];
        uint price = getChainlinkPrice();
        uint tokenAmount = (record.ethAmount * price) / priceDecimals;
        payable(address(pair)).transfer(record.ethAmount);
        scoin.mint(address(pair), tokenAmount);
        finishCount++;
        emit FinishDeposit(depositID);
    }

    // scoin2fcoin
    function scoin2fcoin(uint amount) external {
        require(amount > 0, "amount is invalid");
        scoin.burn(msg.sender, amount);
        fcoin.mint(msg.sender, amount - amount / 1000);
    }

    // fcoin2scoin
    function fcoin2scoin(uint amount) external {
        require(amount > 0, "amount is invalid");
        fcoin.burn(msg.sender, amount);
        scoin.mint(msg.sender, amount - amount / 1000);
    }

    // rebase
    function rebase() external whenNotPaused {
        uint current = block.timestamp / 86400;
        if (current == lastRebaseTime) {
            return;
        }
        lastRebaseTime = current;
        uint price1 = getChainlinkPrice();
        uint price2 = pair.averagePrice();
        uint base = scoin.base();
        uint newbase = (base * price1) / price2;
        uint balance1 = scoin.balanceOf(address(pair));
        scoin.rebase(newbase);
        emit Rebase(base, newbase);
        if (newbase > base) {
            return;
        }
        uint balance2 = scoin.balanceOf(address(pair));

        scoin.mint(address(pair), (balance2 - balance1) / 2);
        newbase = scoin.base();
        scoin.rebase((newbase + base) / 2);
    }

    function forceRebase() external whenPaused {
        uint current = block.timestamp / 86400;
        if (current == lastRebaseTime) {
            return;
        }
        lastRebaseTime = current;
        uint base = scoin.base();
        scoin.rebase(base - base / 1000);
    }

    function escape() external onlyOwner whenPaused {
        // All users are withdrawn
        if (finishCount < depositCount) {
            return;
        }
        pair.escape();
        payable(msg.sender).transfer(address(this).balance);
    }
}
