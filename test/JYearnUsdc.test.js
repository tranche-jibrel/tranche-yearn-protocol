require("dotenv").config();
const { expect } = require("chai");
const {
  BN,
  constants,
  ether,
  time,
  balance,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const fs = require('fs');
const yVault_ABI_V1 = JSON.parse(fs.readFileSync('./test/utils/yVaultV1.abi', 'utf8'));
const yVault_ABI_V2 = JSON.parse(fs.readFileSync('./test/utils/yVaultV2.abi', 'utf8'));
const USDC_ABI = JSON.parse(fs.readFileSync('./test/utils/Usdc.abi', 'utf8'));
// console.log(JSON.stringify(contract.abi));
// console.log(JSON.stringify(yVault_ABI_V2));

const myERC20 = artifacts.require("myERC20");

const JAdminTools = artifacts.require('JAdminTools');
const JFeesCollector = artifacts.require('JFeesCollector');

const JYearn = artifacts.require('JYearn');
const JTranchesDeployer = artifacts.require('JTranchesDeployer');

const JTrancheAToken = artifacts.require('JTrancheAToken');
const JTrancheBToken = artifacts.require('JTrancheBToken');

const MYERC20_TOKEN_SUPPLY = 5000000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const yWETH_Address = '0x87b1f4cf9BD63f7BBD3eE1aD04E8F52540349347';
const yUSDC_Address = '0xd6aD7a6750A7593E092a9B218d66C0A814a3436e';

const UnBlockedAccount = '0xAe2D4617c862309A3d75A0fFB358c7a5009c673F';

let usdcContract, jFCContract, jATContract, jTrDeplContract, jYearnContract;
let ethTrAContract, ethTrBContract, usdcTrAContract, usdcTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());
const fromWei6Dec = (x) => x / Math.pow(10, 6);
const toWei6Dec = (x) => x * Math.pow(10, 6);

contract("USDC JYearn", function(accounts) {
  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(UnBlockedAccount));
  });

  it("USDC total Supply sent to user1", async function () {
    usdcContract = new web3.eth.Contract(USDC_ABI, USDC_ADDRESS);
    result = await usdcContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(UnBlockedAccount).call()) + " USDC");
    // expect(fromWei(result.toString(), "ether")).to.be.equal(MYERC20_TOKEN_SUPPLY.toString());
    await usdcContract.methods.transfer(user1, 100000000).send({from: UnBlockedAccount})
    console.log("UnBlockedAccount USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(UnBlockedAccount).call()) + " USDC");
    console.log("user1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
  });

  it("All other contracts ok", async function () {
    jFCContract = await JFeesCollector.deployed();
    expect(jFCContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jFCContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jFCContract.address);

    jATContract = await JAdminTools.deployed();
    expect(jATContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jATContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jATContract.address);

    jTrDeplContract = await JTranchesDeployer.deployed();
    expect(jTrDeplContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jTrDeplContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jTrDeplContract.address);

    jYearnContract = await JYearn.deployed();
    expect(jYearnContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(jYearnContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(jYearnContract.address);
    // await jYearnContract.setRedemptionTimeout(0, {
    //   from: accounts[0]
    // });

    trParams0 = await jYearnContract.trancheAddresses(0);
    ethTrAContract = await JTrancheAToken.at(trParams0.ATrancheAddress);
    expect(ethTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrAContract.address);

    ethTrBContract = await JTrancheBToken.at(trParams0.BTrancheAddress);
    expect(ethTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(ethTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(ethTrBContract.address);

    trParams1 = await jYearnContract.trancheAddresses(1);
    usdcTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(usdcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrAContract.address);

    usdcTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(usdcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrBContract.address);

    trParams2 = await jYearnContract.trancheAddresses(2);
    usdcTrAContract = await JTrancheAToken.at(trParams2.ATrancheAddress);
    expect(usdcTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrAContract.address);

    usdcTrBContract = await JTrancheBToken.at(trParams2.BTrancheAddress);
    expect(usdcTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(usdcTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(usdcTrBContract.address);
  });

  it('changing reward token address', async function () {
    rewTok = await jYearnContract.rewardsToken()
    console.log(rewTok)
    await ethTrAContract.setRewardTokenAddress("0xc00e94cb662c3520282e6f5717214004a7f26888", {from: tokenOwner})
    await ethTrAContract.setRewardTokenAddress(rewTok, {from: tokenOwner})
  });

  // it("check if there are some USDC in unblocked account", async function () {
  //   console.log(await usdcContract.methods.balanceOf(UnBlockedAccount).call())
  // });

  it("user1 buys some token usdcTrA", async function () {
    trAddresses = await jYearnContract.trancheAddresses(2); //.cTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "yTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jYearnContract.trancheParameters(2);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", "trancheACurrentRPB", "underlyingDecimals"]));
    tx = await jYearnContract.calcRPBFromPercentage(2, {from: user1});

    trPar = await jYearnContract.trancheParameters(2);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + fromWei(trPar[2].toString()));
    trParams = await jYearnContract.trancheAddresses(2);
    expect(trParams.buyerCoinAddress).to.be.equal(USDC_ADDRESS);
    expect(trParams.yTokenAddress).to.be.equal(yUSDC_Address);

    console.log("user1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");

    tx = await usdcContract.methods.approve(jYearnContract.address, toWei6Dec(100)).send({from: user1});

    tx = await jYearnContract.buyTrancheAToken(2, toWei6Dec(10), {from: user1});

    console.log("user1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("user1 trA tokens: " + fromWei(await usdcTrAContract.balanceOf(user1)) + " ayUSDC");
    console.log("JYearn USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(jYearnContract.address).call()) + " USDC");
    console.log("JYearn yDAI balance: " + fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    trPar = await jYearnContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jYearnContract.trancheAddresses(2); //.cTokenAddress;
    trPars = await jYearnContract.trancheParameters(2);
    // console.log("JYearn Price: " + await jCompHelperContract.getCompoundPriceHelper(1));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(2)) + " ayUSDC");
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(2)) + " yUSDC");

    stkDetails = await jYearnContract.stakingDetailsTrancheA(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token usdcTrB", async function () {
    console.log("User1 USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    trAddr = await jYearnContract.trancheAddresses(2);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jYearnContract.getTrBValue(2)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(2)));
    console.log("TrB total supply: " + fromWei(await usdcTrBContract.totalSupply()));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(2)));
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(2, 0)));
    tx = await usdcContract.methods.approve(jYearnContract.address, toWei(100)).send({from: user1});
    tx = await jYearnContract.buyTrancheBToken(2, toWei6Dec(10), {from: user1});
    console.log("User1 New USDC balance: " + fromWei6Dec(await usdcContract.methods.balanceOf(user1).call()) + " USDC");
    console.log("User1 trB tokens: " + fromWei(await usdcTrBContract.balanceOf(user1)) + " byUSDC");
    console.log("JYearn USDC balance: " + fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(2, 0)));
    trAddresses = await jYearnContract.trancheAddresses(2);
    trPar = await jYearnContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(2)));
    console.log("TrB value: " + fromWei(await jYearnContract.getTrBValue(2)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(2)));

    console.log("staker counter trB: " + (await jYearnContract.stakeCounterTrB(user1, 2)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheB(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdcTrA", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 Usdc balance: "+ oldBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " ayUSDC");
    tot = await usdcTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " ayUSDC");
    console.log("JYearn yUsdc balance: "+ fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    tx = await usdcTrAContract.approve(jYearnContract.address, bal, {from: user1});
    trPar = await jYearnContract.trancheParameters(2);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    tx = await jYearnContract.redeemTrancheAToken(2, bal, {from: user1});
    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New Usdc balance: "+ newBal + " USDC");
    bal = await usdcTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " ayUSDC");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " USDC");
    console.log("JYearn new yUSDC balance: "+ fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(2)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(2)));

    console.log("staker counter trA: " + (await jYearnContract.stakeCounterTrA(user1, 2)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheA(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

  it('time passes...', async function () {
    let block = await web3.eth.getBlock("latest");
    console.log("Actual Block: " + block.number);
    newBlock = block.number + 100;
    await time.advanceBlockTo(newBlock);
    block = await web3.eth.getBlock("latest");
    console.log("New Actual Block: " + block.number);
  });

  it("user1 redeems token usdcTrB", async function () {
    oldBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1  Usdc balance: "+ oldBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " byUSDC");
    console.log("JYearn cDai balance: "+ fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    tx = await usdcTrBContract.approve(jYearnContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(2, 0)));
    console.log("TrB value: " +  fromWei(await jYearnContract.getTrBValue(2)));
    tx = await jYearnContract.redeemTrancheBToken(2, bal, {from: user1});
    newBal = fromWei6Dec(await usdcContract.methods.balanceOf(user1).call());
    console.log("User1 New  Usdc balance: "+ newBal + " USDC");
    bal = await usdcTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " byUSDC");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " USDC");
    console.log("JYearn new USDC balance: "+ fromWei(await jYearnContract.getTokenBalance(yUSDC_Address)) + " yUsdc");
    console.log("TrA Value: " + fromWei(await jYearnContract.getTrAValue(2)));
    console.log("TrB value: " +  fromWei(await jYearnContract.getTrBValue(2)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(2)));

    console.log("staker counter trB: " + (await jYearnContract.stakeCounterTrB(user1, 2)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheB(user1, 2, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

});
