const Remittance = artifacts.require("./Remittance.sol");
const expectedExceptionPromise = require("./util/expected_exception_testRPC_and_geth.js");

contract("Remittance", accounts => {

    console.log(accounts);
    
    const MAX_GAS                   = 2000000;
    const OWNER_FEE                 = 15000000000000;
    const MIN_BLOCK_DURATION        = 1;
    const MAX_BLOCK_DURATION        = 18;
    const PRIVATE_KEY_BENEFICIARY   = "One-Time-Password1";
    const PRIVATE_KEY_EXCHANGER     = "One-Time-Password2";
    const GETH_SLOW_DURATION        = 90000;
    const DURATION_BLOCK            = 15;
    let showLog = true;
    let showFullLog = true;
    let contractCreationCost;
    let sender, exchanger;
    let remittance;
    
    let amount = 5000000000000000;
    let owner, new_owner;

    before("Should Set Accounts", async () => {
        assert.isAtLeast(accounts.length, 3, 'There should be at least 3 accounts to do this test');
        remittance = await Remittance.new();
        sender = accounts[0];
        owner = sender,
        exchanger = accounts[1];
        new_owner = accounts[2];
    });

    it("Should Set Min/Max Duration", async function() {
        const txObj = await remittance.changeDurationInterval(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, {from : owner, gas : MAX_GAS});
        assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
        assert.strictEqual(txObj.logs[0].args.min.toString(10), MIN_BLOCK_DURATION.toString(10), "Min Value Dismatch");
        assert.strictEqual(txObj.logs[0].args.max.toString(10), MAX_BLOCK_DURATION.toString(10), "Max Value Dismatch");
    })

    it("Should Set Owner Fee", async function() {
        const txObj = await remittance.setOwnerFee(OWNER_FEE, {from : owner});
        assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), OWNER_FEE.toString(10), "Fee Dismatch");
    })

    it("Send Fund and Generate Keys", async function() {
        const txObj = await remittance.sendFundAndGenerateKey(exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER, DURATION_BLOCK, {from : sender, value : amount});
        if(showFullLog) console.log("------------------------ txObj: ");
        if(showFullLog) console.log(txObj);
        if(showFullLog) console.log("------------------------ txObj.logs[0]: ");
        if(showFullLog) console.log(txObj.logs[0]);
        assert.strictEqual(txObj.logs[0].args.sender, sender);
        fee = txObj.logs[0].args.fee;
        if(showLog) console.log("Fee: " + fee);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), (amount - fee).toString(10));
        assert.strictEqual(txObj.logs[0].args.exchanger, exchanger);
    })

    it("Withdraw Fund - From exchanger", async function() {
        const currentBalance_before = await web3.eth.getBalance(exchanger);
        if(showLog) console.log("balance exchanger account before withdraw: " + currentBalance_before);
        const txObj = await remittance.checkKeysAndWithdrawAmount(sender, exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER, {from : exchanger});
        if(showFullLog) console.log("------------------------ txObj: ");
        if(showFullLog) console.log(txObj);
        if(showFullLog) console.log("------------------------ txObj.logs[0]: ");
        if(showFullLog) console.log(txObj.logs[0]);
        assert.strictEqual(txObj.logs[0].args.who, exchanger);
        assert.strictEqual(txObj.logs[0].args.amount.toString(10), (amount - fee).toString(10));
        const currentBalance_after = await web3.eth.getBalance(exchanger);
        if(showLog) console.log("balance exchanger account after withdraw: " + currentBalance_after);
    })

    it("Owner withdraws his fund", async function () {
        const currentBalance_before = await web3.eth.getBalance(owner);
        if(showLog) console.log("balance exchanger account before withdraw: " + currentBalance_before);
        const txObj = await remittance.withdrawOwnerFees({from : owner});
        assert.strictEqual(txObj.logs[0].args.owner, owner, "Owner Dismatch");
        if(showLog) console.log(txObj.logs[0].args.amount.toString(10));
        const currentBalance_after = await web3.eth.getBalance(owner);
        if(showLog) console.log("balance exchanger account after withdraw: " + currentBalance_after);
    })

});