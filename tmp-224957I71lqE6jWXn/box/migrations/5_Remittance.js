const Remittance = artifacts.require("Remittance");
module.exports = function(deployer, network, accounts) {
  let owner = accounts[0];
  const ownerCommission = 15000000000000;
  const minBlockDuration = 1;
  const maxBlockDuration = 200;
  //const gasLimit = 2000000;

  if (network == "ropsten") {
    owner = ""; // TODO: Fill with your address
  }

 // deployer.deploy(Remittance, minBlockDuration, maxBlockDuration, ownerCommission, { from: owner, gas: gasLimit });
  deployer.deploy(Remittance, minBlockDuration, maxBlockDuration, ownerCommission, { from: owner});
};
