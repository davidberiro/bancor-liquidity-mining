const Web3 = require('web3');
const web3 = new Web3(`ws://${process.env.WEB3_PROVIDER}:8545`);

const dappStakingPoolABI = require('../abi/DappStakingPool.json');
const contract = new web3.eth.Contract(dappStakingPoolABI, "0x05Aa229Aec102f78CE0E852A812a388F076Aa555");

(async () => {
    await contract.methods.userPoolTotalEntries(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
    await contract.methods.poolInfo(0).call(
    {
        from: '0x05Aa229Aec102f78CE0E852A812a388F076Aa555'
    }, function(error, result){
        console.log(result);
        console.log(error);
    });
})();