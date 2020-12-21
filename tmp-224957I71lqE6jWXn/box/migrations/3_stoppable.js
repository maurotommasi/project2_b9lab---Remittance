const Stoppable = artifacts.require("Stoppable.sol");
module.exports = function(deployer) {
  deployer.deploy(Stoppable);
};
