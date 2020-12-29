const Remittance = artifacts.require("./Remittance.sol");

const expectedExceptionPromise = require("./util/expected_exception_testRPC_and_geth.js");

contract("Remittance", accounts => {

    console.log(accounts);
    
    //const MAX_GAS                   = 2000000000;
    const OWNER_FEE                 = 1500000000
    const MIN_BLOCK_DURATION        = 1;
    const MAX_BLOCK_DURATION        = 18;
    const PRIVATE_KEY_BENEFICIARY   = "One-Time-Password1";
    const PRIVATE_KEY_EXCHANGER     = "One-Time-Password2";
    //const GETH_SLOW_DURATION        = 90000;
    const DURATION_BLOCK            = 15;
    let showLog                     = true;             //Only to show results data
    let showFullLog                 = false;         //Only to show full transaction data
    let showDataset                 = true;         //Only to show test dataset

    //let runDatasetTest              = false;     //It needs a lot of time! Be careful.
    let counter                     = 0; 
    let current_owner_balance;
    let contractCost;

    let sender, exchanger, stranger;
    let remittance;
    
    let amount = 5000000000000000;
    let owner, new_owner;

    let TP = 0; 
    let TN = 0; 
    let FP = 0; //Every test that goes here has to be checked 
    let FN = 0; //Every test that goes here has to be checked 

    // ----------------------------------------------------------------------------------------------- BEFORE 

    before("Should Set Accounts", async () => {
        assert.isAtLeast(accounts.length, 4, 'There should be at least 4 accounts to do this test');
        sender = accounts[0];
        owner = sender,
        exchanger = accounts[1];
        new_owner = accounts[2];
        stranger = accounts[3];
        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, {from : owner});
        txReceipt = await web3.eth.getTransactionReceipt(remittance.transactionHash);
        const gasPrice = await web3.eth.getGasPrice();
        const gasCost = gasPrice * txReceipt.gasUsed;
        contractCost = gasCost;
        current_owner_balance = await web3.eth.getBalance(new_owner); //For massive test purpouse
        console.log(" ########## CONTRACT TRANSACTION DATA ##########");
        console.log("Transaction Hash: " + remittance.transactionHash);
        console.log("Gas Price: " + gasPrice);
        console.log("Gas Used: " + txReceipt.gasUsed);
        console.log("Contract Gas Cost (Wei): " + gasCost);
        console.log("Actual Owner Fee: " + OWNER_FEE);
    });


    // ----------------------------------------------------------------------------------------------- SINGLE TESTS 
    
    async function Check_Fee(_fee){

            assert(_fee <= contractCost, "Owner fee has to be less than the price in case the exchanger would like to deploy the contract by himself");

    }

    async function Owner_Should_Set_New_Owner_Fee(_fee, _owner) {

            const txObj = await remittance.setOwnerFee(_fee, {from : _owner}); 
            assert.strictEqual(txObj.logs[0].args.owner.toString(10), _owner.toString(10), "Owner Dismatch");
            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.amount).toString(10), web3.utils.toBN(_fee).toString(10), "Fee Dismatch");

    }

    async function Owner_Should_Set_A_New_MinMax_Duration(_min, _max, _owner){

            const txObj = await remittance.changeDurationInterval(_min, _max, {from : _owner});
            assert.strictEqual(txObj.logs[0].args.owner.toString(10), _owner.toString(10), "Owner Dismatch");
            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.min).toString(10), web3.utils.toBN(_min).toString(10), "Min Value Dismatch");
            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.max).toString(10), web3.utils.toBN(_max).toString(10), "Max Value Dismatch");

    }
    
    async function Send_Fund_And_Generate_Keys(_sender, _exchanger, _amount, _otp1, _otp2, _duration){

            const currentSenderBalance = await web3.eth.getBalance(_sender);
            assert(_amount <= currentSenderBalance);
            const txObj = await remittance.sendFundAndGenerateKey(_exchanger, _otp1, _otp2, _duration, {from : _sender, value : _amount});
            if(showFullLog) console.log("------------------------ txObj: ");
            if(showFullLog) console.log(txObj);
            if(showFullLog) console.log("------------------------ txObj.logs[0]: ");
            if(showFullLog) console.log(txObj.logs[0]);
            assert.strictEqual(txObj.logs[0].args.sender.toString(10), _sender.toString(10));
            fee = web3.utils.toBN(txObj.logs[0].args.fee);
            if(showLog) console.log("Fee: " + fee);
            assert.strictEqual(txObj.logs[0].args.amount.toString(10), (web3.utils.toBN(_amount) - fee).toString(10));
            assert.strictEqual(txObj.logs[0].args.exchanger.toString(10), _exchanger.toString(10));
            assert.strictEqual(txObj.logs[0].args.publicKey, web3.utils.soliditySha3(_sender, _exchanger, _otp1, _otp2), "Public Key doesn't match the right value");

    }
    
    async function Withdraw_From_Exchanger(_exhanger, _sender, _otp1, _otp2) {
        
            const currentBalance_before = await web3.eth.getBalance(_exchanger);
            if(showLog) console.log("balance exchanger account before withdraw: " + currentBalance_before);
            const txObj = await remittance.checkKeysAndWithdrawAmount(_sender, _exchanger, _otp1, _otp2, {from : _exchanger});
            if(showFullLog) console.log("------------------------ txObj: ");
            if(showFullLog) console.log(txObj);
            if(showFullLog) console.log("------------------------ txObj.logs[0]: ");
            if(showFullLog) console.log(txObj.logs[0]);
            assert.strictEqual(txObj.logs[0].args.who.toString(10), _exchanger.toString(10));
            assert.strictEqual(txObj.logs[0].args.amount.toString(10),(web3.utils.toBN(_amount) - fee).toString(10));
            const currentBalance_after = await web3.eth.getBalance(_exchanger);
            if(showLog) console.log("balance exchanger account after withdraw: " + currentBalance_after);

    }

    async function Owner_Withdraw_Own_Fund(_owner) {
        
            const currentBalance_before = await web3.eth.getBalance(_owner);
            if(showLog) console.log("balance Owner account before withdraw: " + currentBalance_before);
            const txObj = await remittance.withdrawOwnerFees({from : _owner});
            assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
            if(showLog) console.log("Owner Fee: " + txObj.logs[0].args.amount.toString(10));
            const currentBalance_after = await web3.eth.getBalance(owner);
            if(showLog) console.log("balance Owner account after withdraw: " + currentBalance_after);

    }

    async function Can_Change_Owner(_owner, _new_owner){

            const txObj = await remittance.changeOwner(_new_owner, {from : _owner});
            assert.strictEqual(txObj.logs[0].args.newOwner.toString(10), new_owner.toString(10), "Owner Dismatch");
    }


    async function Owner_Can_Change_Stoppable(_bool, _owner){

            const txObj = await remittance.runSwitch(_bool, {from : _owner});
            assert.strictEqual(txObj.logs[0].args.switchSetting, true, "Switch Dismatch");

    }

    describe("#Remittance_massive_test(isValid, amount, fee, min, max, duration)", function () {

        // ----------------------------------------------------------------------------------------------- DEFINE DATASET

        let datasets_istance = require("./dataSet.js"); 
        const datasets = new datasets_istance(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, DURATION_BLOCK, contractCost);
        const VALID_DATASET = datasets[0];
        const INVALID_DATASET = datasets[1];
        
       console.log(" ########## DATASET INFO ##########");

        if(VALID_DATASET.length != 0) console.log(" + POSITIVE TEST: " + VALID_DATASET.length);
        
        if(INVALID_DATASET.length != 0) console.log(" - NEGATIVE TEST: " + INVALID_DATASET.length);

                counter = 0;

        // ----------------------------------------------------------------------------------------------- POSITIVE TEST

        console.log(" ########## POSITIVE TEST ##########");  

        console.log(owner);
                it("Can Change Owner", () => Can_Change_Owner(new_owner, owner));
                it("Owner Change Stoppable", () => Owner_Can_Change_Stoppable(true, new_owner));

                VALID_DATASET.forEach(test => {
                    it("ID: " + ++counter + ") Positive TEST (isValid, amount, min, max, fee) => " + `(${test.isValid}, ${test.fee}, ${test.amount}, ${test.min}, ${test.max}, ${test.duration})`, async function () {
                        
                                it("Check Max Fee Owner", () => Check_Fee(test.fee));
                                it("Owner Should Set New Owner Fee", () => Owner_Should_Set_New_Owner_Fee(test.fee, new_owner));
                                it("Owner should Set a new Min/Max Duration", () => Owner_Should_Set_A_New_MinMax_Duration(test.min, test.max, new_owner));
                                it("Send Fund and Generate Keys", () => Send_Fund_And_Generate_Keys(new_owner, exchanger, test.amount, test.otp1, test.otp2, test.duration))
                                it("Withdraw Fund - From exchanger", () => Withdraw_From_Exchanger(exchanger, sender, test.otp1, test.otp2))
                                it("Owner withdraws his fund", () => Owner_Withdraw_Own_Fund(new_owner))

                        });
                    })        
                    
        // ----------------------------------------------------------------------------------------------- NEGATIVE TEST

        console.log(" ########## NEGATIVE TEST ##########"); 

        it("Stranger Can Change Owner", () => Can_Change_Owner(stranger, stranger));
        it("Stranger Change Stoppable", () => Owner_Can_Change_Stoppable(true, stranger));

        INVALID_DATASET.forEach(test => {
            it("ID: " + ++counter + ") Negative TEST (isValid, amount, min, max, fee) => " + `(${test.isValid}, ${test.fee}, ${test.amount}, ${test.min}, ${test.max}, ${test.duration})`, async function () {
                
                        it("Check Max Fee Owner", () => Check_Fee(test.fee));
                        it("Owner Should Set New Owner Fee", () => Owner_Should_Set_New_Owner_Fee(test.fee, new_owner));
                        it("Owner should Set a new Min/Max Duration", () => Owner_Should_Set_A_New_MinMax_Duration(test.min, test.max, new_owner));
                        it("Send Fund and Generate Keys", () => Send_Fund_And_Generate_Keys(new_owner, exchanger, test.amount, test.otp1, test.otp2, test.duration))
                        it("Withdraw Fund - From exchanger", () => Withdraw_From_Exchanger(exchanger, sender, test.otp1, test.otp2))
                        it("Owner withdraws his fund", () => Owner_Withdraw_Own_Fund(owner))

                });
            })
    })             
       
   
    
      
    
})