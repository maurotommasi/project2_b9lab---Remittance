import "./Stoppable.sol";
import "./SafeMath.sol";
import "./Stoppable.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.10;

contract Remittance is Stoppable {

    using SafeMath for uint; //Obsolate from Solidity 0.8.0

    struct KeyData{
        uint    blockNumber;
        bytes32 blockHash;
        uint    blocktimestamp; 
        address thisAddress;
        bytes32 publicKey;
        address sender;
        uint    amount;
        uint    duration;
    }

    uint min_duration;
    uint max_duration;
    
    mapping(address => uint) balances;
    mapping(address => KeyData) myKeyData;

    event KeyLog(address indexed sender, uint amount, address shop, uint duration, bytes32 publicKey);
    event WithdrawBalanceLog(address shop, uint amount, address sender, bytes32 publicKey);
    event LimitChangelog(address owner, uint min, uint max);

    constructor() public {
        min_duration = 1000;
        max_duration = 10000;
    }
    function isComplex(bytes32 _privateKey) private pure returns(bool){
        // Complexity 1
        require(_privateKey.length < 10, "Key lenght can't be less of 10 characters");
        // Complexity 2
        uint i = 0;
        while (i<_privateKey.length - 3)
        {
            require(_privateKey[i] != _privateKey[i+1] && _privateKey[i+1] != _privateKey[i+2], "Key can't have 3 consecutive characters");
            i += 1;
        }
        // Complexity 3 ...
        return true;
    }

    function generateKey(bytes32 OTP1, bytes32 OTP2, address _shop, uint _duration) public payable returns(bytes32){

        //OTP1 = One Time Password 1 (Beneficiary) - OTP2 = One Time Password 2 (Shop)

        require(isComplex(OTP1) && isComplex(OTP2), "Not enough complexity on OTPs");
        require(OTP1 != OTP2, "OTPs can't be the same");
        require(_shop != address(0x0));
        require(msg.sender != address(0x0));
        require(msg.value > 0);
        require(_duration >= 1000 && _duration <= 10000, "Duration cant be less than 1000 or grater then 10000"); 

        uint blockNumber = block.number;
        bytes32 blockHash = blockhash(blockNumber);
        bytes32 publicKey = keccak256(abi.encodePacked(blockNumber, blockHash, block.timestamp, address(this), msg.sender, OTP1, OTP2, _shop));

        myKeyData[_shop].blockNumber = blockNumber;
        myKeyData[_shop].blockHash = blockHash;
        myKeyData[_shop].blocktimestamp = block.timestamp;
        myKeyData[_shop].publicKey = publicKey;
        myKeyData[_shop].thisAddress = address(this);
        myKeyData[_shop].sender = msg.sender;
        myKeyData[_shop].amount = msg.value;
        myKeyData[_shop].duration = _duration;

        balances[msg.sender] = balances[msg.sender].add(msg.value);

        emit KeyLog(msg.sender, msg.value, _shop, _duration, publicKey);
        return publicKey;
    }
 
    function checkKeysAndWithdrawBalance(address _sender, bytes32 _privateKeyBeneficiary, bytes32 _privateKeyShop) public onlyIfRunning returns(bool){

        KeyData memory keydata = myKeyData[msg.sender];  
        uint blockNumber = block.number;
        require(keydata.sender == _sender);
        require(keydata.duration.add(blockNumber) < keydata.blockNumber);
        require(keccak256(abi.encodePacked( keydata.blockNumber,
                                            keydata.blockHash,
                                            keydata.blocktimestamp,
                                            keydata.thisAddress,
                                            keydata.sender,
                                            _privateKeyBeneficiary,
                                            _privateKeyShop,
                                            msg.sender)) == keydata.publicKey);

        msg.sender.transfer(keydata.amount);
        balances[keydata.sender].sub(keydata.amount);

        emit WithdrawBalanceLog(msg.sender, keydata.amount, keydata.sender, keydata.publicKey);

        return true;

    }

    function withdrawOwnBalance(address _shopAddress,  bytes32 _privateKeyBeneficiary, bytes32 _privateKeyShop) public onlyIfRunning returns(bool){

        KeyData memory keydata = myKeyData[msg.sender];  
        uint blockNumber = block.number;

        require(keydata.duration.add(blockNumber) >= keydata.blockNumber);
        require(keccak256(abi.encodePacked( keydata.blockNumber,
                                            keydata.blockHash,
                                            keydata.blocktimestamp,
                                            keydata.thisAddress,
                                            msg.sender,
                                            _privateKeyBeneficiary,
                                            _privateKeyShop,
                                            _shopAddress)) == keydata.publicKey);

        emit WithdrawBalanceLog(msg.sender, keydata.amount, keydata.sender, keydata.publicKey);

        return true;
    }

    function getBalance(address _address) public view returns(uint){
        return balances[_address];
    }

    function getOwner() public view returns(address){
        return owner;
    }

    function changeMinMaxDuration(uint _min, uint _max) public onlyOwner returns(bool){
        require(_max > _min);
        min_duration = _min;
        max_duration = _max;
        emit LimitChangelog(owner, _min, _max);
    }
    
}