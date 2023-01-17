// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC1155Mock is ERC1155Burnable, Ownable {
    constructor(string memory uri, address owner) ERC1155(uri) {
        transferOwnership(owner);
    }

    function mint(address to, uint256 id, uint256 amount) public onlyOwner {
        _mint(to, id, amount, "");
    }
}
