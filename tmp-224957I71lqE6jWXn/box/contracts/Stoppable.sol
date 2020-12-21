import "./Owned.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Stoppable is Owned {

    bool public running;
    
    event LogRunSwitch(address sender, bool switchSetting);

    modifier onlyIfRunning {
        require(running);
        _;
    }

    constructor() public {
        running = true;
    }

    function runSwitch(bool onOff) public onlyOwner returns(bool){
        running = onOff;
        LogRunSwitch(msg.sender, onOff);
        return true;
    }

}