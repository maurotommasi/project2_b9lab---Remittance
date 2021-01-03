// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Owned {

    address public owner;
    uint public ownerFund;

    event LogNewOwner(address sender, address oldOwner, address newOwner);

    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner can run this part");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function getOwner() public view returns(address) {
        return owner;
    }

    function changeOwner(address newOwner) public onlyOwner returns(bool)
    {
        require(ownerFund == 0, "Can't change owner if own fund is not withdrawed");
        emit LogNewOwner(msg.sender, owner, newOwner);
        owner = newOwner;
        return true;
    }

}