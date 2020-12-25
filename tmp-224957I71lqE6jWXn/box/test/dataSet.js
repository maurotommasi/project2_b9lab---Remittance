const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const MAX_UINT_LESS_1 = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";
const MIN_UINT = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MIN_UINT_PLUS1 = "0x0000000000000000000000000000000000000000000000000000000000000001";

const MIN_BLOCK_DURATION = 1; // TODO: Set here the same MIN_BLOCK_DURATION  
const MAX_BLOCK_DURATION = 100; // TODO: Set here the same MAX_BLOCK_DURATION                  
const MIN_BLOCK_DUR_LESS1 = MIN_BLOCK_DURATION - 1;
const MIN_BLOCK_DUR_PLUS1 = MIN_BLOCK_DURATION + 1;
const MAX_BLOCK_DUR_LESS1 = MAX_BLOCK_DURATION - 1;
const MAX_BLOCK_DUR_PLUS1 = MAX_BLOCK_DURATION + 1;

const WEB3_OWNER_BALANCE = 100; //TODO : insert here the owner Balance

const ownerFeeElements  = [MIN_UINT, MIN_UINT_PLUS1, MAX_UINT,MAX_UINT_LESS_1];
const minBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
const maxBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
const amount            = [MIN_UINT, MIN_UINT_PLUS1,MAX_UINT,MAX_UINT_LESS_1];

let validCreationTestSet = [{fee:0,amount:0,min:0,max:0}];      //validCreationTestSet[0] = LOGIC NULL
let invalidCreationTestSet = [{fee:0,amount:0,min:0,max:0}];    //invalidCreationTestSet[0] = LOGIC NULL
let result;
ownerFeeElements.forEach(fee => {
    minBlockDuration.forEach(min => {
        maxBlockDuration.forEach(max => {
            amount.forEach(amount => {
                result = true;
                //All conditions here
                if(fee < 0 || min < 0 || max < 0 || amount < 0) result = result && false; else result = result && true;
                if(fee > amount && WEB3_OWNER_BALANCE < amount) result = result && false; else result = result && true;
                if(min > max) result = result && false; else result = result && true;       //CHECK ALSO OVER-UNDERFLOW
                //Push Result
                if(result) validCreationTestSet.push({fee:fee,amount:amount,min:min,max:max}); else invalidCreationTestSet.push({fee:fee,amount:amount,min:min,max:max});
            });
        });
    });
});

module.exports = {
    validCreationTestSet: validCreationTestSet,
    invalidCreationTestSet: invalidCreationTestSet,
};