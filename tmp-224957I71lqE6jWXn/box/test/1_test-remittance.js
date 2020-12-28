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
    
    describe("#SingleUnitTest", function() {

        it("Check Max Fee Owner", () => {
                assert(OWNER_FEE <= contractCost, "Owner fee has to be less than the price in case the exchanger would like to deploy the contract by himself");
        });
        
        it("Owner Should Set new Owner Fee", async function() {
            const percentageFee = 5;
            assert(percentageFee >= 0 && percentageFee <= 100);
            const fee = Math.floor(contractCost * percentageFee / 100);
            const txObj = await remittance.setOwnerFee(fee, {from : owner}); //5 % of the contract cost
            assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
            assert.strictEqual(txObj.logs[0].args.amount.toString(10), fee.toString(10), "Fee Dismatch");
        });

        
        it("Non Owner Should not Set new Owner Fee", async function() {
            var result = false;
            try {
                const percentageFee = 5;
                assert(percentageFee >= 0 && percentageFee <= 100);
                const fee = Math.floor(contractCost * percentageFee / 100);
                const txObj = await remittance.setOwnerFee(fee, {from : stranger}); //5 % of the contract cost
                assert.strictEqual(txObj.logs[0].args.owner.toString(10), stranger.toString(10), "Owner Dismatch");
                assert.strictEqual(txObj.logs[0].args.amount.toString(10), fee.toString(10), "Fee Dismatch");
            } catch {
                result = true;
            }
            assert(result);
        });

        it("Owner should Set a new Min/Max Duration", async function() {
            const addDurationValue = 1;
            const txObj = await remittance.changeDurationInterval(MIN_BLOCK_DURATION + addDurationValue, MAX_BLOCK_DURATION + addDurationValue, {from : owner});
            assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
            assert.strictEqual(txObj.logs[0].args.min.toString(10), (MIN_BLOCK_DURATION + addDurationValue).toString(10), "Min Value Dismatch");
            assert.strictEqual(txObj.logs[0].args.max.toString(10), (MAX_BLOCK_DURATION + addDurationValue).toString(10), "Max Value Dismatch");
        });

        it("Non Owner Should not Set a new Min/Max Duration", async function() {
            var result = false;
            try {
                const addDurationValue = 1;
                const txObj = await remittance.changeDurationInterval(MIN_BLOCK_DURATION + addDurationValue, MAX_BLOCK_DURATION + addDurationValue, {from : stranger});
                assert.strictEqual(txObj.logs[0].args.owner.toString(10), owner.toString(10), "Owner Dismatch");
                assert.strictEqual(txObj.logs[0].args.min.toString(10), (MIN_BLOCK_DURATION + addDurationValue).toString(10), "Min Value Dismatch");
                assert.strictEqual(txObj.logs[0].args.max.toString(10), (MAX_BLOCK_DURATION + addDurationValue).toString(10), "Max Value Dismatch");
            } catch {
                result = true;
            }
            assert(result);
        });


        it("Send Fund and Generate Keys", async function() {
            const currentSenderBalance = await web3.eth.getBalance(sender);
            assert(amount <= currentSenderBalance);
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
            assert.strictEqual(txObj.logs[0].args.publicKey, web3.utils.soliditySha3(sender, exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER), "Public Key doesn't match the right value");
        });

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
        });

        it("Owner withdraws his fund", async function () {
            const currentBalance_before = await web3.eth.getBalance(owner);
            if(showLog) console.log("balance Owner account before withdraw: " + currentBalance_before);
            const txObj = await remittance.withdrawOwnerFees({from : owner});
            assert.strictEqual(txObj.logs[0].args.owner, owner, "Owner Dismatch");
            if(showLog) console.log("Owner Fee: " + txObj.logs[0].args.amount.toString(10));
            const currentBalance_after = await web3.eth.getBalance(owner);
            if(showLog) console.log("balance Owner account after withdraw: " + currentBalance_after);
        });

        
        it("Stranger can't withdraws Owner fund", async function () {
            var result = false;
            try {
                const currentBalance_before = await web3.eth.getBalance(owner);
                const txObj = await remittance.withdrawOwnerFees({from : owner});
                assert.strictEqual(txObj.logs[0].args.owner, owner, "Owner Dismatch");
            } catch {
                result = true;
            }
            assert(result);
        });

        
        it("Can Change Owner", async function () {
            const txObj = await remittance.changeOwner(new_owner, {from : owner});
            assert.strictEqual(txObj.logs[0].args.newOwner, new_owner, "Owner Dismatch");
        });

        it("Stranger can't Change Owner", async function () {
            var result = false;
            try {
            const txObj = await remittance.changeOwner(stranger, {from : stranger});
            assert.strictEqual(txObj.logs[0].args.newOwner, stranger, "Owner Dismatch");
            } catch {
                result = true;
            }
            assert(result);
        });

        it("Owner Can Switch Stoppable", async function () {
            const txObj = await remittance.runSwitch(true, {from : new_owner});
            assert.strictEqual(txObj.logs[0].args.switchSetting, true, "Switch Dismatch");
        });

        it("Stranger can't Switch Stoppable", async function () {
            var result = false;
            try {
            const txObj = await remittance.runSwitch(stranger, {from : stranger});
            assert.strictEqual(txObj.logs[0].args.newOwner, stranger, "Switch Dismatch");
            } catch {
                result = true;
            }
            assert(result);
        });
    });

    // ----------------------------------------------------------------------------------------------- MASSIVE TEST (FROM DATASET) 

    let TP_list = []; 
    let TN_list = []; 
    let FP_list = []; //Every test that goes here has to be checked 
    let FN_list = []; //Every test that goes here has to be checked 

    //    ### NOT OVER ###

     //  ## WE HAVE TO CREATE A CONFUSION MATRIX TO ANALYZE WELL OUR MASSIVE TEST RESPONSE ##

    counter = 0;
    //owner = new_owner;


    describe("#Remittance_massive_test(isValid, amount, min, max, fee)", function () {

        // ----------------------------------------------------------------------------------------------- DEFINE DATASET

        console.log(new_owner);
        console.log(owner);
        let datasets_istance = require("./dataSet.js"); 
        const datasets = new datasets_istance(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, DURATION_BLOCK);
        let example_index_valid, example_index_invalid;

        if(showDataset) console.log(" ########## DATASET INFO ##########");
        for(let i = 0; i < datasets.length; i++) {
            if(datasets[i].isValid) {
                example_index_valid = i;
                counter++; 
            }
        }

        if(showDataset && counter != 1) console.log(" + POSITIVE TEST: " + counter);

        counter = 0;

        for(let i = 0; i < datasets.length; i++) {
            if(!datasets[i].isValid) {
                example_index_invalid = i;
                counter++; 
            }
        }
        
        if(showDataset && counter != 1) console.log(" - NEGATIVE TEST: " + counter);

        counter = 0;

        if(showDataset) console.log(" ------- VALID DATASET EXAMPLE");
        if(showDataset) console.log(" Fee:" + datasets[example_index_valid].fee);
        if(showDataset) console.log(" Amount:" + datasets[example_index_valid].amount);
        if(showDataset) console.log(" Min Block Value:" + datasets[example_index_valid].min);
        if(showDataset) console.log(" Max Block Value:" + datasets[example_index_valid].max);
        if(showDataset) console.log(" ------- INVALID DATASET EXAMPLE");
        if(showDataset) console.log(" Fee:" + datasets[example_index_invalid].fee);
        if(showDataset) console.log(" Amount:" + datasets[example_index_invalid].amount);
        if(showDataset) console.log(" Min Block Value:" + datasets[example_index_invalid].min);
        if(showDataset) console.log(" Max Block Value:" + datasets[example_index_invalid].max);

        let result;
        var txObj;

        datasets.forEach(test => {
            if(counter > 0) { //LOGIC NULL SET

                //if(counter > 1035) return; //Sample test
                let pos_neg_test;
                
                if(test.isValid) pos_neg_test = "Positive TEST"; else pos_neg_test = "Negative TEST";

                it("ID: " + counter + ")" + pos_neg_test + "(isValid, amount, min, max, fee) => " + `(${test.isValid}, ${test.amount}, ${test.min}, ${test.max}, ${test.fee})`, async function () {
                    
                        result = false;

                        try {

                        
                            // ------------------------------------- Owner Set Fee (Indipendently from Contract Cost)

                            txObj = await remittance.setOwnerFee(test.fee, {from : new_owner});
                            assert.strictEqual(txObj.logs[0].args.owner.toString(10), new_owner.toString(10), "Owner Dismatch");
                            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.amount).toString(10), web3.utils.toBN(test.fee).toString(10), "Fee Dismatch");

                            // ------------------------------------- Change Duration

                            txObj = await remittance.changeDurationInterval(test.min, test.max, {from : new_owner});
                            assert.strictEqual(txObj.logs[0].args.owner.toString(10), new_owner.toString(10), "Owner Dismatch");
                            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.min).toString(10), web3.utils.toBN(test.min).toString(10), "Min Value Dismatch");
                            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.max).toString(10).toString(10), web3.utils.toBN(test.max).toString(10), "Max Value Dismatch");

                            // ------------------------------------ Send Fund and Generate keys

                            txObj = await remittance.sendFundAndGenerateKey(exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER, DURATION_BLOCK, {from : sender, value : test.amount});
                            assert.strictEqual(txObj.logs[0].args.sender, sender);
                            fee = web3.utils.toBN(txObj.logs[0].args.fee);
                            assert.strictEqual(txObj.logs[0].args.amount.toString(10), (test.amount - test.fee).toString(10));
                            assert.strictEqual(txObj.logs[0].args.exchanger, exchanger);
                            assert.strictEqual(txObj.logs[0].args.publicKey, web3.utils.soliditySha3(sender, exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER), "Public Key doesn't match the right value");
                    
                            // ------------------------------------ Withdraw Fund - From exchanger

                            txObj = await remittance.checkKeysAndWithdrawAmount(sender, exchanger, PRIVATE_KEY_BENEFICIARY, PRIVATE_KEY_EXCHANGER, {from : exchanger});
                            assert.strictEqual(txObj.logs[0].args.who, exchanger);
                            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.amount).toString(10), web3.utils.toBN((test.amount - fee)).toString(10));
                        
                            // ------------------------------------ Owner withdraws his fund

                            txObj = await remittance.withdrawOwnerFees({from : new_owner});
                            assert.strictEqual(txObj.logs[0].args.owner, new_owner, "Owner Dismatch");

                            if(test.isValid) {
                                TP_list.push(counter);
                                result = true;
                                } else {
                                    FP_list.push(counter); 
                                }

                        } catch(e) {

                            if(!test.isValid) {
                                TN_list.push(counter); 
                                result = true;
                            } else {
                                console.log(e);
                                FN_list.push(counter);
                            }

                        } 
                        
                        assert(result, "Error on Test");
                        if(!result) return;
                    });
                    

                }
                
                counter++;
          
        })

        it("Confusion Matrix Check", () => {
            console.log("TP: " + TP_list.length);
            console.log("TN: " + TN_list.length);
            console.log("FP: " + FP_list.length);
            console.log("FN: " + FN_list.length);
            assert(FP_list.length == 0 && FN_list.length == 0, "Confusion matrix has bad results!");
        });
    })


      
    
})

