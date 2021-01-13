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

    function getIsRunning() public view returns(bool){
        return isRunning;
    }

    constructor (bool _isRunning) public {
        isRunning = _isRunning;
    }

    function runSwitch() public onlyOwner returns(bool){
        bool newRunning = !isRunning;
        isRunning = newRunning;
        RunSwitchLog(msg.sender, newRunning);
        return true;
    }

}
