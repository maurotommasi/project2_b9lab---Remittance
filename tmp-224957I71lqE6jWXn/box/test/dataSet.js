module.exports = function(_min_block_duration, _max_block_duration, _actual_duration) {

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
    const MY_BLOCK_DURATION = _actual_duration;
    const MY_BLOCK_DURATION_PLUS1 = MY_BLOCK_DURATION + 1;
    const MY_BLOCK_DURATION_LESS1 = MY_BLOCK_DURATION - 1;

    const THOUSAND_WEI = 1000;



    let testSet = [{isValid:false,fee:0,amount:0,min:0,max:0}];      //testSet[0] = LOGIC NULL

    testSet.push({isValid:true,fee:100,amount:1000,min:5,max:50});
    testSet.push({isValid:true,fee:1,amount:1000,min:2,max:60});
    testSet.push({isValid:false,fee:1,amount:1000,min:2,max:60});
    /*

        const ownerFeeElements  = [MIN_UINT, MIN_UINT_PLUS1, THOUSAND_WEI, MAX_UINT,MAX_UINT_LESS_1];
        const minBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MY_BLOCK_DURATION_LESS1, MY_BLOCK_DURATION, MY_BLOCK_DURATION_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
        const maxBlockDuration  = [MIN_BLOCK_DUR_LESS1, MIN_BLOCK_DURATION, MIN_BLOCK_DUR_PLUS1, MY_BLOCK_DURATION_LESS1, MY_BLOCK_DURATION, MY_BLOCK_DURATION_PLUS1, MAX_BLOCK_DUR_LESS1, MAX_BLOCK_DURATION, MAX_BLOCK_DUR_PLUS1];
        const amount            = [MIN_UINT, MIN_UINT_PLUS1, THOUSAND_WEI, MAX_UINT,MAX_UINT_LESS_1];

    let result_lv0, result_lv1, result_lv2, result_lv3, final_result;
    let c = 0;

    amount.forEach(amount => {
        result_lv0 = true;
        // ### AMOUNT CONDITIONS ###
        if(amount <= 0) result_lv0 = result_lv0 && false;
        minBlockDuration.forEach(min => {
            result_lv1 = true;
            // ### MIN DURATION BLOCK CONDITIONS ###
            if(min < 0) result_lv1 = result_lv1 && false;
            maxBlockDuration.forEach(max => {
                result_lv2 = true;
                // ### MAX DURATION BLOCK CONDITIONS ###
                if(max < 0) result_lv2 = result_lv2 && false;
                if(max <= min) result_lv2 = result_lv2 && false;
                if(MY_BLOCK_DURATION <= min && MY_BLOCK_DURATION >= max) result_lv2 = result_lv2 && false; 
                ownerFeeElements.forEach(fee => {
                    result_lv3 = true;       
                    // ### FEE CONDITIONS ###
                    if(fee < 0) result_lv3 = result_lv3 && false;
                    if(fee > amount) result_lv3 = result_lv3 && false;
                    // ### RETROACTIVE CHECK LV3 ###   
                    if(testSet[c].min == min && testSet[c].max == max) result_lv3 = result_lv3 && false; //else console.log(min + "-" + testSet[c].min + " ---- " + max + "-" + testSet[c].max);
                    if(testSet[c].fee == fee) result_lv3 = result_lv3 && false; //else console.log(fee + "-" + testSet[c].fee);
                    // ### PUSH RESULT ###
                    final_result = result_lv0 && result_lv1 && result_lv2 && result_lv3;
                    testSet.push({isValid:final_result,fee:fee,amount:amount,min:min,max:max});
                    c++;
                });
            });
        });
    });
    */
    return testSet;
};