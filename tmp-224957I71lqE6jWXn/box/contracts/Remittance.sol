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

    bool isLocked = false;
    uint min_duration;
    uint max_duration;
    uint ownerFeePercentage; // Applied to gas cost of this contract
    uint fee;
    uint deployedGasCost;

    mapping(bytes32 => KeyData) public myKeyData;

    event KeyLog(address indexed sender, uint amount, address exchanger, uint expirationBlock, uint fee, bytes32 publicKey);
    event WithdrawAmountLog(address who, uint amount, bytes32 publicKey);
    event WithdrawOwnerLog(address owner, uint amount);
    event ChangeDurationLog(address owner, uint min, uint max);
    event ChangeFeeLog(address owner, uint amount);
    constructor () public {
        min_duration = 1;
        max_duration = 20;
        fee = 150000000000000;
    }

    function sendFundAndGenerateKey(address _exchangerAddress, string memory _privateKeyBeneficiary, string memory _privateKeyExchanger, uint _duration) public payable onlyIfRunning returns(bytes32){

        require(_exchangerAddress != address(0x0));
        require(msg.sender != address(0x0));
        require(msg.value > 0);
        require(_duration > min_duration && _duration < max_duration, "Duration doesn't match the interval"); 
        require(bytes(_privateKeyBeneficiary).length > 10, "Beneficiary's Private Key lenght should be greater than 10 characters");
        require(bytes(_privateKeyBeneficiary).length > 10, "Exchanger's Private Key lenght should be greater than 10 characters");
        require(fee <= msg.value);

        bytes32 publicKey = keccak256(abi.encodePacked(msg.sender, _exchangerAddress, bytes(_privateKeyBeneficiary), bytes(_privateKeyExchanger)));

        myKeyData[publicKey].sender = msg.sender;
        myKeyData[publicKey].thisAddress = address(this);
        myKeyData[publicKey].exchangerAddress = _exchangerAddress;
        myKeyData[publicKey].amount = msg.value - fee;
        myKeyData[publicKey].expirationBlock = block.number + _duration;
        myKeyData[publicKey].fee = fee;
        ownerFund += fee;

        emit KeyLog(msg.sender, msg.value - fee, _exchangerAddress, block.number + _duration, fee, publicKey);
        return publicKey;
    }
 

    function checkKeysAndWithdrawAmount(address _sender, address _exchangerAddress, string memory _privateKeyBeneficiary, string memory _privateKeyExchanger) external onlyIfRunning returns(bool){

        bytes32 key = keccak256(abi.encodePacked( _sender, _exchangerAddress, _privateKeyBeneficiary, _privateKeyExchanger));

        KeyData memory keydata = myKeyData[key];
        
        require(keydata.amount > 0, "Amount has to be greater than 0");
        require(keydata.sender != address(0x0), "Sender Address can't be null");   
        require(keydata.exchangerAddress != address(0x0), "Exchanger Address can't be null");                                                                  
        require(keydata.sender == _sender, "Sender Address Dismatch");
        require(keydata.exchangerAddress == _exchangerAddress, "Exchanger Address Dismatch");                     
        require((keydata.exchangerAddress == msg.sender && keydata.expirationBlock > block.number) || (keydata.sender == msg.sender && keydata.expirationBlock <= block.number), "Expiration Block or Address Dismatch");

        //msg.sender.transfer(keydata.amount);
        require(!isLocked, "Reentrant call detected");
        isLocked = true;
        (bool success, ) = msg.sender.call{value : keydata.amount}("");
        myKeyData[key].amount = 0;
        emit WithdrawAmountLog(msg.sender, keydata.amount, key);
        isLocked = false;
        return success;

    }

    function changeDurationInterval(uint _min, uint _max) public onlyOwner returns(bool){
        require(_max > _min && _min > 0 && _max > 0);
        require(min_duration != _min || max_duration != _max);
        min_duration = _min;
        max_duration = _max;
        emit ChangeDurationLog(msg.sender, _min, _max);
    }

    function setOwnerFee(uint _ownerFee) public onlyOwner returns(bool){
        require(fee != _ownerFee);
        fee = _ownerFee;
        emit ChangeFeeLog(msg.sender, _ownerFee);
    }

    function withdrawOwnerFees() public onlyOwner returns(bool){
        require(!isLocked, "Reentrant call detected");
        isLocked = true;
        (bool success, ) = msg.sender.call{value : ownerFund}("");
        emit WithdrawOwnerLog(msg.sender, ownerFund);
        ownerFund = 0;
        isLocked = false;
        return success;
    }
 }