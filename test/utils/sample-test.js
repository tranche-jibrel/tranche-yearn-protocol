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

// import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
// import {DAI_ADDRESS, DAI_ABI} from "./external_contracts.js";

// const { ethers} = require("ethers");
const { ethers } = require("hardhat");

const fs = require('fs');
const yVault_ABI_V1 = JSON.parse(fs.readFileSync('./test/yVaultV1.abi', 'utf8'));
const yVault_ABI_V2 = JSON.parse(fs.readFileSync('./test/yVaultV2.abi', 'utf8'));
const DAI_ABI = JSON.parse(fs.readFileSync('./test/Dai.abi', 'utf8'));
// console.log(JSON.stringify(contract.abi));
// console.log(JSON.stringify(yVault_ABI_V2));

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let myJYearn, myDaiContract, yVaultContract;
let accountToImpersonate, mySigner2;


const DAI_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f"

// const yVault_address = "0x19D3364A399d251E894aC732651be8B0E4e85001"; // vault DAI v2
const yVault_address = "0xACd43E627e64355f1861cEC6d3a6688B31a6F952"; // vault DAI v1


/// 📡 What chain are your contracts deployed to?
// const targetNetwork = NETWORKS.localhost; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 🏠 Your local provider is usually pointed at your local blockchain
// const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
// const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
// if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
// const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
// const blockExplorer = targetNetwork.blockExplorer;

describe("JYearn", function () {
  
  before(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.TEST_URI,
            blockNumber: 12960150,
          },
        },
      ],
    });
  });

  it('deployed contract', async function () {
    const JYearn = await ethers.getContractFactory("JYearn");
    myJYearn = await JYearn.deploy("0x3eE41C098f9666ed2eA246f4D2558010e59d63A0");
    await myJYearn.deployed();
    expect(myJYearn.address).to.be.not.equal(ZERO_ADDRESS);
    expect(myJYearn.address).to.match(/0x[0-9a-fA-F]{40}/);
    console.log("myJYearn: " + myJYearn.address);
    console.log(DAI_ADDRESS);
  });

  it('get some stables impersonating a real account', async function () {
    // const Token = await ethers.getContractFactory("MockERC20");
    // myToken = await Token.at("0xc969e16e63ff31ad4bcac3095c616644e6912d79");

    accountToImpersonate = "0x2f14C570932cE6D4cE87D510E629C628A27f6C10";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    // const signers = await ethers.getSigners();
    // mySigner = await signers[0].getAddress();
    // console.log(mySigner); 

    mySigner2 = await ethers.getSigner(accountToImpersonate);
    console.log(await mySigner2.getAddress());

    myDaiContract = new ethers.Contract(DAI_ADDRESS, DAI_ABI, mySigner2)
    bal = await myDaiContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(bal.toString()));

    // await network.provider.send("hardhat_setBalance", [
    //   "0x2f14C570932cE6D4cE87D510E629C628A27f6C10",
    //   "0x1000",
    // ]);

  });

  it("get some values from yearn system", async function () {
    ret = await myJYearn.yRegistry();
    console.log("YRegistry: " + ret);

    vLen = await myJYearn.getVaultsLength();
    console.log("YRegistry number of Vaults: " + ret.toString());

    res = await myJYearn.getVault(0);
    console.log(res);

    // await expectRevert(myJYearn.getVault(100), "InvalidArgumentWithParams(34, 100)");

    vaultAddresses = await myJYearn.getVaults();
    console.log(vaultAddresses);

    for (let i = 0; i < vLen; i++) {
      vault_ = vaultAddresses[i];
      console.log("Vaults #" + i + ": " + vault_);

      tok = await myJYearn.getVaultToken(vault_);
      console.log("Token #" + i + ": " + tok);

      ns = await myJYearn.getVaultNameSymbol(vault_);
      console.log("Vault #" + i + " name: " + ns[0] + ", symbol: " + ns[1]);

      isDel = await myJYearn.getDelegatedVaults(vault_);
      console.log(isDel);
      if ( i == 1) {
        console.log("");
        continue; // don't know why, #1 is delegated but it answer this like it is not....
      }
      if (isDel == false) {
        ret = await myJYearn.getVaultInfo(vault_);
        console.log("Controller: " + ret[0] + ", token: " + ret[1] + ", strategy: " + ret[2] + ", isWrapped: " + ret[3] + ", isDelegated: " + ret[4]);
      }

      console.log("");
    }
    
  });

  it("send some dai to vault #5 (yDAI)", async function () {
    bal = await myDaiContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(bal.toString()));

    await myDaiContract.approve(yVault_address, ethers.utils.parseEther("10.0"), {from: accountToImpersonate})

    yVaultContract = new ethers.Contract(yVault_address, yVault_ABI_V1, mySigner2)
	  // yVaultContract = new ethers.Contract(yVault_address, yVault_ABI_V2, mySigner2)
    await yVaultContract.deposit(ethers.utils.parseEther("10.0"), {from: accountToImpersonate})

    // pps = await yVaultContract.pricePerShare()
    // console.log(ethers.utils.formatEther(pps.toString()));

    nameVault = await yVaultContract.name()
    console.log(nameVault)

    symbVault = await yVaultContract.symbol()
    console.log(symbVault)

    decsVault = await yVaultContract.decimals()
    console.log(decsVault)

    ybal = await yVaultContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(ybal.toString()));

    bal = await myDaiContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(bal.toString()));
  });

  it("withdraw some ydai to vault #5 (yDAI) after 1 day", async function () {
    await network.provider.send("evm_increaseTime", [86400])
    await network.provider.send("evm_mine")

    ybal = await yVaultContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(ybal.toString()));
    
    // const yVaultContract = new ethers.Contract(yVault_address, yVault_ABI_V1, mySigner2)
    // await yVaultContract.withdrawAll({from: accountToImpersonate}) // only vaults v!
    await yVaultContract.withdraw(ybal, {from: accountToImpersonate})

    ybal = await yVaultContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(ybal.toString()));

    bal = await myDaiContract.balanceOf(accountToImpersonate);
    console.log(ethers.utils.formatEther(bal.toString()));
  });
});
