import "./Stoppable.sol";
import "./SafeMath.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Remittance is Stoppable {

    using SafeMath for uint; //Depracated from Solidity 0.8.0

    struct KeyData{
        address sender;
        address exchanger;
        uint    amount;
        uint    expirationBlock;
    }


    bool isLocked;
    uint min_duration;
    uint max_duration;
    uint fee;

    mapping(bytes32 => KeyData) public myKeyData;

    event KeyLog(bytes32 publicKey, uint amount, uint expirationBlock);
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

    function generatePublicKey(address _exchanger, string memory _secretBeneficiary, string memory _secretExchanger) public view onlyIfRunning returns(bytes32){
        require(_exchanger != address(0x0));
        require(msg.sender != address(0x0));
        require(bytes(_secretBeneficiary).length > 10, "Beneficiary's Private Key lenght should be greater than 10 characters");
        require(bytes(_secretExchanger).length > 10, "Exchanger's Private Key lenght should be greater than 10 characters");
        return keccak256(abi.encodePacked(msg.sender, _exchanger, bytes(_secretBeneficiary), bytes(_secretExchanger)));
    }

    function addFund(address _exchanger, bytes32 _publicSecret, uint _duration) external payable onlyIfRunning returns(bool){

        require(msg.sender != address(0x0));
        require(msg.value > uint(0));
        require(_duration > min_duration && _duration < max_duration, "Duration doesn't match the interval"); 

        require(fee <= msg.value);
        
        KeyData memory keydata = myKeyData[_publicSecret];

        require(keydata.expirationBlock == uint(0)); //being min duration > 0, A non used value is set to 0 -> For the same exchanger, sender can't use the same passwords
        keydata.sender = msg.sender;
        keydata.exchanger = _exchanger;
        keydata.amount = msg.value.sub(fee);
        keydata.expirationBlock = block.number.add(_duration);

        myKeyData[_publicSecret] = keydata;
        uint newOwnerFund = ownerFund.add(fee);

        ownerFund = newOwnerFund;
        emit KeyLog(_publicSecret, keydata.amount, keydata.expirationBlock);
        emit OwnerFeeBalance(owner, newOwnerFund);
        return true;
    }
 

    function checkKeysAndWithdrawAmount(bytes32 _publicSecret) external onlyIfRunning returns(bool){

        KeyData memory keydata = myKeyData[_publicSecret];
        
        require(keydata.amount > uint(0), "Amount has to be greater than 0"); // It means that is not withdrawed yet
        require(keydata.sender != address(0x0), "Sender Address can't be null");   
        require(keydata.exchanger != address(0x0), "Exchanger Address can't be null");                                                                  
        require(keydata.sender == msg.sender || keydata.exchanger == msg.sender, "Addresses Dismatch");
        require(keydata.expirationBlock > 0, "Expiration can't be null");                   
        require((keydata.exchanger == msg.sender && keydata.expirationBlock > block.number) || (keydata.sender == msg.sender && keydata.expirationBlock <= block.number), "Expiration Block or Address Dismatch");

        require(!isLocked, "Reentrant call detected");

        isLocked = true;  

        myKeyData[_publicSecret].amount = uint(0); // It's withdrawed with success if .amount is 0

        emit WithdrawAmountLog(msg.sender, keydata.amount, _publicSecret);

        (bool success, ) = msg.sender.call{value : keydata.amount}("");

        require(success);

        isLocked = false;

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

    function withdrawOwnerFees() external onlyOwner returns(bool){
        
        require(ownerFund > 0, "No funds are available");
        require(!isLocked, "Reentrant call detected");

        isLocked = true;

        ownerFund = uint(0);

        emit OwnerFeeBalance(msg.sender, ownerFund);

        (bool success, ) = msg.sender.call{value : ownerFund}("");

        require(success);

        isLocked = false;

        return success;
    }

    fallback () external {
        revert();
    }
 }
