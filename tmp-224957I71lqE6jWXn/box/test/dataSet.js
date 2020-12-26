module.exports = function(_min_block_duration, _max_block_duration, _web3_owmer_balance) {

    const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const MAX_UINT_LESS_1 = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe";
    const MIN_UINT = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MIN_UINT_PLUS1 = "0x0000000000000000000000000000000000000000000000000000000000000001";

    const MIN_BLOCK_DURATION = _min_block_duration; 
    const MAX_BLOCK_DURATION = _max_block_duration;                
    const MIN_BLOCK_DUR_LESS1 = MIN_BLOCK_DURATION - 1;
    const MIN_BLOCK_DUR_PLUS1 = MIN_BLOCK_DURATION + 1;
    const MAX_BLOCK_DUR_LESS1 = MAX_BLOCK_DURATION - 1;
    const MAX_BLOCK_DUR_PLUS1 = MAX_BLOCK_DURATION + 1;

    const WEB3_OWNER_BALANCE = _web3_owmer_balance;
    const WEB3_OWNER_BALANCE_HALF = Math.floor(WEB3_OWNER_BALANCE / 2);
    const WEB3_OWNER_BALANCE_PLUS1 = WEB3_OWNER_BALANCE + 1;

    const IS_VALID          = true;
    const ownerFeeElements  = [MIN_UINT, MIN_UINT_PLUS1, MAX_UINT,MAX_UINT_LESS_1];
    const minBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
    const maxBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
    const amount            = [MIN_UINT, MIN_UINT_PLUS1, WEB3_OWNER_BALANCE_HALF, WEB3_OWNER_BALANCE_HALF, WEB3_OWNER_BALANCE_PLUS1, MAX_UINT,MAX_UINT_LESS_1];

    let testSet = [{isvalid:false,fee:0,amount:0,min:0,max:0}];      //testSet[0] = LOGIC NULL
    let result;
    ownerFeeElements.forEach(fee => {
        minBlockDuration.forEach(min => {
            maxBlockDuration.forEach(max => {
                amount.forEach(amount => {
                    result = true;
                    //All conditions here
                    if(amount >= WEB3_OWNER_BALANCE) result = result && false;                  //GAS FEE INCLUDED
                    if(fee < 0 || min < 0 || max < 0 || amount < 0) result = result && false;
                    if(fee > amount && WEB3_OWNER_BALANCE < amount) result = result && false;
                    if(min >= max) result = result && false;                                     //CHECK ALSO OVER-UNDERFLOW
                    //Push Result
                    testSet.push({isValid:result,fee:fee,amount:amount,min:min,max:max});
                });
            });
        });
    });

    return testSet;
};