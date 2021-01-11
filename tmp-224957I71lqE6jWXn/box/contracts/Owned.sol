// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Owned {

    address private owner;
    uint private ownershipBlockStart;

    event LogNewOwner(address indexed oldOwner, address indexed newOwner, uint ownershipBlockStart);

    modifier onlyOwner {
        require(msg.sender == owner && ownershipBlockStart >= block.number, "Owned.onlyOwner#001 : Only Owner can run this part");
        _;
    }

    constructor() public {
        owner = msg.sender;
        ownershipBlockStart = block.number;
    }

    function getOwner() public view returns(address){
        return owner;
    }

    function changeOwner(address _newOwner) public returns(bool)
    {
        address actualOwner = owner;
        uint blockStart = block.number.add(uint(1));

        require(msg.sender == actualOwner, "Owned.changeOwner#001 : Only Owner can run this part");

        owner = _newOwner;
        ownershipBlockStart = blockStart;

        emit LogNewOwner(actualOwner, _newOwner, blockStart);

        return true;
    }

}