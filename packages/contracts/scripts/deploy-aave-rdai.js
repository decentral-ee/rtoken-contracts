/**
 * @dev Interactive script to deploy a fullset of rdai contracts
 */
module.exports = async function (callback) {
    try {
        const { promisify } = require("util");
        const rl = require("./common/rl");
        const { web3tx } = require("@decentral.ee/web3-test-helpers");

        global.web3 = web3;
        const network = await web3.eth.net.getNetworkType();

        const AaveAllocationStrategy = artifacts.require("AaveAllocationStrategy");
        const RDAI = artifacts.require("rDAI");
        const Proxy = artifacts.require("Proxy");

        const addresses = require("./common/addresses")[network];

        let aaveASAddress = await promisify(rl.question)("Specify a deployed AaveAllocationStrategy (deploy a new one if blank): ");
        let aaveAS;
        if (!aaveASAddress) {
            aaveAS = await web3tx(
                AaveAllocationStrategy.new,
                `AaveAllocationStrategy.new aDAI ${addresses.aDAI} AaveAddressesProvider ${addresses.aaveAddressesProvider}`)(
                addresses.cDAI, addresses.aaveAddressesProvider
            );
            await web3tx(aaveAS.setReferralCode, `aaveAS.setReferralCode ${addresses.aaveReferralCode}`)(addresses.aaveReferralCode);
            console.log("aaveAllocationStrategy deployed at: ", aaveAS.address);

        } else {
            aaveAS = await AaveAllocationStrategy.at(aaveASAddress);
        }

        let rDAIAddress = await promisify(rl.question)("Specify a deployed rDAI (deploy a new one if blank): ");
        let rDAI;
        if (!rDAIAddress) {
            rDAI = await web3tx(RDAI.new, "rDAI.new")();
            console.log("rDAI deployed at: ", rDAI.address);
        } else {
            rDAI = await RDAI.at(rDAIAddress);
        }

        const rDaiConstructCode = rDAI.contract.methods.initialize(aaveAS.address).encodeABI();
        console.log(`rDaiConstructCode rDAI.initialize(${rDaiConstructCode})`);
        const proxy = await web3tx(Proxy.new, "Proxy.new")(
            rDaiConstructCode, rDAI.address
        );
        console.log("proxy deployed at: ", proxy.address);

        console.log("transfer ownership of aaveAS to new rDai(proxy)", proxy.address);
        await web3tx(aaveAS.transferOwnership, "aaveAS.transferOwnership")(proxy.address);
        callback();
    } catch (err) {
        callback(err);
    }
};
