// SPDX-License-Identifier: MIT

import "./Remittance.sol";

pragma solidity 0.6.10;

contract Analysis {

    uint u0;
    uint u1;

    modifier delta() {
        u0 = gasleft();
        _;
        u1 = gasleft();
    }

    function getDelta() public pure returns(uint){
        return  u1 - u0;
    }

    function generatePublicKeyA(address _sender, address _exchanger, string memory _secretBeneficiary, string memory _secretExchanger) public view onlyIfRunning delta returns(uint){
        bytes32 v = generatePublicKey(_sender, _exchanger, _secretBeneficiary, _secretExchanger);
        return getDelta();
    }

    function addFundA(address _exchanger, bytes32 _publicSecret, uint _duration) external payable onlyIfRunning delta returns(uint){
        bool v = addFund(_exchanger, _publicSecret, _duration);
        return getDelta();
    }

    function checkKeysAndWithdrawAmountA(bytes32 _publicSecret) external onlyIfRunning ReentranceCallDetection returns(uint){
        bool v = checkKeysAndWithdrawAmountA(_publicSecret);
        return getDelta();
    }


}

