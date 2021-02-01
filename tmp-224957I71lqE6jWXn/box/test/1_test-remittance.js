const Remittance = artifacts.require("./Remittance.sol");
const { time } = require('@openzeppelin/test-helpers');

contract("Remittance", accounts => {
    
    const {soliditySha3, toBN, toWei } = web3.utils;

    let OWNER_FEE                   = toBN(toWei('1', "wei"));

    const PERCENTAGE_FEE            = 1;
    const MIN_BLOCK_DURATION        = 1;
    const MAX_BLOCK_DURATION        = 18;
    const SECRET_BENEFICIARY        = soliditySha3("One-Time-Password1");
    const SECRET_EXCHANGER          = soliditySha3("One-Time-Password2");
    const DURATION_BLOCK            = 15;
    const AMOUNT                    = toBN(toWei('10', "finney"));
    const RUNNING                   = true;
    const MAXGAS                    = 20000000;
    const NULL_BYTES32              = 0;
    const INVALID_DURATION          = [MIN_BLOCK_DURATION - 1, MAX_BLOCK_DURATION + 1]
    const INVALID_MAX_VALUE         = MAX_BLOCK_DURATION + 1;
    const INVALID_SECRET            = soliditySha3("Wrong-Password");
    const NULL_ADDRESS              = "0x0000000000000000000000000000000000000000";
    let owner, sender, exchanger, stranger;
    let remittance;

    before("Should Set Accounts", async () => {
        assert.isAtLeast(accounts.length, 4, 'There should be at least 4 accounts to do this test');
        [owner, sender, exchanger, stranger] = accounts;
    });
    
    beforeEach("New Istance of Remittance", async () => {
        remittance = await Remittance.new(MIN_BLOCK_DURATION, MAX_BLOCK_DURATION, OWNER_FEE, RUNNING, MAXGAS, {from : owner});
    });

    it("Check Max Fee Owner", async () => {
        const txReceipt = await web3.eth.getTransactionReceipt(remittance.transactionHash);
        const tx = await web3.eth.getTransaction(remittance.transactionHash);
        const gasPrice = tx.gasPrice;
        const gasCost = toBN(gasPrice).mul(toBN(txReceipt.gasUsed));
        OWNER_FEE = toBN(gasCost).mul(toBN(PERCENTAGE_FEE)).div(toBN(100)); //set OWNER_FEE for each new Remittance Istance 
        assert(toBN(OWNER_FEE).sub(toBN(AMOUNT)).toString(10) < "0", 'Owner Fee has to be less than the Amount');
    });

    // ----------------------------------------------------------------------------------------------- REQUIREMENTS UNIT TESTS 

    describe("#Requirements Unit Tests - Fail Cases", async function() {

        it("Remittance.generatePublicKey#001 : Beneficiary's Private Key can't be null - Bytes32 with 0 value is not accepted on EVM (bypass)", async function() {
            try {
                await remittance.generatePublicKey(exchanger, NULL_BYTES32, SECRET_EXCHANGER, {from : sender});
            } catch(e) {
                assert.strictEqual(e.code, "INVALID_ARGUMENT") && assert.strictEqual(e.coderType, "bytes32") && assert.strictEqual(e.value, 0);              
            }
        })

        it("Remittance.generatePublicKey#002 : Exchanger's Private Key can't ber null - Bytes32 with 0 value is not accepted on EVM (bypass)", async function() {
            try {
                await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, NULL_BYTES32, {from : sender});
            } catch(e) {
                assert.strictEqual(e.code, "INVALID_ARGUMENT") && assert.strictEqual(e.coderType, "bytes32") && assert.strictEqual(e.value, 0);            
            }
        })
        
        INVALID_DURATION.forEach(invalidDurationValue => {
            it("Remittance.addFund#002 : Duration doesn't match the interval. Duration Value = {$invalidDurationValue}", async function() {
                const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
                try {
                    await remittance.addFund(exchanger, publicSecret, invalidDurationValue, {from : sender, value : AMOUNT});
                } catch(e) {
                    assert.strictEqual("Remittance.addFund#002 : Duration doesn't match the interval", e.reason);
                }
            })
        })

        it("Remittance.addFund#003 : Remittance data already used", async function() {
            
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});
            try {
                await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});
            } catch(e) {
                assert.strictEqual("Remittance.addFund#003 : Remittance data already used", e.reason);
            }
        })
        
        it("Remittance.addFund#004 : Msg.value has to be greater than owner fee", async function() {

            const invalidAmount = OWNER_FEE - 1;
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            try {
                await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : invalidAmount});
            } catch(e) {
                assert.strictEqual("Remittance.addFund#004 : Msg.value has to be greater than owner fee", e.reason);
            }
        })
                  
        it("Remittance.checkKeys : Incorrect Data", async function() {
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});
            try {
                await remittance.checkKeys(sender, INVALID_SECRET, SECRET_EXCHANGER, publicSecret, {from : exchanger}); //should fail
            } catch(e) {
                // PublicKey not created => Data not defined
            }
        })

        it("Stranger can't check the key", async function() {
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            try {
                await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : stranger});
            } catch(e) {
                assert.strictEqual("Remittance.checkKeys#003 : Expiration Block Dismatch", e.reason);
            }
        })

        it("Expiration Block Dismatch", async function() {

            const shortDuration = 1

            
            const publicSecret1 = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret1, shortDuration, {from : sender, value : AMOUNT});

            // Some new blocks

            await time.advanceBlock();
            await time.advanceBlock();

            try {
                await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger}); 
            } catch(e) {
                assert.strictEqual("Remittance.checkKeys#003 : Expiration Block Dismatch", e.reason);
            }
        })

        it("Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function", async function() {

            const shortDuration = 1

            const publicSecret1 = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret1, shortDuration, {from : sender, value : AMOUNT});

            // Some new blocks

            await time.advanceBlock();
            await time.advanceBlock();

            try {
                await remittance.withdrawExpiredRemittance(publicSecret1, {from : stranger}); 
            } catch(e) {
                assert.strictEqual("Remittance.withdrawExpiredRemittance#001 : Only the sender can unlock this function", e.reason);
            }
        })

        it("Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch", async function() {
            const shortDuration = 5;
            
            const publicSecret1 = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret1, shortDuration, {from : sender, value : AMOUNT});
                
            try { // before expiration block
                await remittance.withdrawExpiredRemittance(publicSecret1, {from : sender}); 
            } catch(e) {
                assert.strictEqual("Remittance.withdrawExpiredRemittance#003 : Expiration Block Dismatch", e.reason);
            }
        })

        it("Remittance.withdrawBalance#001 : Balance can't be equal to 0", async function() {
            const strangerBalance = await remittance.balances.call(stranger);
            assert.strictEqual(toBN(strangerBalance).toString(10), "0", "Balance is not 0");

            try {
                await remittance.withdrawBalance({from : sender});
            } catch(e) {
                assert.strictEqual("Remittance.withdrawBalance#001 : Balance can't be equal to 0", e.reason);
            }
        })

        it("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", async function() {
            const maxDuration = await remittance.maxDuration.call(); 
            assert(toBN(INVALID_MAX_VALUE) >= maxDuration);

            try {
                await remittance.changeMinDurationInterval(INVALID_MAX_VALUE, {from : owner});
            } catch(e) {
                assert.strictEqual("Remittance.changeMinDurationInterval#001 : Min value can't be greater than Max value", e.reason);
            }
        })

        it("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            const minDuration = await remittance.minDuration.call();
            assert.strictEqual(toBN(minDuration).toString(10), toBN(MIN_BLOCK_DURATION).toString(10));

            try {    
                await remittance.changeMinDurationInterval(0, {from : owner});
            } catch(e) {
                assert.strictEqual("Remittance.changeMinDurationInterval#002 : Values are already set or Min Value equal to 0", e.reason);
            }
        })

        it("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", async function() {
            const minDuration = await remittance.minDuration.call();
            assert(toBN(INVALID_MAX_VALUE) >= minDuration);

            try {
                await remittance.changeMaxDurationInterval(INVALID_MAX_VALUE, {from : owner});
            } catch(e) {
                assert.strictEqual("Remittance.changeMaxDurationInterval#001 : Min value can't be greater than Max value", e.reason);
            }
        })

        it("Remittance.changeMaxDurationInterval#002 : Values are already set or Min Value equal to 0", async function() {
            const maxDuration = await remittance.maxDuration.call();
            assert.strictEqual(toBN(maxDuration).toString(10), toBN(MAX_BLOCK_DURATION).toString(10));

            try {
                await remittance.changeMaxDurationInterval(MAX_BLOCK_DURATION, {from : owner});
            } catch(e) {
                assert.strictEqual("Remittance.changeMaxDurationInterval#002 : Values are already set", e.reason);
            }
        })

        it("Remittance.setOwnerFee#001 : This fee is already set", async function() {
            const ownerFee = await remittance.fee.call();
            assert.strictEqual(toBN(ownerFee).toString(10), OWNER_FEE.toString(10));

            try {
                await remittance.setOwnerFee(OWNER_FEE, {from : owner});
            } catch(e) {
                assert.strictEqual("Remittance.setOwnerFee#001 : This fee is already set", e.reason);
            }
        })

    });


    describe("#Match Data Unit Test", async function() {
        it("Remittance.generatePublicKey", async function() {
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            assert.strictEqual(publicSecret, soliditySha3(sender, exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, remittance.address), "Public Key doesn't match the right value");
        })

        it("Remittance.addFund", async function() {
            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            const txObj = await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});
            assert.strictEqual(txObj.logs[0].event, "RemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, "${txObj.logs[0].event} : Public Secret Dismatch");
            assert.strictEqual(toBN(txObj.logs[0].args.amount).toString(10), (AMOUNT - OWNER_FEE).toString(10), "${txObj.logs[0].event} : Amount Dismatch");
            assert.strictEqual(toBN((txObj.logs[0].args.expirationBlock)).toString(10),toBN(txObj.receipt.blockNumber).add(toBN(DURATION_BLOCK)).toString(10), "${txObj.logs[0].event} : Expiration Block Dismatch");

            assert.strictEqual(txObj.logs[1].event, "NewOwnerFeeLog");
            assert.strictEqual(txObj.logs[1].args.who, owner, "Address Dismatch");
            assert.strictEqual(toBN(txObj.logs[1].args.amount).toString(10), OWNER_FEE.toString(10), "${txObj.logs[1].event} : Owner Fee Dismatch");

        })

        it("Remittance.checkKeys", async function() {

            // Sender Generate Public Secret and Add Fund

            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            // Exchanger Check the Keys

            const web3ExchangerBalanceBefore = await web3.eth.getBalance(exchanger); //before checkKey            

            const txObj = await remittance.checkKeys(sender, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : exchanger});

            const web3ExchangerBalanceAfter = await web3.eth.getBalance(exchanger); //after checkKey

            const txReceipt = txObj.receipt;
            const tx = await web3.eth.getTransaction(txObj.tx);
            const gasPrice = tx.gasPrice;
            const gasCost = toBN(gasPrice).mul(toBN(txReceipt.gasUsed));

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawRemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, "publicSecret Dismatch");

            // Check User Data

            const remittanceAmount = toBN(txObj.logs[0].args.amount);
            assert.strictEqual(toBN(web3ExchangerBalanceBefore).sub(toBN(gasCost)).toString(10), toBN(web3ExchangerBalanceAfter).sub(toBN(remittanceAmount)).toString(10));

            // Check Slots data

            const RemittanceMetaData = await remittance.remittances.call(publicSecret);
            assert.strictEqual(RemittanceMetaData["sender"], NULL_ADDRESS);
            assert.strictEqual(RemittanceMetaData["exchanger"], NULL_ADDRESS);
            assert.strictEqual(RemittanceMetaData["amount"].toString(10), "0");
            assert(RemittanceMetaData["expirationBlock"].toString(10) > "0");
        })
  

        it("Remittance.withdrawExpiredRemittance", async function() {

            const shortDuration = 1;

            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, shortDuration, {from : sender, value : AMOUNT});

            // Some new blocks

            await time.advanceBlock();
            await time.advanceBlock();

            // Now is Expired

            const web3SenderBalanceBefore = await web3.eth.getBalance(sender); //before withdrawExpiredRemittance

            const txObj = await remittance.withdrawExpiredRemittance(publicSecret, {from : sender}); 

            const web3SenderBalanceAfter = await web3.eth.getBalance(sender); //after withdrawExpiredRemittance

            // Transaction Information

            const txReceipt = txObj.receipt;
            const tx = await web3.eth.getTransaction(txObj.tx);
            const gasPrice = tx.gasPrice;
            const gasCost = toBN(gasPrice).mul(toBN(txReceipt.gasUsed));

            // Check Logic Null

            const RemittanceMetaData = await remittance.remittances.call(publicSecret);
            assert.strictEqual(toBN(RemittanceMetaData.amount).toString(10), "0");

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawRemittanceLog");
            assert.strictEqual(txObj.logs[0].args.publicSecret, publicSecret, "publicSecret Dismatch");

            // Check User Data

            const remittanceAmount = toBN(txObj.logs[0].args.amount);

            assert.strictEqual(toBN(web3SenderBalanceBefore).sub(toBN(gasCost)).toString(10), toBN(web3SenderBalanceAfter).sub(toBN(remittanceAmount)).toString(10));
            
            })

        it("Remittance.withdrawBalance", async function() {

            // Sender Generate Public Secret and Add Fund

            const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});
            await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : AMOUNT});

            // I don't need more functions

            const web3OwnerBalanceBefore = await web3.eth.getBalance(owner);

            const txObj = await remittance.withdrawBalance({from : owner});

            const web3OwnerBalanceAfter = await web3.eth.getBalance(owner);

            // Transaction Information

            const txReceipt = txObj.receipt;
            const tx = await web3.eth.getTransaction(txObj.tx);
            const gasPrice = tx.gasPrice;
            const gasCost = toBN(gasPrice).mul(toBN(txReceipt.gasUsed));

            // Check Log Data

            assert.strictEqual(txObj.logs[0].event, "WithdrawBalanceLog");
            assert.strictEqual(txObj.logs[0].args.who, owner, "Address Dismatch");

            // Check User Data

            const feeAmount = toBN(txObj.logs[0].args.amount);
            
            assert.strictEqual(toBN(web3OwnerBalanceBefore).sub(toBN(gasCost)).toString(10), toBN(web3OwnerBalanceAfter).sub(toBN(feeAmount)).toString(10));
            
        });
    });

    describe("#Inheritance Unit Test", async function() {
        describe("#Stoppable.sol", async function() {
            it("Stoppable.onlyIfRunning#001 : It's not running", async function() {
               
                const txObj = await remittance.runSwitch({from : owner});

                assert.strictEqual(txObj.logs[0].event, "RunSwitchLog");
                assert.strictEqual(txObj.logs[0].args.switchSetting, false);
                assert.strictEqual(txObj.logs[0].args.owner, owner);

                const publicSecret = await remittance.generatePublicKey(exchanger, SECRET_BENEFICIARY, SECRET_EXCHANGER, {from : sender});

                try {
                    await remittance.addFund(exchanger, publicSecret, DURATION_BLOCK, {from : sender, value : 0});
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
                    await remittance.changeOwner(stranger, {from : stranger});
                } catch(e) {
                    assert.strictEqual("Owned.changeOwner#001 : Only Owner can run this part", e.reason);
                }
                
            });

        });
    });
})

