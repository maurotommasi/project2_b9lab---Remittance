module.exports = function(_min_block_duration, _max_block_duration, _actual_duration, _contractCost) {

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



    let validTestSet = [{fee:100,amount:1000,min:5,max:50,duration:25,otp1:"ASDFGHJKL01",otp2:"QWERTYUIOP35"}]
    validTestSet.push({fee:1,amount:1000,min:2,max:60,duration:30,otp1:"ASDFGHJKL02",otp2:"QWERTYUIOP36"});
    validTestSet.push({fee:1,amount:1000,min:2,max:60,duration:33,otp1:"ASDFGHJKL03",otp2:"QWERTYUIOP37"});

    let invalidTestSet = [{fee:100,amount:1000,min:5,max:50,duration:250,otp1:"ASDFGHJKL01",otp2:"QWERTYUIOP35"}];
    invalidTestSet.push({fee:100,amount:1000,min:5,max:50,duration:25,otp1:"ASDFGHJKL01",otp2:"QWERTYUIOP35"});





    
    return [validTestSet,invalidTestSet];
};