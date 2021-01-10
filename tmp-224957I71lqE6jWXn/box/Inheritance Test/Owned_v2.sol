// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

// ONLY FOR TEST //

contract Owned {

    address public owner;
    address public contractPointer;

    event LogNewOwner(address indexed oldOwner, address indexed newOwner);

    modifier rightContractPointer {
        require(contractPointer == msg.sender);
        _;
    }

    constructor (address _contractPointer, address _owner) public {
        contractPointer = _contractPointer;
        owner = _owner;
    }

}