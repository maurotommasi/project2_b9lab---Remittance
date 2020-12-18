// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <=0.7.0;

contract Remittance {

    struct keyDataStruct {
        uint blockNumber;
        bytes32 blockHash_;
        uint blocktimestamp;
        address thisAddress;
        uint amount;
    }

    address payable owner;
    bool restricted;

    mapping(address => uint) balances;
    mapping(address => bytes32) private publicKey;
    mapping(address => keyDataStruct) private keyData;
    
    modifier onlyOwner {
        require(owner == msg.sender);
        _;
    }

    modifier isRestricted {
        require(restricted);
        _;
    }

    event ownerChangeLog(address indexed oldOwner, address indexed newOwner);
    
    constructor() {
        owner = msg.sender;
        restricted = true; //no one can access to password generator
    }

    function getRestricted() public view returns(bool){
        return restricted;
    }

    function setRestricted(bool _restricted) onlyOwner private{
        restricted = _restricted;
    }

    function getOwner() public view returns(address){
        return owner;
    }

    function setOwner() public returns(bool){
        require(msg.sender != owner && msg.sender != address(0x0));
        address oldOwner = owner;
        owner = msg.sender; 
        emit ownerChangeLog(oldOwner, owner);
        return true;
    }

    function generatePublicKey(address payable _address, uint _amount, bytes32 _key, address _shop) private onlyOwner isRestricted returns(bytes32){
        uint blockNumber = block.number;
        bytes32 blockHash = blockhash(blockNumber);
        keyData[_shop].blockNumber = blockNumber;
        keyData[_shop].blockHash_ = blockHash;
        keyData[_shop].blocktimestamp = block.timestamp;
        keyData[_shop].thisAddress = address(this);
        keyData[_shop].amount = _amount;
        return keccak256(abi.encodePacked(_address, _shop, blockNumber, blockHash, block.timestamp, address(this), _key));
    }

    function checkPrivateKey(bytes32 _key, address _address) public view onlyOwner returns(bool){
        //mag.sender is who ask to check the key (Shop) => msg.sender = _shop
        require(keyData[_address].blocktimestamp > 0, "The Key is expired");
        require(keccak256(abi.encodePacked(_address, msg.sender, keyData[_address].blockNumber, keyData[_address].blockHash_, keyData[_address].blocktimestamp, keyData[_address].thisAddress,  _key)) == _key);
        return true;
    }

    function withdrawShop(bytes32 _key1, bytes32 _key2) public payable onlyOwner returns(bool){
        require(checkPrivateKey(_key1, owner));
        require(checkPrivateKey(_key2, owner));
        owner.transfer(keyData[owner].amount);
    }

    function clearKeydata(address _address) private returns(bool){
        //only when I'm notified about the correct transaction
        keyData[_address].blockNumber = 0;
        keyData[_address].blockHash_ = bytes32("0");
        keyData[_address].blocktimestamp = 0;
        keyData[_address].thisAddress = address(0x0);
        keyData[_address].amount = 0;

    }

    function newPublicKey(address payable _who, uint _amount, bytes32 _privateKey, address _beneficiary) public payable onlyOwner returns(bool){
        setRestricted(false);
        require(isComplex(_privateKey));
        publicKey[_beneficiary] = generatePublicKey(_who, _amount, _privateKey, _beneficiary);
        setRestricted(true); 
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

    function generateKeys(address _shop, bytes32 OTP1, bytes32 OTP2) public payable onlyOwner returns(bool A2B, bool A2C){
        return (newPublicKey(owner, 0, OTP1, _shop), newPublicKey(owner, msg.value, OTP2, _shop));
    }


}