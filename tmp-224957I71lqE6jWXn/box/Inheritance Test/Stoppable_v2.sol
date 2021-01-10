import "./Owned_v2.sol";

// SPDX-License-Identifier: MIT

// ONLY FOR TEST //

pragma solidity 0.6.10;

contract Stoppable {

    Owned ownedIstance;

    bool internal isRunning;
    address contractPointer;

    event RunSwitchLog(address owner, bool switchSetting);

    modifier onlyIfRunning {
        require(isRunning, "Stoppable.onlyIfRunning#001 : It's not running");
        _;
    }
    constructor (address _contractPointer, address _owner) public {
        contractPointer = _contractPointer;
        ownedIstance = (new Owned)(address(this), _owner);
        isRunning = true;
    }

    function runSwitch() public returns(bool){

        require(ownedIstance.owner = msg.sender);
        bool actualRunning = isRunning;
        isRunning = !actualRunning;
        RunSwitchLog(msg.sender, !actualRunning);
        return true;
    }

}
