import "./Stoppable.sol";
import "./SafeMath.sol";
import "./Stoppable.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Remittance is Stoppable {

    using SafeMath for uint; //Obsolate from Solidity 0.8.0

    struct KeyData{
        address sender;
        address thisAddress;
        address exchangerAddress;
        uint    amount;
        uint    expirationBlock;
        uint    fee;
    }

    bool isLocked;
    uint min_duration;
    uint max_duration;
    uint fee;

    mapping(bytes32 => KeyData) public myKeyData;

    event KeyLog(address indexed sender, uint amount, address exchanger, uint expirationBlock, uint fee, bytes32 publicKey);
    event WithdrawAmountLog(address who, uint amount, bytes32 publicKey);
    event WithdrawOwnerLog(address owner, uint amount);
    event ChangeDurationLog(address owner, uint min, uint max);
    event ChangeFeeLog(address owner, uint amount);

    constructor (uint _min_duration, uint _max_duration, uint _fee) public {
        require(_min_duration > uint(0) && _max_duration > uint(0) && _max_duration > _min_duration);
        require(_fee >= uint(0));
        min_duration = _min_duration;
        max_duration = _max_duration;
        fee = _fee;
        isLocked = false;
    }

    function sendFundAndGenerateKey(address _exchangerAddress, string memory _privateKeyBeneficiary, string memory _privateKeyExchanger, uint _duration) public payable onlyIfRunning returns(bytes32){

        require(_exchangerAddress != address(0x0));
        require(msg.sender != address(0x0));
        require(msg.value > uint(0));
        require(_duration > min_duration && _duration < max_duration, "Duration doesn't match the interval"); 
        require(bytes(_privateKeyBeneficiary).length > 10, "Beneficiary's Private Key lenght should be greater than 10 characters");
        require(bytes(_privateKeyBeneficiary).length > 10, "Exchanger's Private Key lenght should be greater than 10 characters");
        require(fee <= msg.value);

        bytes32 publicKey = keccak256(abi.encodePacked(msg.sender, _exchangerAddress, bytes(_privateKeyBeneficiary), bytes(_privateKeyExchanger)));

        myKeyData[publicKey].sender = msg.sender;
        myKeyData[publicKey].thisAddress = address(this);
        myKeyData[publicKey].exchangerAddress = _exchangerAddress;
        myKeyData[publicKey].amount = msg.value.sub(fee);
        myKeyData[publicKey].expirationBlock = block.number.add(_duration);
        myKeyData[publicKey].fee = fee;
        ownerFund = ownerFund.add(fee);

        emit KeyLog(msg.sender, msg.value.sub(fee) , _exchangerAddress, block.number.add(_duration), fee, publicKey);
        return publicKey;
    }
 

    function checkKeysAndWithdrawAmount(address _sender, address _exchangerAddress, string memory _privateKeyBeneficiary, string memory _privateKeyExchanger) external onlyIfRunning returns(bool){

        bytes32 key = keccak256(abi.encodePacked( _sender, _exchangerAddress, _privateKeyBeneficiary, _privateKeyExchanger));

        KeyData memory keydata = myKeyData[key];
        
        require(keydata.amount > uint(0), "Amount has to be greater than 0");
        require(keydata.sender != address(0x0), "Sender Address can't be null");   
        require(keydata.exchangerAddress != address(0x0), "Exchanger Address can't be null");                                                                  
        require(keydata.sender == _sender, "Sender Address Dismatch");
        require(keydata.exchangerAddress == _exchangerAddress, "Exchanger Address Dismatch");                     
        require((keydata.exchangerAddress == msg.sender && keydata.expirationBlock > block.number) || (keydata.sender == msg.sender && keydata.expirationBlock <= block.number), "Expiration Block or Address Dismatch");

        require(!isLocked, "Reentrant call detected");
        isLocked = true;  
        myKeyData[key].amount = uint(0);
        emit WithdrawAmountLog(msg.sender, keydata.amount, key);
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

    function withdrawOwnerFees() public onlyOwner returns(bool){
        require(ownerFund > 0, "No funds are available");
        require(!isLocked, "Reentrant call detected");
        isLocked = true;
        emit WithdrawOwnerLog(msg.sender, ownerFund);
        ownerFund = uint(0);
        (bool success, ) = msg.sender.call{value : ownerFund}("");
        require(success);
        isLocked = false;
        return success;
    }

    fallback () external {
        revert();
    }
 }