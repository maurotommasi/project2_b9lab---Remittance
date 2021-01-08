// SPDX-License-Identifier: MIT

import "./Stoppable.sol";
import "./SafeMath.sol";
import "./Safety.sol";

pragma solidity 0.6.10;

contract Remittance is Stoppable, Safety {

    using SafeMath for uint; //Depracated from Solidity 0.8.0

    enum RemittanceState {Null, Created, Checked, Expired}

    struct Remittance{
        address sender;
        address exchanger;
        uint    amount;
        uint    expirationBlock;
        RemittanceState remittanceState;
    }

    uint min_duration;
    uint max_duration;
    uint fee;

    uint public ownerFund;

    mapping(bytes32 => Remittance) public remittances;
    mapping(address => uint) public balances;

    event RemittanceLog(bytes32 indexed publicKey, uint amount, uint expirationBlock);
    event WithdrawAmountLog(address indexed who, uint amount, bytes32 indexed publicKey);
    event ChangeMinDurationLog(address indexed owner, uint min);
    event ChangeMaxDurationLog(address indexed owner, uint max);
    event BalancesChangeLog(address indexed who, uint amount);
    event ChangeFeeLog(address indexed owner, uint amount);

    constructor (uint _min_duration, uint _max_duration, uint _fee) public {
        require(_max_duration > _min_duration && _min_duration != uint(0));
        min_duration = _min_duration;
        max_duration = _max_duration;
        fee = _fee;
    }

    function generatePublicKey(address _sender, address _exchanger, bytes32 _secretBeneficiary, bytes32 _secretExchanger) public view returns(bytes32){
        require(_sender != address(0x0));
        require(_exchanger != address(0x0));
        require(bytes(_secretBeneficiary).length > 10, "Beneficiary's Private Key lenght should be greater than 10 characters");
        require(bytes(_secretExchanger).length > 10, "Exchanger's Private Key lenght should be greater than 10 characters");
        return keccak256(abi.encodePacked(_sender, _exchanger, _secretBeneficiary, _secretExchanger, address(this)));        
    }

    function addFund(address _exchanger, bytes32 _publicSecret, uint _duration) external payable onlyIfRunning returns(bool){

        require(msg.sender != address(0x0));
        require(msg.value > uint(0));
        require(_duration >= min_duration && _duration <= max_duration, "Duration doesn't match the interval"); 
        
        require(remittances[_publicSecret].remittanceState == RemittanceState.Null); //Check duplicate

        Remittance memory remittance;
        uint ownerFee = fee; 

        require(msg.value > ownerFee);

        remittance.sender = msg.sender;
        remittance.exchanger = _exchanger;
        remittance.amount = msg.value.sub(ownerFee);
        remittance.expirationBlock = block.number.add(_duration);
        remittance.remittanceState = RemittanceState.Created;

        remittances[_publicSecret] = remittance; //I'm asking to write only 1 time all data

        uint newOwnerBalance = balances[owner].add(ownerFee);

        balances[owner] = ownerBalance;

        emit RemittanceLog(_publicSecret, remittance.amount, remittance.expirationBlock);
        emit BalancesChangeLog(owner, newOwnerBalance);
        return true;
    }
 

    function checkKeys(bytes32 _secretBeneficiary, bytes32 _secretExchanger, bytes32 _publicSecret) external onlyIfRunning returns(bool){

        Remittance memory remittance = remittances[_publicSecret];

        require(remittance.exchanger == msg.sender, "Addresses Dismatch");
        require(generatePublicKey(remittance.sender, msg.sender, _secretBeneficiary, _secretExchanger, address(this)) == _publicSecret, "Incorrect Data");
        require(remittance.remittanceState = RemittanceState.Created);                 
        require(remittance.expirationBlock > block.number, "Expiration Block Dismatch");

        balances[msg.sender].add(remittance.amount);

        remittances[_publicSecret].remittanceState = RemittanceState.Checked;

        return true;

    }

    function withdrawExpiredRemittance(bytes32 _publicSecret) external onlyIfRunning returns(bool){

        Remittance memory remittance = remittances[_publicSecret];

        require(remittance.sender == msg.sender, "Only the sender can unlock this function");
        require(remittance.remittanceState == RemittanceState.Created, "Exhanger doesn't withdraw yet");

        uint balance = balances[msg.sender].add(remittance.amount);

        balances[msg.sender] = balance;

        remittances[_publicSecret].remittanceState = RemittanceState.Expired;

        emit BalancesChangeLog(msg.sender, balance);
        
    }
    
    function withdrawBalance() public ReentranceCallDetection returns(bool){
        
        require(msg.sender != address(0x0), "Sender can't be null");
        
        uint balance = balances[msg.sender];
        require(balance != 0, "Balance can't be equal to 0");

        balances[msg.sender] = uint(0);
        emit WithdrawAmountLog(msg.sender, balance); 

        (bool success, ) = msg.sender.call{value : balance}("");
        require(success);

        //msg.sender.transfer(balance);

        emit WithdrawAmountLog(msg.sender, balance);

        return true;
    }

    function changeMinDurationInterval(uint _min) public onlyOwner returns(bool){

        require(max_duration > _min, "Min value can't be greater than Max value");
        require(min_duration != _min && _min != 0, "Values are already set or Min Value equal to 0");

        min_duration = _min; 

        emit ChangeMinDurationLog(msg.sender, _min);
    }

    function changeMaxDurationInterval(uint _max) public onlyOwner returns(bool){

        require(_max > min_duration, "Min value can't be greater than Max value");
        require(max_duration != _max, "Values are already set");

        max_duration = _max;

        emit ChangeDurationLog(msg.sender, _max);
    }

    function setOwnerFee(uint _ownerFee) public onlyOwner returns(bool){

        require(fee != _ownerFee, "This fee is already set");

        fee = _ownerFee;

        emit ChangeFeeLog(msg.sender, _ownerFee);
    }

    fallback () external {
        revert();
    }
 }
