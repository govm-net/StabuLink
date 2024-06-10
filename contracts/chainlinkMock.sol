// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./manager.sol";

contract ChainlinkMock is AggregatorV3Interface {
    uint80 private _roundId;
    int256 private _answer;
    uint256 private _timestamp;

    function setAnswer(int256 answer) public {
        _answer = answer;
    }

    function setRoundId(uint80 roundId) public {
        _roundId = roundId;
    }

    function setTimestamp(uint256 timestamp) public {
        _timestamp = timestamp;
    }

    function updateTimestamp() public {
        _timestamp = block.timestamp;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function description() external pure returns (string memory) {
        return "Mock";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(
        uint80 id
    )
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (id, _answer, _timestamp, _timestamp, id);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _timestamp, _timestamp, _roundId);
    }
}

contract ManagerMock is Manager {
    constructor(address _feed) Manager(_feed) {}

    function getSCoinBalance(address user) public view returns (uint) {
        return scoin.balanceOf(user);
    }

    function getFCoinBalance(address user) public view returns (uint) {
        return scoin.balanceOf(user);
    }
}
