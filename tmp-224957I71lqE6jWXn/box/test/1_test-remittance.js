const Remittence = artifacts.require("./Remittance.sol");
const expectedExceptionPromise = require("./util/expected_exception_testRPC_and_geth.js");

contract("Remittence", accounts => {

    console.log(accounts);
    
    let sender, shop;
    let remittence;

    before("Should Set Accounts", async () => {
        assert.isAtLeast(accounts.length, 2, 'There should be at least 2 accounts to do this test');
        remitternce = await Remittence.new();
        sender = accounts[0];
        shop = accounts[1];
        if(showLog) console.log("----------------------------------------");
        if(showLog) console.log("Sender Address: " + sender);
        if(showLog) console.log("Shop Address: " + beneficiary1);
    });

});