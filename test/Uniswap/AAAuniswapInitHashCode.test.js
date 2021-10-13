
// const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
  time,         // time utilities
} = require('@openzeppelin/test-helpers');

const Web3 = require('web3');
// Ganache UI on 8545
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

//const UniswapV2FactoryBytecode = require('@uniswap/v2-core/build/UniswapV2Factory.json').bytecode

const UniFactoryV2 = artifacts.require("UniFactoryV2");
// const UniFactoryV2 = contract.fromArtifact("UniswapV2Factory");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
// const UniswapV2Pair = artifacts.require("UniswapV2Pair");
// const UniswapV2Router02 = artifacts.require("UniswapV2Router02");

//const liquidityCalc = contract.fromArtifact("LiquidityValueCalculator");

// FACTORY
// mainnet
const factoryV1 = '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95' //V1
const factoryV2 = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' //V2

// testnet
const kovanFactory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'


// EXCHANGE
const kovanExchange = '0xFD5c5DAB526dB1Ea1c351f67b6CE99C9e6E304F4'


// ROUTER02 on all networks
const KovanRouter02 = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

const STABLE_COIN_AMOUNT1 = 150000;


contract('UniswapV2Library Init Hash code', function () {
  // const [ tokenOwner, factoryOwner, factoryAdmin, feeSetter ] = accounts;

    it('get the init hash code for library', async () => {
			// this.uniswapV2Factory = await UniswapV2Factory.new(feeSetter, { from: factoryOwner });
      uniV2Instance = await UniFactoryV2.at(factoryV2);
      console.log(uniV2Instance.address)
      console.log("init hash code: " + await uniV2Instance.getInitCodeHashPair())
      console.log("Please insert this hash in UniswapV2Library.sol at line 26 or so and recompile!")
    });

  });
