const Remittance = artifacts.require("./Remittance.sol");

contract("Remittance", accounts => {
    
    const {soliditySha3, toBN} = web3.utils;

    const OWNER_FEE                 = toBN(web3.utils.toWei('500', "gwei"));
    const MIN_BLOCK_DURATION        = 1;
    const MAX_BLOCK_DURATION        = 18;
    const SECRET_BENEFICIARY        = soliditySha3("One-Time-Password1");
    const SECRET_EXCHANGER          = soliditySha3("One-Time-Password2");
    const DURATION_BLOCK            = 15;
    const AMOUNT                    = toBN(web3.utils.toWei('1000', "gwei"));
    const RUNNING                   = true;
    const MAXGAS                    = 20000000;
    const NULL_BYTES32              = 0;
    const INVALID_DURATION          = [MIN_BLOCK_DURATION - 1, MAX_BLOCK_DURATION + 1]
    const INVALID_MAX_VALUE         = MAX_BLOCK_DURATION + 1;

    let contractCost;

    let owner, sender, exchanger, stranger, stranger_2, stranger_3;
    let remittance;

    before("Should Set Accounts", async () => {

        assert.isAtLeast(accounts.length, 4, 'There should be at least 4 accounts to do this test');

        [owner, sender, exchanger, stranger, stranger_2, stranger_3] = accounts;

        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, RUNNING, MAXGAS, {from : owner});

        txReceipt = await web3.eth.getTransactionReceipt(remittance.transactionHash);
        const tx = await web3.eth.getTransaction(remittance.transactionHash);
        const gasPrice = tx.gasPrice;
        const gasCost = gasPrice * txReceipt.gasUsed;
        contractCost = gasCost;

    });
    
    beforeEach("New Istance of Remittance", async () => {
        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, RUNNING, MAXGAS, {from : owner});
    });

    it("Check Max Fee Owner", () => {
        assert(OWNER_FEE <= contractCost, "Owner fee has to be less than the price in case the exchanger would like to deploy the contract by himself");
    });

    // ----------------------------------------------------------------------------------------------- REQUIREMENTS UNIT TESTS 

    describe("#Requirements Unit Tests - Fail Cases", async function() {

        it("Remittance.generatePublicKey#001 : Beneficiary's Private Key can't be null - Bytes32 with 0 value is not accepted on EVM (bypass)", async function() {
            try {
                assert(!(await remittance.generatePublicKey(sender, exchanger, NULL_BYTES32, SECRET_EXCHANGER, {from : sender})));
            } catch(e) {
                assert((e.code == "INVALID_ARGUMENT" && e.coderType == "bytes32" && e.value == 0)); //error on EVM on bytes32 - I leave the require on solidity for safety check
            }
        })

        it("Remittance.generatePublicKey#002 : Exchanger's Private Key can't ber null - Bytes32 with 0 value is not accepted on EVM (bypass)", async function() {
            try {
                assert(await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, NULL_BYTES32, {from : sender}));
            } catch(e) {
                 assert((e.code == "INVALID_ARGUMENT" && e.coderType == "bytes32" && e.value == 0)); //error on EVM on bytes32 - I leave the require on solidity for safety check
            }
        })
        
        it("Remittance.addFund#001 : msg.value can't be 0", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : 0}));
            } catch(e) {
                assert.strictEqual("Remittance.addFund#001 : msg.value can't be 0", e.reason);
            }
        })

        INVALID_DURATION.forEach(invalidDurationValue => {
            it("Remittance.addFund#002 : Duration doesn't match the interval. Duration Value = " + invalidDurationValue, async function() {
                try {
                    const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                    assert(await remittance.addFund(exchanger, publicSecret, invalidDurationValue, {from : sender, value : AMOUNT}));
                } catch(e) {
                    assert.strictEqual("Remittance.addFund#002 : Duration doesn't match the interval", e.reason);
                }
            })
        })

        it("Remittance.addFund#003 : Remittance data already used", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
            } catch(e) {
                assert.strictEqual("Remittance.addFund#003 : Remittance data already used", e.reason);
            }
        })
        
        it("Remittance.addFund#004 : Msg.value has to be greater than owner fee", async function() {

            const invalidAmount = OWNER_FEE - 1;

            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : invalidAmount}));
            } catch(e) {
                assert.strictEqual("Remittance.addFund#004 : Msg.value has to be greater than owner fee", e.reason);
            }
        })

        it("Remittance.checkKeys#001 : Addresses Dismatch", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger}));
            } catch(e) {
                assert.strictEqual("Remittance.checkKeys#001 : Addresses Dismatch", e.reason);
            }
        })

        it("Remittance.checkKeys#002 : Remittance state has to be created or already checked", async function() {
            try {
                const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT}));
                assert(await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger}));
                assert(await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger}));
            } catch(e) {
                assert.strictEqual("Remittance.checkKeys#002 : Remittance state has to be created or already checked", e.reason);
            }
        })

        it("Remittance.checkKeys#003 : Expiration Block Dismatch", async function() {

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

                assert(!(await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger}))); 

            } catch(e) {
                assert.strictEqual("Remittance.checkKeys#003 : Expiration Block Dismatch", e.reason);
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
                assert.strictEqual("Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function", e.reason);
            }
        })

        it("Remittance.withdrawExpiredRemittance#002 : Exhanger withdrawed yet or Remittance not created", async function() {

            const shortDuration = 3

            try {
                const publicSecret_1 = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                assert(await remittance.addFund(exchanger, publicSecret_1, shortDuration, {from : sender, value : AMOUNT}));

                assert(await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger})); // exchanger check keys

                 // Some new blocks

                 const publicSecret_4 = await remittance.generatePublicKey(stranger_2, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger_2});
                 assert(await remittance.addFund(exchanger, publicSecret_4, DURATION_BLOCK, {from : stranger_2, value : AMOUNT})); 
 
                 const publicSecret_5 = await remittance.generatePublicKey(stranger_3, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger_3});
                 assert(await remittance.addFund(exchanger, publicSecret_5, DURATION_BLOCK, {from : stranger_3, value : AMOUNT}));

                 // after expiration block

                assert(await remittance.withdrawExpiredRemittance(publicSecret_1, {from : sender})); 

            } catch(e) {
                assert.strictEqual("Remittance.withdrawExpiredRemittance#002 : Exhanger withdrawed yet or Remittance not created", e.reason);
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
                assert.strictEqual("Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch", e.reason);
            }
        })

        it("Remittance.withdrawBalance#001 : Balance can't be equal to 0", async function() {
            try {
                const strangerBalance = await remittance.balances.call(stranger);
                assert.strictEqual(toBN(strangerBalance).toString(10), toBN(0).toString(10), "Balance is not 0");
                assert(await remittance.withdrawBalance({from : sender}));
            } catch(e) {
                assert.strictEqual("Remittance.withdrawBalance#001 : Balance can't be equal to 0", e.reason);
            }
        })

        it("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", async function() {
            try {
                const maxDuration = await remittance.max_duration.call(); 
                assert(INVALID_MAX_VALUE > maxDuration);
                assert(await remittance.changeMinDurationInterval(INVALID_MAX_VALUE, {from : owner}));
            } catch(e) {
                assert.strictEqual("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", e.reason);
            }
        })

        it("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            try {
                const minDuration = await remittance.min_duration.call();
                assert(minDuration == MIN_BLOCK_DURATION);
                assert(await remittance.changeMinDurationInterval(MIN_BLOCK_DURATION, {from : owner}));
                assert(await remittance.changeMinDurationInterval(0, {from : sender}));
            } catch(e) {
                assert.strictEqual("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", e.reason);
            }
        })

        it("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", async function() {
            try {
                const minDuration = await remittance.min_duration.call();
                assert(INVALID_MAX_VALUE > minDuration);
                assert(await remittance.changeMaxDurationInterval(INVALID_MAX_VALUE, {from : owner}));
            } catch(e) {
                assert.strictEqual("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", e.reason);
            }
        })

        it("Remittance.changeMaxDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            try {
                const maxDuration = await remittance.max_duration.call();
                assert(maxDuration == MAX_BLOCK_DURATION);
                assert(await remittance.changeMaxDurationInterval(MAX_BLOCK_DURATION, {from : owner}));
            } catch(e) {
                assert.strictEqual("Remittance.changeMaxDurationInterval#002 : Values are already set", e.reason);
            }
        })

        it("Remittance.setOwnerFee#001 : This fee is already set", async function() {
            try {
                const ownerFee = await remittance.fee.call();
                assert.strictEqual(toBN(ownerFee).toString(10), OWNER_FEE.toString(10));
                assert(await remittance.setOwnerFee(OWNER_FEE, {from : owner}));
            } catch(e) {
                assert.strictEqual("Remittance.setOwnerFee#001 : This fee is already set", e.reason);
            }
        })

    });


    describe("#Match Data Unit Test", async function() {
        it("Remittance.generatePublicKey", async function() {
            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            assert.strictEqual(publicSecret, soliditySha3(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, remittance.address), "Public Key doesn't match the right value");
        })

        it("Remittance.addFund", async function() {
            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            const txObj = await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            assert.strictEqual(txObj.logs[0].event, "RemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, txObj.logs[0].event + " : Public Secret Dismatch");
            assert.strictEqual(toBN(txObj.logs[0].args.amount).toString(10), (AMOUNT - OWNER_FEE).toString(10), txObj.logs[0].event + " : Amount Dismatch");
            assert.strictEqual(parseInt(txObj.logs[0].args.expirationBlock), parseInt(txObj.receipt.blockNumber) + DURATION_BLOCK, txObj.logs[0].event + " : Expiration Block Dismatch");

            assert.strictEqual(txObj.logs[1].event, "NewOwnerFeeLog");
            assert.strictEqual(txObj.logs[1].args.who, owner, "Address Dismatch");
            assert.strictEqual(toBN(txObj.logs[1].args.amount).toString(10), OWNER_FEE.toString(10), txObj.logs[1].event + " : Owner Fee Dismatch");

        })

        it("Remittance.checkKeys", async function() {

            const Web3_exchanger_balance_before = await web3.eth.getBalance(exchanger); //before checkKey

            // Sender Generate Public Secret and Add Fund

            const publicSecret = await remittance.generatePublicKey(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            // Exchanger Check the Keys

            const txObj = await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger});

            const Web3_exchanger_balance_after = await web3.eth.getBalance(exchanger); //after checkKey

            const txReceipt = txObj.receipt;
            const tx = await web3.eth.getTransaction(txObj.receipt.transactionHash);
            const gasPrice = tx.gasPrice;
            const gasCost = gasPrice * txReceipt.gasUsed;

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawRemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, "publicSecret Dismatch");

            // Check User Data

            const remittanceAmount = toBN(txObj.logs[0].args.amount);
            assert.strictEqual(toBN(Web3_exchanger_balance_before) - toBN(gasCost), toBN(Web3_exchanger_balance_after) - toBN(remittanceAmount));

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

        const txReceipt = txObj.receipt;
        const tx = await web3.eth.getTransaction(txObj.receipt.transactionHash);
        const gasPrice = tx.gasPrice;
        const gasCost = gasPrice * txReceipt.gasUsed;

        // Check Logic Null

        const RemittanceMetaData = await remittance.remittances.call(publicSecret);
        assert.strictEqual(toBN(RemittanceMetaData.amount).toString(10), toBN(0).toString(10));

        // Check Log Data

        assert.strictEqual(txObj.logs[0].event, "WithdrawRemittanceLog");
        assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, "publicSecret Dismatch");

        // Check User Data

        const remittanceAmount = toBN(txObj.logs[0].args.amount);

        assert.strictEqual(toBN(Web3_sender_balance_before) - toBN(gasCost), toBN(Web3_sender_balance_after) - toBN(remittanceAmount));
       
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

            const txReceipt = txObj.receipt;
            const tx = await web3.eth.getTransaction(txObj.receipt.transactionHash);
            const gasPrice = tx.gasPrice;
            const gasCost = gasPrice * txReceipt.gasUsed;

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawBalanceLog");
            assert.strictEqual(txObj.logs[0].args.who, owner, "Address Dismatch");

            // Check User Data

            const feeAmount = toBN(txObj.logs[0].args.amount);
           
            assert.strictEqual(toBN(Web3_owner_balance_before) - toBN(gasCost), toBN(Web3_owner_balance_after) - toBN(feeAmount));
          
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
                    assert.strictEqual("Stoppable.onlyIfRunning#001 : It's not running", e.reason);
                }
                
            });
        });

        describe("#Owned.sol", async function() {
            it("Owned.onlyOwner#001 : Only Owner can run this part", async function() {
                try {
                    await remittance.runSwitch({from : stranger});
                } catch(e) {
                    assert.strictEqual("Owned.onlyOwner#001 : Only Owner can run this part", e.reason);
                }
                
            });

            it("Owned.changeOwner#001 : Only Owner can run this part", async function() {
                try {
                    await remittance.changeOwner(stranger_2, {from : stranger});
                } catch(e) {
                    assert.strictEqual("Owned.changeOwner#001 : Only Owner can run this part", e.reason);
                }
                
            });

        });
    });
})

