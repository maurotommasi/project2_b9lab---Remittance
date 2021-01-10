const Remittance = artifacts.require("./Remittance.sol");

contract("Remittance", accounts => {

    console.log(accounts);
    
    const REMITTANCE_STATUS         = {Null:0, Created:1, Checked:2, Expired:3};
    const OWNER_FEE                 = web3.utils.toBN(web3.utils.toWei('500', "gwei"));
    const MIN_BLOCK_DURATION        = 1;
    const MAX_BLOCK_DURATION        = 18;
    const SECRET_BENEFICIARY        = web3.utils.soliditySha3("One-Time-Password1");
    const SECRET_EXCHANGER          = web3.utils.soliditySha3("One-Time-Password2");
    const DURATION_BLOCK            = 15;
    const AMOUNT                    = web3.utils.toBN(web3.utils.toWei('1', "ether"));

    const INVALID_BYTES32           = [web3.utils.soliditySha3(""), web3.utils.soliditySha3("0"), web3.utils.soliditySha3(0)];
    const INVALID_DURATION          = [MIN_BLOCK_DURATION - 1, MAX_BLOCK_DURATION + 1]
    const INVALID_SECRET            = web3.utils.soliditySha3("Invalid-Secret");
    //const INVALID_MIN_VALUE         = MIN_BLOCK_DURATION - 1;
    const INVALID_MAX_VALUE         = MAX_BLOCK_DURATION + 1;

    let contractCost;

    let owner, sender, exchanger, stranger, stranger_2, stranger_3;
    let remittance;

    // ----------------------------------------------------------------------------------------------- BEFORE 
    
    function matchError(solidityExpectedError, e, showData = false){
        const r = " -- Reason given: ";
        const javascriptError = e.toString().substring(e.toString().indexOf(r) + r.length, e.toString().length - 1);
        assert.strictEqual(solidityExpectedError, javascriptError, "Predicted errors dismatch!");
        if(showData){
            console.log("Solidity Error: " + solidityExpectedError);
            console.log("Truffle Javascript Error: " + javascriptError);
        }
        return true;
    }

    before("Should Set Accounts", async () => {

        assert.isAtLeast(accounts.length, 4, 'There should be at least 4 accounts to do this test');

        [owner, sender, exchanger, stranger, stranger_2, stranger_3] = accounts;

        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, {from : owner});

        txReceipt = await web3.eth.getTransactionReceipt(remittance.transactionHash);
        const gasPrice = await web3.eth.getGasPrice();
        const gasCost = gasPrice * txReceipt.gasUsed;
        contractCost = gasCost;

        console.log(" ########## CONTRACT TRANSACTION DATA ##########");
        console.log("Transaction Hash: ", remittance.transactionHash);
        console.log("Gas Price: ", gasPrice);
        console.log("Gas Used: ", txReceipt.gasUsed);
        console.log("Contract Gas Cost (Wei): ", gasCost);
        console.log("Actual Owner Fee: ", OWNER_FEE);

        console.log(" ########## TEST DATA ##########");
        console.log("Owner Fee: ", OWNER_FEE);
        console.log("Min Block Duration: ", MIN_BLOCK_DURATION);
        console.log("Max Block Duration: ", MAX_BLOCK_DURATION);
        console.log("Secret Password Beneficiary: ", SECRET_BENEFICIARY);
        console.log("Secret Password Exchanger ", SECRET_EXCHANGER);
        console.log("Valid Duration Block for this interval: ", DURATION_BLOCK);

        // BYTES32 CHECK DATA

        assert.strictEqual(INVALID_BYTES32[0], INVALID_BYTES32[1]);
        assert.strictEqual(INVALID_BYTES32[0], INVALID_BYTES32[2]);

        console.log("Invalid Bytes32 Data: ", INVALID_BYTES32[0]);
        console.log("Invalid Durations: ,", INVALID_DURATION);
    });
    
    beforeEach("New Istance of Remittance", async () => {
        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, {from : owner});
    });

    it("Check Max Fee Owner", () => {
        assert(OWNER_FEE <= contractCost, "Owner fee has to be less than the price in case the exchanger would like to deploy the contract by himself");
    });

    // ----------------------------------------------------------------------------------------------- REQUIREMENTS UNIT TESTS 

    describe("#Requirements Unit Tests - Fail Cases", async function() {

        it("Remittance.generatePublicKey#001 : Beneficiary's Private Key can't be null", async function() {
            try {
                assert(await remittance.generatePublicKey(sender, exchanger, INVALID_BYTES32[0], SECRET_EXCHANGER, {from : sender}));
            } catch(e) {
                assert(matchError("Remittance.generatePublicKey#001 : Beneficiary's Private Key can't be null", e));
            }
        })

        it("Remittance.generatePublicKey#002 : Exchanger's Private Key can't ber null", async function() {
            try {
                assert(await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, INVALID_BYTES32[0], {from : sender}));
            } catch(e) {
                assert(matchError("Remittance.generatePublicKey#002 : Exchanger's Private Key can't ber null", e));
            }
        })
        
        it("Remittance.addFund#001 : msg.value can't be 0", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : 0}));
            } catch(e) {
                assert(matchError("Remittance.addFund#001 : msg.value can't be 0", e));
            }
        })

        INVALID_DURATION.forEach(invalidDurationValue => {
            it("Remittance.addFund#002 : Duration doesn't match the interval. Duration Value = " + invalidDurationValue, async function() {
                try {
                    const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                    assert(await remittance.addFund(exchanger, publicSecret, invalidDurationValue, {from : sender, value : AMOUNT}));
                } catch(e) {
                    assert(matchError("Remittance.addFund#002 : Duration doesn't match the interval", e));
                }
            })
        })

        it("Remittance.addFund#003 : Remittance State has to be Null", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
            } catch(e) {
                assert(matchError("Remittance.addFund#003 : Remittance State has to be Null", e));
            }
        })
        
        it("Remittance.addFund#004 : Msg.value has to be greater than owner fee", async function() {

            const invalidAmount = OWNER_FEE - 1;

            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : invalidAmount}));
            } catch(e) {
                assert(matchError("Remittance.addFund#004 : Msg.value has to be greater than owner fee", e));
            }
        })

        it("Remittance.checkKeys#001 : Addresses Dismatch", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret, {from : stranger}));
            } catch(e) {
                assert(matchError("Remittance.checkKeys#001 : Addresses Dismatch", e));
            }
        })

        it("Remittance.checkKeys#002 : Incorrect Data", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.checkKeys(INVALID_SECRET, SECRET_EXCHANGER, publicSecret, {from : exchanger}));
            } catch(e) {
                assert(matchError("Remittance.checkKeys#002 : Incorrect Data", e));
            }
        })

        it("Remittance.checkKeys#003 : Remittance state has to be created or already checked", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret, {from : exchanger}));
                assert(await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret, {from : exchanger}));
            } catch(e) {
                assert(matchError("Remittance.checkKeys#003 : Remittance state has to be created or already checked", e));
            }
        })

        it("Remittance.checkKeys#004 : Expiration Block Dismatch", async function() {

            const shortDuration = 1

            try {
                const publicSecret_1 = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret_1, shortDuration, {from : sender, value : AMOUNT}));

                // Some new blocks

                const publicSecret_2 = await remittance.generatePublicKey(stranger, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger});
                assert(await remittance.addFund(exchanger, publicSecret_2, DURATION_BLOCK, {from : stranger, value : AMOUNT})); 

                const publicSecret_3 = await remittance.generatePublicKey(owner, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : owner});
                assert(await remittance.addFund(exchanger, publicSecret_3, DURATION_BLOCK, {from : owner, value : AMOUNT}));

                //Will fail if it works!

                assert(!(await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret_1, {from : exchanger}))); 

            } catch(e) {
                assert(matchError("Remittance.checkKeys#004 : Expiration Block Dismatch", e));
            }
        })

        it("Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function", async function() {

            const shortDuration = 1

            try {
                const publicSecret_1 = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret_1, shortDuration, {from : sender, value : AMOUNT}));

                // Some new blocks

                const publicSecret_2 = await remittance.generatePublicKey(stranger, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger});
                assert(await remittance.addFund(exchanger, publicSecret_2, DURATION_BLOCK, {from : stranger, value : AMOUNT})); 

                const publicSecret_3 = await remittance.generatePublicKey(owner, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : owner});
                assert(await remittance.addFund(exchanger, publicSecret_3, DURATION_BLOCK, {from : owner, value : AMOUNT}));

                assert(await remittance.withdrawExpiredRemittance(publicSecret_1, {from : stranger})); 
            } catch(e) {
                assert(matchError("Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function", e));
            }
        })

        it("Remittance.withdrawExpiredRemittance#002 : Exhanger withdrawed yet or Remittance not created", async function() {

            const shortDuration = 3

            try {
                const publicSecret_1 = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret_1, shortDuration, {from : sender, value : AMOUNT}));

                assert(await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret_1, {from : exchanger})); // exchanger check keys

                 // Some new blocks

                 const publicSecret_4 = await remittance.generatePublicKey(stranger_2, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger_2});
                 assert(await remittance.addFund(exchanger, publicSecret_4, DURATION_BLOCK, {from : stranger_2, value : AMOUNT})); 
 
                 const publicSecret_5 = await remittance.generatePublicKey(stranger_3, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger_3});
                 assert(await remittance.addFund(exchanger, publicSecret_5, DURATION_BLOCK, {from : stranger_3, value : AMOUNT}));

                 // after expiration block

                assert(await remittance.withdrawExpiredRemittance(publicSecret_1, {from : sender})); 

            } catch(e) {
                assert(matchError("Remittance.withdrawExpiredRemittance#002 : Exhanger withdrawed yet or Remittance not created", e));
            }
        })

        it("Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch", async function() {

            const shortDuration = 5;

            try {
                const publicSecret_1 = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret_1, shortDuration, {from : sender, value : AMOUNT}));

                 // before expiration block

                assert(await remittance.withdrawExpiredRemittance(publicSecret_1, {from : sender})); 

            } catch(e) {
                assert(matchError("Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch", e));
            }
        })

        it("Remittance.withdrawBalance#001 : Balance can't be equal to 0", async function() {
            try {
                const strangerBalance = await remittance.balances.call(stranger);
                assert.strictEqual(web3.utils.toBN(strangerBalance).toString(10), web3.utils.toBN(0).toString(10), "Balance is not 0");
                assert(await remittance.withdrawBalance({from : sender}));
            } catch(e) {
                assert(matchError("Remittance.withdrawBalance#001 : Balance can't be equal to 0", e));
            }
        })

        it("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", async function() {
            try {
                const maxDuration = await remittance.max_duration.call(); 
                assert(INVALID_MAX_VALUE > maxDuration);
                assert(await remittance.changeMinDurationInterval(INVALID_MAX_VALUE, {from : owner}));
            } catch(e) {
                assert(matchError("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", e));
            }
        })

        it("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            try {
                const minDuration = await remittance.min_duration.call();
                assert(minDuration == MIN_BLOCK_DURATION);
                assert(await remittance.changeMinDurationInterval(MIN_BLOCK_DURATION, {from : owner}));
                assert(await remittance.changeMinDurationInterval(0, {from : sender}));
            } catch(e) {
                assert(matchError("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", e));
            }
        })

        it("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", async function() {
            try {
                const minDuration = await remittance.min_duration.call();
                assert(INVALID_MAX_VALUE > minDuration);
                assert(await remittance.changeMaxDurationInterval(INVALID_MAX_VALUE, {from : owner}));
            } catch(e) {
                assert(matchError("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", e));
            }
        })

        it("Remittance.changeMaxDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            try {
                const maxDuration = await remittance.max_duration.call();
                assert(maxDuration == MAX_BLOCK_DURATION);
                assert(await remittance.changeMaxDurationInterval(MAX_BLOCK_DURATION, {from : owner}));
            } catch(e) {
                assert(matchError("Remittance.changeMaxDurationInterval#002 : Values are already set", e));
            }
        })

        it("Remittance.setOwnerFee#001 : This fee is already set", async function() {
            try {
                const ownerFee = await remittance.fee.call();
                assert.strictEqual(web3.utils.toBN(ownerFee).toString(10), OWNER_FEE.toString(10));
                assert(await remittance.setOwnerFee(OWNER_FEE, {from : owner}));
            } catch(e) {
                assert(matchError("Remittance.setOwnerFee#001 : This fee is already set", e));
            }
        })

    });


    describe("#Match Data Unit Test", async function() {
        it("Remittance.generatePublicKey", async function() {
            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            assert.strictEqual(publicSecret, web3.utils.soliditySha3(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, remittance.address), "Public Key doesn't match the right value");
        })

        it("Remittance.addFund", async function() {
            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            const txObj = await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            assert.strictEqual(txObj.logs[0].event, "RemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, txObj.logs[0].event + " : Public Secret Dismatch");
            assert.strictEqual(web3.utils.toBN(txObj.logs[0].args.amount).toString(10), (AMOUNT - OWNER_FEE).toString(10), txObj.logs[0].event + " : Amount Dismatch");
            assert.strictEqual(parseInt(txObj.logs[0].args.expirationBlock), parseInt(txObj.receipt.blockNumber) + DURATION_BLOCK, txObj.logs[0].event + " : Expiration Block Dismatch");

            assert.strictEqual(txObj.logs[1].event, "NewOwnerFeeLog");
            assert.strictEqual(txObj.logs[1].args.who, owner, "Address Dismatch");
            assert.strictEqual(web3.utils.toBN(txObj.logs[1].args.amount).toString(10), OWNER_FEE.toString(10), txObj.logs[1].event + " : Owner Fee Dismatch");
        
            assert.strictEqual(txObj.logs[2].event, "RemittanceStatusLog");
            assert.strictEqual(txObj.logs[2].args.publicSecret, publicSecret, txObj.logs[2].event + " : Public Secret Dismatch");
            assert.strictEqual(parseInt(txObj.logs[2].args.remittanceState), parseInt(REMITTANCE_STATUS.Created), txObj.logs[2].event + " : Remittance Status Dismatch");
        })

        it("Remittance.checkKeys", async function() {

            const Web3_exchanger_balance_before = await web3.eth.getBalance(exchanger); //before checkKey

            // Sender Generate Public Secret and Add Fund

            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            // Exchanger Check the Keys

            const txObj = await remittance.checkKeys(SECRET_BENEFICIARY, SECRET_EXCHANGER, publicSecret, {from : exchanger});

            const Web3_exchanger_balance_after = await web3.eth.getBalance(exchanger); //after checkKey

            // Transaction Information

            txReceipt = await web3.eth.getTransactionReceipt(txObj.receipt.transactionHash); 
            const gasPrice = await web3.eth.getGasPrice();
            const gasCost = gasPrice * txReceipt.gasUsed;

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "RemittanceStatusLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, txObj.logs[0].event + " : Public Secret Dismatch");
            assert.strictEqual(parseInt(txObj.logs[0].args.remittanceState), parseInt(REMITTANCE_STATUS.Checked), txObj.logs[0].event + " : Remittance Status Dismatch");

            assert.strictEqual(txObj.logs[1].event, "WithdrawAmountLog");
            assert.strictEqual(txObj.logs[1].args.who, exchanger, "Address Dismatch");

            // Check User Data

            const remittanceAmount = web3.utils.toBN(txObj.logs[1].args.amount);
            assert.strictEqual(web3.utils.toBN(Web3_exchanger_balance_before) - web3.utils.toBN(gasCost), web3.utils.toBN(Web3_exchanger_balance_after) - web3.utils.toBN(remittanceAmount));

        })
  

    it("Remittance.withdrawExpiredRemittance", async function() {

        const shortDuration = 1;

        const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
        assert(await remittance.addFund(exchanger, publicSecret, shortDuration, {from : sender, value : AMOUNT}));

        // Some new blocks

        const publicSecret_2 = await remittance.generatePublicKey(stranger, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger});
        assert(await remittance.addFund(exchanger, publicSecret_2, DURATION_BLOCK, {from : stranger, value : AMOUNT})); 

        const publicSecret_3 = await remittance.generatePublicKey(stranger_2, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger_2});
        assert(await remittance.addFund(exchanger, publicSecret_3, DURATION_BLOCK, {from : stranger_2, value : AMOUNT}));

        // Now is Expired

        const Web3_sender_balance_before = await web3.eth.getBalance(sender); //before withdrawExpiredRemittance

        const txObj = await remittance.withdrawExpiredRemittance(publicSecret, {from : sender}); 

        const Web3_sender_balance_after = await web3.eth.getBalance(sender); //after withdrawExpiredRemittance

        // Transaction Information

        txReceipt = await web3.eth.getTransactionReceipt(txObj.receipt.transactionHash); 
        const gasPrice = await web3.eth.getGasPrice();
        const gasCost = gasPrice * txReceipt.gasUsed;

        // Check Log Data

        assert.strictEqual(txObj.logs[0].event, "RemittanceStatusLog");
        assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, txObj.logs[0].event + " : Public Secret Dismatch");
        assert.strictEqual(parseInt(txObj.logs[0].args.remittanceState), parseInt(REMITTANCE_STATUS.Expired), txObj.logs[0].event + " : Remittance Status Dismatch");

        assert.strictEqual(txObj.logs[1].event, "WithdrawAmountLog");
        assert.strictEqual(txObj.logs[1].args.who, sender, "Address Dismatch");

        // Check User Data

        const remittanceAmount = web3.utils.toBN(txObj.logs[1].args.amount);

        assert.strictEqual(web3.utils.toBN(Web3_sender_balance_before) - web3.utils.toBN(gasCost), web3.utils.toBN(Web3_sender_balance_after) - web3.utils.toBN(remittanceAmount));
       
        })

        it("Remittance.withdrawBalance", async function() {
            const Web3_owner_balance_before = await web3.eth.getBalance(owner);

            // Sender Generate Public Secret and Add Fund

            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            // I don't need more functions

            const txObj = await remittance.withdrawBalance({from : owner});

            const Web3_owner_balance_after = await web3.eth.getBalance(owner);

            // Transaction Information

            txReceipt = await web3.eth.getTransactionReceipt(txObj.receipt.transactionHash); 
            const gasPrice = await web3.eth.getGasPrice();
            const gasCost = gasPrice * txReceipt.gasUsed;

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawAmountLog");
            assert.strictEqual(txObj.logs[0].args.who, owner, "Address Dismatch");

            // Check User Data

            const feeAmount = web3.utils.toBN(txObj.logs[0].args.amount);
           
            assert.strictEqual(web3.utils.toBN(Web3_owner_balance_before) - web3.utils.toBN(gasCost), web3.utils.toBN(Web3_owner_balance_after) - web3.utils.toBN(feeAmount));
          
        });
    });
    describe("#Inheritance Unit Test", async function() {
        describe("#Stoppable.sol", async function() {
            it("Stoppable.onlyIfRunning#001 : It's not running", async function() {
               
                const txObj = await remittance.runSwitch({from : owner});

                assert.strictEqual(txObj.logs[0].event, "RunSwitchLog");
                assert.strictEqual(txObj.logs[0].args.switchSetting, false);
                assert.strictEqual(txObj.logs[0].args.owner, owner);

                try {
                    const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                    assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : 0}));
                } catch(e) {
                    assert(matchError("Stoppable.onlyIfRunning#001 : It's not running", e));
                }
                
            });
        });

        describe("#Owned.sol", async function() {
            it("Owned.onlyOwner#001 : Only Owner can run this part", async function() {
                try {
                    await remittance.runSwitch({from : stranger});
                } catch(e) {
                    assert(matchError("Owned.onlyOwner#001 : Only Owner can run this part", e));
                }
                
            });

            it("Owned.changeOwner#001 : Only Owner can run this part", async function() {
                try {
                    await remittance.changeOwner(stranger_2, {from : stranger});
                } catch(e) {
                    assert(matchError("Owned.changeOwner#001 : Only Owner can run this part", e));
                }
                
            });

        });
    });
})

