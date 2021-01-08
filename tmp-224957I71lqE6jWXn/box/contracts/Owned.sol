// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Owned {

    address public owner;
    
    event LogNewOwner(address indexed oldOwner, address indexed newOwner, uint timestamp);

    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner can run this part");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address _newOwner) public returns(bool)
    {
        address actualOwner = owner;

        require(msg.sender == actualOwner, "Only Owner can run this part");

        owner = _newOwner;

        emit LogNewOwner(actualOwner, _newOwner, block.timestamp);

        return true;
    }

}