const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const MAX_UINT_LESS_1 = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";

const ownerFeeElements  = [0 , 1 , 10 , 100, MAX_UINT,MAX_UINT_LESS_1];
const minBlockDuration  = [0 , 1 , 2 , 5, 10, 15, 20];
const maxBlockDuration  = [0 , 1 , 2 , 5, 10, 15, 20];
const amount            = [0 , 1, 100, 1000, MAX_UINT,MAX_UINT_LESS_1];

let validCreationTestSet = [{fee:0,min:0,max:0,amount:0}];
let invalidCreationTestSet = [{fee:0,min:0,max:0,amount:0}];
let result;

ownerFeeElements.forEach(fee => {
    minBlockDuration.forEach(min => {
        maxBlockDuration.forEach(max => {
            amount.forEach(amount => {
                result = true;
                //All conditions here
                if(fee > amount) result = result && false; else result = result && true;
                if(min > max) result = result && false; else result = result && true;
                //Push Result
                if(result) validCreationTestSet.push({fee:fee,min:min,max:max,amount:amount}); else invalidCreationTestSet.push({fee:fee,min:min,max:max,amount:amount});
            });
        });
    });
});

//if(showLog) console.log(validCreationTestSet);
//if(showLog) console.log(invalidCreationTestSet);

module.exports = {
    validCreationTestSet: validCreationTestSet,
    invalidCreationTestSet: invalidCreationTestSet,
};