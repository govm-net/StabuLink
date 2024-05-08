// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract FCoin is ERC20, Ownable, ERC20Permit {
    constructor(address initialOwner)
        ERC20("StabuLink Fixed Coin", "SFUSD")
        Ownable(initialOwner)
        ERC20Permit("SFUSD")
    {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address account, uint256 value) public onlyOwner {
        _burn(account, value);
    }
}