import "./Owned.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Stoppable is Owned {

    bool internal running;
    
    event LogRunSwitch(address sender, bool switchSetting);

    modifier onlyIfRunning {
        require(running, "Stoppable.onlyIfRunning#001 : Only if running dismatch");
        _;
    }

    constructor() public {
        running = true;
    }

    function runSwitch() public onlyOwner returns(bool){
        bool actualRunning = running;
        running = !actualRunning;
        LogRunSwitch(msg.sender, !actualRunning);
        return true;
    }

}