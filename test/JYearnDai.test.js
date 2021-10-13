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
const DAI_ABI = JSON.parse(fs.readFileSync('./test/utils/Dai.abi', 'utf8'));
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
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const yWETH_Address = '0x87b1f4cf9BD63f7BBD3eE1aD04E8F52540349347';
const yDAI_Address = '0xC2cB1040220768554cf699b0d863A3cd4324ce32';

const UnBlockedAccount = '0x5ad3330aebdd74d7dda641d37273ac1835ee9330';

let daiContract, jFCContract, jATContract, jTrDeplContract, jYearnContract;
let ethTrAContract, ethTrBContract, daiTrAContract, daiTrBContract;
let tokenOwner, user1;

const fromWei = (x) => web3.utils.fromWei(x.toString());
const toWei = (x) => web3.utils.toWei(x.toString());

contract("DAI JYearn", function(accounts) {
  it("ETH balances", async function () {
    //accounts = await web3.eth.getAccounts();
    tokenOwner = accounts[0];
    user1 = accounts[1];
    console.log(tokenOwner);
    console.log(await web3.eth.getBalance(tokenOwner));
    console.log(await web3.eth.getBalance(UnBlockedAccount));
  });

  it("DAI total Supply sent to user1", async function () {
    daiContract = new web3.eth.Contract(DAI_ABI, DAI_ADDRESS);
    // daiContract = await myERC20.deployed();
    result = await daiContract.methods.totalSupply().call();
    console.log(result.toString())
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(UnBlockedAccount).call()) + " DAI");
    // expect(fromWei(result.toString(), "ether")).to.be.equal(MYERC20_TOKEN_SUPPLY.toString());
    await daiContract.methods.transfer(user1, toWei(100)).send({from: UnBlockedAccount})
    console.log("UnBlockedAccount DAI balance: " + fromWei(await daiContract.methods.balanceOf(UnBlockedAccount).call()) + " DAI");
    console.log("user1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
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
    daiTrAContract = await JTrancheAToken.at(trParams1.ATrancheAddress);
    expect(daiTrAContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrAContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrAContract.address);

    daiTrBContract = await JTrancheBToken.at(trParams1.BTrancheAddress);
    expect(daiTrBContract.address).to.be.not.equal(ZERO_ADDRESS);
    expect(daiTrBContract.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log(daiTrBContract.address);

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

  // it("check if there are some DAI in unblocked account", async function () {
  //   console.log(await daiContract.methods.balanceOf(UnBlockedAccount).call())
  // });

  it("user1 buys some token daiTrA", async function () {
    trAddresses = await jYearnContract.trancheAddresses(1); //.cTokenAddress;
    console.log("addresses tranche A: " + JSON.stringify(trAddresses, ["buyerCoinAddress", "yTokenAddress", "ATrancheAddress", "BTrancheAddress"]));
    trPar = await jYearnContract.trancheParameters(1);
    console.log("param tranche A: " + JSON.stringify(trPar, ["trancheAFixedPercentage", "trancheALastActionBlock", "storedTrancheAPrice", "trancheACurrentRPB", "underlyingDecimals"]));
    tx = await jYearnContract.calcRPBFromPercentage(1, {from: user1});

    trPar = await jYearnContract.trancheParameters(1);
    console.log("rpb tranche A: " + trPar[3].toString());
    console.log("price tranche A: " + fromWei(trPar[2].toString()));
    trParams = await jYearnContract.trancheAddresses(1);
    expect(trParams.buyerCoinAddress).to.be.equal(DAI_ADDRESS);
    expect(trParams.yTokenAddress).to.be.equal(yDAI_Address);
    console.log("user1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");

    tx = await daiContract.methods.approve(jYearnContract.address, toWei(100)).send({from: user1});

    tx = await jYearnContract.buyTrancheAToken(1, toWei(10), {from: user1});

    console.log("user1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("user1 trA tokens: " + fromWei(await daiTrAContract.balanceOf(user1)) + " ayDAI");
    console.log("JYearn DAI balance: " + fromWei(await daiContract.methods.balanceOf(jYearnContract.address).call()) + " DAI");
    console.log("JYearn yDAI balance: " + fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    trPar = await jYearnContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    trAddresses = await jYearnContract.trancheAddresses(1); //.cTokenAddress;
    trPars = await jYearnContract.trancheParameters(1);
    // console.log("JYearn Price: " + await jCompHelperContract.getCompoundPriceHelper(1));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(1)) + "ayDAI");
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(1)) + "yDAI");

    stkDetails = await jYearnContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  });

  it("user1 buys some token daiTrB", async function () {
    console.log("User1 DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    trAddr = await jYearnContract.trancheAddresses(1);
    buyAddr = trAddr.buyerCoinAddress;
    console.log("Tranche Buyer Coin address: " + buyAddr);
    console.log("TrB value: " + fromWei(await jYearnContract.getTrBValue(1)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(1)));
    console.log("TrB total supply: " + fromWei(await daiTrBContract.totalSupply()));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(1)));
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(1, 0)));
    tx = await daiContract.methods.approve(jYearnContract.address, toWei(100)).send({from: user1});
    tx = await jYearnContract.buyTrancheBToken(1, toWei(10), {from: user1});
    console.log("User1 New DAI balance: " + fromWei(await daiContract.methods.balanceOf(user1).call()) + " DAI");
    console.log("User1 trB tokens: " + fromWei(await daiTrBContract.balanceOf(user1)) + " DTB");
    console.log("JYearn DAI balance: " + fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(1, 0)));
    trAddresses = await jYearnContract.trancheAddresses(1);
    trPar = await jYearnContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(1)));
    console.log("TrB value: " + fromWei(await jYearnContract.getTrBValue(1)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jYearnContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheB(user1, 1, 1);
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

  it("user1 redeems token daiTrA", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    tot = await daiTrAContract.totalSupply();
    console.log("trA tokens total: "+ fromWei(tot) + " DTA");
    console.log("JYearn yDai balance: "+ fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    tx = await daiTrAContract.approve(jYearnContract.address, bal, {from: user1});
    trPar = await jYearnContract.trancheParameters(1);
    console.log("TrA price: " + fromWei(trPar[2].toString()));
    tx = await jYearnContract.redeemTrancheAToken(1, bal, {from: user1});
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI");
    bal = await daiTrAContract.balanceOf(user1);
    console.log("User1 trA tokens: "+ fromWei(bal) + " DTA");
    console.log("User1 trA interest: "+ (newBal - oldBal) + " DAI");
    console.log("JYearn new DAI balance: "+ fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    console.log("JYearn TrA Value: " + fromWei(await jYearnContract.getTrAValue(1)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(1)));

    console.log("staker counter trA: " + (await jYearnContract.stakeCounterTrA(user1, 1)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheA(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
    stkDetails = await jYearnContract.stakingDetailsTrancheA(user1, 1, 2);
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

  it("user1 redeems token daiTrB", async function () {
    oldBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 Dai balance: "+ oldBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("JYearn cDai balance: "+ fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    tx = await daiTrBContract.approve(jYearnContract.address, bal, {from: user1});
    console.log("TrB price: " + fromWei(await jYearnContract.getTrancheBExchangeRate(1, 0)));
    console.log("TrB value: " +  fromWei(await jYearnContract.getTrBValue(1)));
    tx = await jYearnContract.redeemTrancheBToken(1, bal, {from: user1});
    newBal = fromWei(await daiContract.methods.balanceOf(user1).call());
    console.log("User1 New Dai balance: "+ newBal + " DAI");
    bal = await daiTrBContract.balanceOf(user1);
    console.log("User1 trB tokens: "+ fromWei(bal) + " DTB");
    console.log("User1 trB interest: "+ (newBal - oldBal) + " DAI");
    console.log("JYearn new DAI balance: "+ fromWei(await jYearnContract.getTokenBalance(yDAI_Address)) + " yDai");
    console.log("TrA Value: " + fromWei(await jYearnContract.getTrAValue(1)));
    console.log("TrB value: " +  fromWei(await jYearnContract.getTrBValue(1)));
    console.log("JYearn total Value: " + fromWei(await jYearnContract.getTotalValue(1)));

    console.log("staker counter trB: " + (await jYearnContract.stakeCounterTrB(user1, 1)).toString())
    stkDetails = await jYearnContract.stakingDetailsTrancheB(user1, 1, 1);
    console.log("startTime: " + stkDetails[0].toString() + ", amount: " + stkDetails[1].toString() )
  }); 

});