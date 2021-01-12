import "./Owned.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Stoppable is Owned {

    bool private isRunning;

    event RunSwitchLog(address indexed owner, bool switchSetting);

    modifier onlyIfRunning {
        require(isRunning, "Stoppable.onlyIfRunning#001 : It's not running");
        _;
    }
    constructor () public {
        isRunning = true;
    }

    function runSwitch() public onlyOwner returns(bool){
        bool actualRunning = isRunning;
        isRunning = !actualRunning;
        RunSwitchLog(msg.sender, !actualRunning);
        return true;
    }

}
