require('dotenv').config();
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
//var { abi } = require('../build/contracts/myERC20.json');

var JFeesCollector = artifacts.require("JFeesCollector");
var JAdminTools = artifacts.require("JAdminTools");

var JYearn = artifacts.require('JYearn');
var JTranchesDeployer = artifacts.require('JTranchesDeployer');

var JTrancheAToken = artifacts.require('JTrancheAToken');
var JTrancheBToken = artifacts.require('JTrancheBToken');

var myERC20 = artifacts.require("./mocks/myERC20.sol");
var WETHGateway = artifacts.require('WETHGateway');

var IncentivesController = artifacts.require('./IncentivesController');

const MYERC20_TOKEN_SUPPLY = 5000000;
//const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const yWETH_Address = '0x87b1f4cf9BD63f7BBD3eE1aD04E8F52540349347';
const yDAI_Address = '0xC2cB1040220768554cf699b0d863A3cd4324ce32';
const yUSDC_Address = '0xd6aD7a6750A7593E092a9B218d66C0A814a3436e';
const yvUSDC_Address = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const yvWETH_Address = '0xa258C4606Ca8206D8aA700cE2143D7db854D168c';


module.exports = async (deployer, network, accounts) => {
  if (network == "development") {
    const factoryOwner = accounts[0];

    const mySLICEinstance = await deployProxy(myERC20, [MYERC20_TOKEN_SUPPLY], { from: factoryOwner });
    console.log('mySLICE Deployed: ', mySLICEinstance.address);

    const JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
    console.log('JAdminTools Deployed: ', JATinstance.address);

    const JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
    console.log('JFeesCollector Deployed: ', JFCinstance.address);

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("Tranches Deployer: " + JTDeployer.address);

    const JYInstance = await deployProxy(JYearn, [JATinstance.address, JFCinstance.address, 
        JTDeployer.address, mySLICEinstance.address, 2102400], { from: factoryOwner });
    console.log('JYearn Deployed: ', JYInstance.address);

    await JATinstance.addAdmin(JYInstance.address, { from: factoryOwner })

    await JTDeployer.setJYearnAddress(JYInstance.address, { from: factoryOwner });
    
    await JYInstance.addTrancheToProtocol(WETH_ADDRESS, yvWETH_Address, true, "jWEthTrancheAToken", "ayvWEA", 
      "jWEthTrancheBToken", "byvWEB", web3.utils.toWei("0.04", "ether"), 18, { from: factoryOwner });
    trParams = await JYInstance.trancheAddresses(0);
    let WEthTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("WETH Tranche A Token Address: " + WEthTrA.address);
    let WEthTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("WETH Tranche B Token Address: " + WEthTrB.address);

    await JYInstance.setTrancheDeposit(0, true);

    // console.log(await WEthTrA.owner())
    // console.log(await WEthTrB.owner())

    // await JTDeployer.setNewJYearnTokens(JYInstance.address, WEthTrA.address, WEthTrB.address, { from: factoryOwner });

    await JYInstance.addTrancheToProtocol(DAI_ADDRESS, yDAI_Address, false, "jDaiTrancheAToken", "ayDAI", 
      "jDaiTrancheBToken", "byDAI", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    trParams = await JYInstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("DAI Tranche A Token Address: " + DaiTrA.address);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("DAI Tranche B Token Address: " + DaiTrB.address);

    await JYInstance.setTrancheDeposit(1, true);

    await JYInstance.addTrancheToProtocol(USDC_ADDRESS, yvUSDC_Address, true, "jUsdcTrancheAToken", "ayUSDC", 
      "jUsdcTrancheBToken", "byUSDC", web3.utils.toWei("0.03", "ether"), 6, { from: factoryOwner });
    trParams = await JYInstance.trancheAddresses(2);
    let UsdcTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    console.log("USDC Tranche A Token Address: " + UsdcTrA.address);
    let UsdcTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    console.log("USDC Tranche B Token Address: " + UsdcTrB.address);

    await JYInstance.setTrancheDeposit(2, true);

    const JIController = await deployProxy(IncentivesController, [], { from: factoryOwner });
    console.log("Tranches Deployer: " + JIController.address);

    await JYInstance.setincentivesControllerAddress(JIController.address);

  } else if (network == "kovan") {
    let { FEE_COLLECTOR_ADDRESS, PRICE_ORACLE_ADDRESS, REWARD_TOKEN_ADDRESS, IS_UPGRADE, AAVE_POOL, ADAI_ADDRESS, DAI_ADDRESS, AAVE_INCENTIVE_CONTROLLER } = process.env;
    const accounts = await web3.eth.getAccounts();
    const factoryOwner = accounts[0];
    if (IS_UPGRADE == 'true') {
      console.log('contracts are upgraded');
    } else {
      const aaveDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
      console.log(`AAVE_DEPLOYER=${aaveDeployer.address}`);

      const JAaveInstance = await deployProxy(JAave, [PRICE_ORACLE_ADDRESS, FEE_COLLECTOR_ADDRESS, aaveDeployer.address, PRICE_ORACLE_ADDRESS],
        { from: factoryOwner });
      console.log(`AAVE_TRANCHE_ADDRESS=${JAaveInstance.address}`);

      await aaveDeployer.setJAaveAddress(JAaveInstance.address, { from: factoryOwner });
      console.log('aave deployer 1');

      await JAaveInstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
      console.log('aave deployer 2');

      await JAaveInstance.addTrancheToProtocol(DAI_ADDRESS, ADAI_ADDRESS, "Tranche A - AAVE DAI", "AADAI", "Tranche B - AAVE DAI", "BADAI", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
      // remember to enable deposits for the tranche number you add!!!
      await JAaveInstance.setTrancheDeposit(0, true);
      console.log('aave deployer 3');

      // await JAaveInstance.addTrancheToProtocol(ETH_ADDRESS, AWETH_ADDRESS, "Tranche A - AAVE ETH", "AAETH", "Tranche A - AAVE ETH", "BAETH", web3.utils.toWei("0.04", "ether"), 18, { from: factoryOwner });
      // console.log('compound deployer 4');

      console.log(`JAave deployed at: ${JAaveInstance.address}`);
    }
  } else if (network === 'matic') {
    let { AAVE_POOL, MATIC_ADDRESS, WMATIC_ADDRESS, REWARD_TOKEN_ADDRESS, amWMATIC_ADDRESS, USDC_ADDRESS, amUSDC_ADDRESS,
      DAI_ADDRESS, amDAI_ADDRESS, ADMIN_TOOLS, FEE_COLLECTOR_ADDRESS, } = process.env;
    const factoryOwner = accounts[0];

    let JATinstance = null;
    let JFCinstance = null;
    if (!ADMIN_TOOLS) {
      JATinstance = await deployProxy(JAdminTools, [], { from: factoryOwner });
      console.log('JAdminTools Deployed: ', JATinstance.address);
    } else {
      JATinstance = {
        address: ADMIN_TOOLS
      }
    }
    if (!FEE_COLLECTOR_ADDRESS) {
      JFCinstance = await deployProxy(JFeesCollector, [JATinstance.address], { from: factoryOwner });
      console.log('JFeesCollector Deployed: ', JFCinstance.address);
    } else {
      JFCinstance = {
        address: FEE_COLLECTOR_ADDRESS
      }
    }

    const JTDeployer = await deployProxy(JTranchesDeployer, [], { from: factoryOwner });
    console.log("AAVE_DEPLOYER " + JTDeployer.address);

    const JYInstance = await deployProxy(JAave, [JATinstance.address, JFCinstance.address, JTDeployer.address,
      '0x357D51124f59836DeD84c8a1730D72B749d8BC23', WMATIC_ADDRESS, REWARD_TOKEN_ADDRESS, 15768000], { from: factoryOwner });
    console.log('AAVE_TRANCHE_ADDRESS', JYInstance.address);

    await deployer.deploy(WETHGateway, WMATIC_ADDRESS, JYInstance.address);
    const JWGinstance = await WETHGateway.deployed();
    console.log('WETH_GATEWAY', JWGinstance.address);

    // const JTDeployer = await JTranchesDeployer.at('0x68310EbB80883AbcB2bCd87A28855447d0CafeD1');
    await JTDeployer.setJAaveAddress(JYInstance.address, { from: factoryOwner });
    console.log('aave deployer 1');
    await JYInstance.setWETHGatewayAddress(JWGinstance.address, { from: factoryOwner });
    console.log('aave deployer 2');


    await JYInstance.setAavePoolAddressProvider(AAVE_POOL, { from: factoryOwner });
    console.log('aave deployer 3');

    await JYInstance.addTrancheToProtocol(MATIC_ADDRESS, amWMATIC_ADDRESS, "Tranche A - Aave Polygon MATIC", "aamMATIC", "Tranche B - Aave Polygon MATIC", "bamMATIC", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JYInstance.setTrancheDeposit(0, true, { from: factoryOwner });
    console.log('added tranche 1')
    await JYInstance.addTrancheToProtocol(DAI_ADDRESS, amDAI_ADDRESS, "Tranche A - Aave Polygon DAI", "aamDAI", "Tranche B - Aave Polygon DAI", "bamDAI", web3.utils.toWei("0.03", "ether"), 18, { from: factoryOwner });
    await JYInstance.setTrancheDeposit(1, true, { from: factoryOwner });
    console.log('added tranche 2')
    await JYInstance.addTrancheToProtocol(USDC_ADDRESS, amUSDC_ADDRESS, "Tranche A - Aave Polygon USDC", "aamUSDC", "Tranche B - Aave Polygon USDC", "bamUSDC", web3.utils.toWei("0.03", "ether"), 6, { from: factoryOwner });
    await JYInstance.setTrancheDeposit(2, true, { from: factoryOwner });
    console.log('added tranche 3');

    trParams = await JYInstance.trancheAddresses(0);
    let MaticTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let MaticTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JYInstance.trancheAddresses(1);
    let DaiTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let DaiTrB = await JTrancheBToken.at(trParams.BTrancheAddress);
    trParams = await JYInstance.trancheAddresses(2);
    let USDCTrA = await JTrancheAToken.at(trParams.ATrancheAddress);
    let USDCTrB = await JTrancheBToken.at(trParams.BTrancheAddress);

    console.log(`REACT_APP_AAVE_TRANCHE_TOKENS=${MaticTrA.address},${MaticTrB.address},${DaiTrA.address},${DaiTrB.address},${USDCTrA.address},${USDCTrB.address}`)
  }
}