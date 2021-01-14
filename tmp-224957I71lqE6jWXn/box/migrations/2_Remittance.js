const Remittance = artifacts.require("Remittance");
module.exports = function(deployer, network, accounts) {
  let owner = accounts[0];
  const ownerCommission = web3.utils.toBN(web3.utils.toWei('500', "gwei"));;
  const minBlockDuration = 1;
  const maxBlockDuration = 200;
  const running = true;
  const maxGas = 2000000;

  if (network == "ropsten") {
    owner = ""; // TODO: Fill with your address
  }

 // deployer.deploy(Remittance, minBlockDuration, maxBlockDuration, ownerCommission, { from: owner, gas: gasLimit });
  deployer.deploy(Remittance, minBlockDuration, maxBlockDuration, ownerCommission, running, maxGas, {from: owner});
};
