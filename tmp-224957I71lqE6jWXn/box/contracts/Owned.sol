// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Owned {

    address public owner;

    event LogNewOwner(address sender, address oldOwner, address newOwner);

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address newOwner) public onlyOwner returns(bool)
    {
        emit LogNewOwner(msg.sender, owner, newOwner);
        owner = newOwner;
        return true;
    }

}