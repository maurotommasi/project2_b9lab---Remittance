// SPDX-License-Identifier: MIT

import "./Stoppable.sol";
import "./SafeMath.sol";
import "./Safety.sol";

pragma solidity 0.6.10;

contract Remittance is Stoppable, Safety {

    using SafeMath for uint; //Depracated from Solidity 0.8.0

    struct Remittance{
        address sender;
        address exchanger;
        uint    amount;
        uint    expirationBlock;
    }

    uint min_duration;
    uint max_duration;
    uint fee;

    mapping(bytes32 => Remittance) public remittances;

    event RemittanceLog(bytes32 publicKey, uint amount, uint expirationBlock);
    event WithdrawAmountLog(address who, uint amount, bytes32 publicKey);
    event ChangeDurationLog(address owner, uint min, uint max);
    event OwnerFeeBalance(address owner, uint amount);
    event ChangeFeeLog(address owner, uint amount);

    constructor (uint _min_duration, uint _max_duration, uint _fee) public {
        require(_min_duration > uint(0) && _max_duration > uint(0) && _max_duration > _min_duration);
        require(_fee >= uint(0));
        min_duration = _min_duration;
        max_duration = _max_duration;
        fee = _fee;
        isLocked = false;
    }

    function generatePublicKey(address _sender, address _exchanger, string memory _secretBeneficiary, string memory _secretExchanger) public view onlyIfRunning returns(bytes32){
        require(_sender != address(0x0));
        require(_exchanger != address(0x0));
        require(bytes(_secretBeneficiary).length > 10, "Beneficiary's Private Key lenght should be greater than 10 characters");
        require(bytes(_secretExchanger).length > 10, "Exchanger's Private Key lenght should be greater than 10 characters");
        return keccak256(abi.encodePacked(_sender, _exchanger, bytes(_secretBeneficiary), bytes(_secretExchanger)));        
    }

    function addFund(address _exchanger, bytes32 _publicSecret, uint _duration) external payable onlyIfRunning returns(bool){

        require(msg.sender != address(0x0));
        require(msg.value > uint(0));
        require(_duration > min_duration && _duration < max_duration, "Duration doesn't match the interval"); 

        require(fee <= msg.value);
        
        Remittance memory remittance = remittances[_publicSecret]; //It should be all zero-values

        require(remittance.expirationBlock == uint(0)); //being min duration > 0, A non used value is set to 0 -> For the same exchanger, sender can't use the same passwords
        remittance.sender = msg.sender;
        remittance.exchanger = _exchanger;
        remittance.amount = msg.value.sub(fee);
        remittance.expirationBlock = block.number.add(_duration);

        remittances[_publicSecret] = remittance; //I'm asking to write only 1 time all data

        uint newOwnerFund = ownerFund.add(fee);

        ownerFund = newOwnerFund;
        emit RemittanceLog(_publicSecret, remittance.amount, remittance.expirationBlock);
        emit OwnerFeeBalance(owner, newOwnerFund);
        return true;
    }
 

    function checkKeysAndWithdrawAmount(bytes32 _publicSecret) external onlyIfRunning ReentranceCallDetection returns(bool){

        Remittance memory remittance = remittances[_publicSecret]; //I'm asking 1 time to read data avoiding to ask again for each data
        
        require(remittance.amount > uint(0), "Amount has to be greater than 0"); // It means that is not withdrawed yet
        require(remittance.sender != address(0x0), "Sender Address can't be null");   
        require(remittance.exchanger != address(0x0), "Exchanger Address can't be null");                                                                  
        require(remittance.sender == msg.sender || remittance.exchanger == msg.sender, "Addresses Dismatch");
        require(remittance.expirationBlock > 0, "Expiration can't be null");                   
        require((remittance.exchanger == msg.sender && remittance.expirationBlock > block.number) || (remittance.sender == msg.sender && remittance.expirationBlock <= block.number), "Expiration Block or Address Dismatch");

        remittances[_publicSecret].amount = uint(0); // It's withdrawed with success if .amount is 0 // I write only on .amount location

        emit WithdrawAmountLog(msg.sender, remittance.amount, _publicSecret);

        (bool success, ) = msg.sender.call{value : remittance.amount}("");

        require(success);

        return success;

    }

    function changeDurationInterval(uint _min, uint _max) public onlyOwner returns(bool){

        require(_max > _min, "Min value can't be greater than Max value");
        require(_min > uint(0) && _max > uint(0), "Values can't be less or equal to 0");
        require(min_duration != _min && max_duration != _max, "Values are already set");

        min_duration = _min;
        max_duration = _max;

        emit ChangeDurationLog(msg.sender, _min, _max);
    }

    function setOwnerFee(uint _ownerFee) public onlyOwner returns(bool){

        require(fee != _ownerFee, "This fee is already set");
        require(fee >= uint(0), "Fee can't be negative!");

        fee = _ownerFee;

        emit ChangeFeeLog(msg.sender, _ownerFee);
    }

    function withdrawOwnerFees() external onlyOwner ReentranceCallDetection returns(bool){
        
        require(ownerFund > 0, "No funds are available");

        ownerFund = uint(0);

        emit OwnerFeeBalance(msg.sender, ownerFund);

        (bool success, ) = msg.sender.call{value : ownerFund}("");

        require(success);

        return success;
    }

    fallback () external {
        revert();
    }
 }
