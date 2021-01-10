// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Owned {

    address public owner;
    
    event LogNewOwner(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner {
        require(msg.sender == owner, "Owned.onlyOwner#001 : Only Owner can run this part");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address _newOwner) public returns(bool)
    {
        address actualOwner = owner;

        require(msg.sender == actualOwner, "Owned.changeOwner#001 : Only Owner can run this part");

        owner = _newOwner;

        emit LogNewOwner(actualOwner, _newOwner);

        return true;
    }

}