const Web3 = require('web3');
const web3A = new Web3(`http://${process.env.WEB3_PROVIDER}:8545`);
const web3B = new Web3(`ws://${process.env.WEB3_PROVIDER}:8545`);

const dappStakingPoolABI = require('../abi/DappStakingPool.json');
const contractA = new web3A.eth.Contract(dappStakingPoolABI, "0x05Aa229Aec102f78CE0E852A812a388F076Aa555");
const contractB = new web3B.eth.Contract(dappStakingPoolABI, "0x05Aa229Aec102f78CE0E852A812a388F076Aa555");

(async () => {
    await contractA.methods.userPoolTotalEntries(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
    await contractA.methods.poolInfo(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
    await contractB.methods.userPoolTotalEntries(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
    await contractB.methods.poolInfo(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
})();