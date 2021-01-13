// SPDX-License-Identifier: MIT

import "./Stoppable.sol";
import "./SafeMath.sol";

pragma solidity 0.6.10;

contract Remittance is Stoppable(true) {

    using SafeMath for uint; //Depracated from Solidity 0.8.0

    struct Remittance{
        address sender;
        address exchanger;
        uint    amount;
        uint    expirationBlock;
    }

    uint public min_duration;
    uint public max_duration;
    uint public fee;

    mapping(bytes32 => Remittance) public remittances;
    mapping(address => uint) public balances;

    event RemittanceLog(bytes32 indexed publicSecret, uint amount, uint expirationBlock);
    event WithdrawRemittanceLog(address indexed who, uint amount, bytes32 publicSecret);
    event WithdrawBalanceLog(address indexed who, uint amount);
    event ChangeMinDurationLog(address indexed owner, uint min);
    event ChangeMaxDurationLog(address indexed owner, uint max);
    event NewOwnerFeeLog(address indexed who, uint amount);
    event ChangeFeeLog(address indexed owner, uint amount);

    constructor (uint _min_duration, uint _max_duration, uint _fee) public {
        require(_max_duration > _min_duration && _min_duration != uint(0));
        min_duration = _min_duration;
        max_duration = _max_duration;
        fee = _fee;
    }

    function generatePublicKey(address _sender, address _exchanger, bytes32 _secretBeneficiary, bytes32 _secretExchanger) public view returns(bytes32){
        require(_secretBeneficiary != bytes32(0), "Remittance.generatePublicKey#001 : Beneficiary's Private Key can't be null");
        require(_secretExchanger != bytes32(0), "Remittance.generatePublicKey#002 : Exchanger's Private Key can't ber null");
        return keccak256(abi.encodePacked(_sender, _exchanger, _secretBeneficiary, _secretExchanger, address(this)));        
    }

    function addFund(address _exchanger, bytes32 _publicSecret, uint _duration) external payable onlyIfRunning returns(bool){

        require(msg.value > uint(0), "Remittance.addFund#001 : msg.value can't be 0");
        require(min_duration <= _duration && _duration <= max_duration, "Remittance.addFund#002 : Duration doesn't match the interval"); 
        require(remittances[_publicSecret].expirationBlock == uint(0), "Remittance.addFund#003 : Remittance data already used"); //Check duplicate

        Remittance memory remittance;
        uint ownerFee = fee; 

        require(msg.value > ownerFee, "Remittance.addFund#004 : Msg.value has to be greater than owner fee");

        remittance.sender = msg.sender;
        remittance.exchanger = _exchanger;
        remittance.amount = msg.value.sub(ownerFee);
        remittance.expirationBlock = block.number.add(_duration);

        remittances[_publicSecret] = remittance; 
        
        address owner = getOwner();

        balances[owner] = balances[owner].add(ownerFee);

        emit RemittanceLog(_publicSecret, remittance.amount, remittance.expirationBlock);
        emit NewOwnerFeeLog(owner, ownerFee);

        return true;
    }
    
    function checkKeys(bytes32 _secretBeneficiary, bytes32 _secretExchanger, bytes32 _publicSecret) external onlyIfRunning returns(bool){

        Remittance memory remittance = remittances[_publicSecret];

        require(remittance.exchanger == msg.sender, "Remittance.checkKeys#001 : Addresses Dismatch");
        require(generatePublicKey(remittance.sender, msg.sender, _secretBeneficiary, _secretExchanger) == _publicSecret, "Remittance.checkKeys#002 : Incorrect Data");
        require(remittance.amount > 0, "Remittance.checkKeys#003 : Remittance state has to be created or already checked");                 
        require(remittance.expirationBlock >= block.number, "Remittance.checkKeys#004 : Expiration Block Dismatch");

        remittances[_publicSecret].amount = uint(0);

        emit WithdrawRemittanceLog(msg.sender, remittance.amount, _publicSecret);

        (bool success, ) = msg.sender.call{value : remittance.amount}("");
        require(success);

        return true;

    }

    function withdrawExpiredRemittance(bytes32 _publicSecret) external onlyIfRunning returns(bool){

        Remittance memory remittance = remittances[_publicSecret];

        require(remittance.sender == msg.sender, "Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function");
        require(remittance.amount > 0, "Remittance.withdrawExpiredRemittance#002 : Exhanger withdrawed yet or Remittance not created");
        require(remittance.expirationBlock < block.number, "Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch");

        remittances[_publicSecret].amount = uint(0);

        emit WithdrawRemittanceLog(msg.sender, remittance.amount, _publicSecret);

        (bool success, ) = msg.sender.call{value : remittance.amount}(""); //For Xavier: msg.sender.call.value() is deprecated.
        require(success);

        return true;
    }
    
    function withdrawBalance() public returns(bool){
        
        uint balance = balances[msg.sender];

        require(balance != 0, "Remittance.withdrawBalance#001 : Balance can't be equal to 0");

        balances[msg.sender] = uint(0);

        emit WithdrawBalanceLog(msg.sender, balance);

        (bool success, ) = msg.sender.call{value : balance}(""); //For Xavier: msg.sender.call.value() is deprecated.
        require(success);

        return true;
    }

    function changeMinDurationInterval(uint _min) public onlyOwner returns(bool){

        require(max_duration >= _min, "Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value");
        require(min_duration != _min && _min != 0, "Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0");

        min_duration = _min; 

        emit ChangeMinDurationLog(msg.sender, _min);
    }

    function changeMaxDurationInterval(uint _max) public onlyOwner returns(bool){

        require(_max >= min_duration, "Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value");
        require(max_duration != _max, "Remittance.changeMaxDurationInterval#002 : Values are already set");

        max_duration = _max;

        emit ChangeMaxDurationLog(msg.sender, _max);
    }

    function setOwnerFee(uint _ownerFee) public onlyOwner returns(bool){

        require(fee != _ownerFee, "Remittance.setOwnerFee#001 : This fee is already set");

        fee = _ownerFee;

        emit ChangeFeeLog(msg.sender, _ownerFee);
    }

    fallback () external {
        revert();
    }
 }
