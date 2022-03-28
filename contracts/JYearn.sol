// SPDX-License-Identifier: MIT
/**
 * Created on 2021-02-11
 * @summary: Jibrel Aave Tranche Protocol
 * @author: Jibrel Team
 */
pragma solidity ^0.8.0;


import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./interfaces/IJAdminTools.sol";
import "./interfaces/IJTrancheTokens.sol";
import "./interfaces/IJTranchesDeployer.sol";
import "./JYearnStorage.sol";
import "./interfaces/IJYearn.sol";
import "./interfaces/IWETHGateway.sol";
import "./interfaces/IYToken.sol";
import "./interfaces/IYearnRewards.sol";


contract JYearn is OwnableUpgradeable, ReentrancyGuardUpgradeable, JYearnStorage, IJYearn {
    using SafeMathUpgradeable for uint256;

    /**
     * @dev contract initializer
     * @param _adminTools price oracle address
     * @param _feesCollector fees collector contract address
     * @param _tranchesDepl tranches deployer contract address
     */
    function initialize(address _adminTools, 
            address _feesCollector, 
            address _tranchesDepl) external initializer() {
        OwnableUpgradeable.__Ownable_init();
        adminToolsAddress = _adminTools;
        feesCollectorAddress = _feesCollector;
        tranchesDeployerAddress = _tranchesDepl;
        redeemTimeout = 3; //default
    }

    /**
     * @dev admins modifiers
     */
    modifier onlyAdmins() {
        require(IJAdminTools(adminToolsAddress).isAdmin(msg.sender), "JYearn: not an Admin");
        _;
    }

    fallback() external payable {
        revert('Fallback not allowed');
    }
    receive() external payable {
        revert('Receive not allowed');
    }

    /**
     * @dev set new addresses for price oracle, fees collector and tranche deployer 
     * @param _adminTools price oracle address
     * @param _feesCollector fees collector contract address
     * @param _tranchesDepl tranches deployer contract address
     */
    function setNewEnvironment(address _adminTools, 
            address _feesCollector, 
            address _tranchesDepl) external onlyOwner{
        require((_adminTools != address(0)) && (_feesCollector != address(0)) && (_tranchesDepl != address(0)), "JYearn: check addresses");
        adminToolsAddress = _adminTools;
        feesCollectorAddress = _feesCollector;
        tranchesDeployerAddress = _tranchesDepl;
    }

    /**
     * @dev set YFI token and rewards on the specific blockchain
     * on Ethereum blockchain:
     * YFI_TOKEN_ADDRESS = 0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e;
     * YFI_REWARDS_ADDRESS = 0xcc9EFea3ac5Df6AD6A656235Ef955fBfEF65B862;
     * @param _yfiToken YFI token address
     * @param _yfiRewards YFI rewards address
     */
    function setYFIAddresses(address _yfiToken, address _yfiRewards) external onlyAdmins {
        require(_yfiToken != address(0) && _yfiRewards != address(0), "JYearn: not valid YFI addresses");
        yfiTokenAddress = _yfiToken;
        yfiRewardsAddress = _yfiRewards;
    }

    /**
     * @dev set decimals on the underlying token of a tranche
     * @param _trancheNum tranche number
     * @param _underlyingDec underlying token decimals
     */
    function setDecimals(uint256 _trancheNum, uint8 _underlyingDec) external onlyAdmins {
        require(_underlyingDec <= 18, "JYearn: too many decimals");
        trancheParameters[_trancheNum].underlyingDecimals = _underlyingDec;
    }

    /**
     * @dev set tranche redemption percentage
     * @param _trancheNum tranche number
     * @param _redeemPercent user redemption percent
     */
    function setTrancheRedemptionPercentage(uint256 _trancheNum, uint16 _redeemPercent) external onlyAdmins {
        trancheParameters[_trancheNum].redemptionPercentage = _redeemPercent;
    }

    /**
     * @dev set redemption timeout
     * @param _blockNum timeout (in block numbers)
     */
    function setRedemptionTimeout(uint32 _blockNum) external onlyAdmins {
        redeemTimeout = _blockNum;
    }

    /**
     * @dev set new token and if is a vault or not
     * @param _trancheNum tranche number
     * @param _yTokenAddress yToken or yVault address
     * @param _isVault vault or token
     */
    function setNewYToken(uint256 _trancheNum, address _yTokenAddress, bool _isVault) external onlyAdmins {
        require(_trancheNum < tranchePairsCounter, "JYearn: tranche number too high");
        require(_yTokenAddress != address(0), "JYearn: yToken address not allowed");
        trancheAddresses[_trancheNum].yTokenAddress = _yTokenAddress;
        trancheAddresses[_trancheNum].isVault = _isVault;
    }

    /**
     * @dev migrate tranche values to another contract
     * @param _trancheNum tranche number
     * @param _newYTokenAddress yToken or yVault address
     * @param _isVault vault or token
     */
    function migrateYTranche(uint256 _trancheNum, address _newYTokenAddress, bool _isVault) external onlyAdmins {
        require(_trancheNum < tranchePairsCounter, "JYearn: tranche number too high");
        require(_newYTokenAddress != address(0), "JYearn: yToken address not allowed");
        uint256 totProtSupply = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);
        yearnWithdraw(_trancheNum, totProtSupply);
        trancheAddresses[_trancheNum].yTokenAddress = _newYTokenAddress;
        trancheAddresses[_trancheNum].isVault = _isVault;
        uint256 totUnderBalance = getTokenBalance(trancheAddresses[_trancheNum].buyerCoinAddress);
        IERC20Upgradeable(trancheAddresses[_trancheNum].buyerCoinAddress).approve(_newYTokenAddress, totUnderBalance);
        IYToken(_newYTokenAddress).deposit(totUnderBalance);
    }

    /**
     * @dev set tranche redemption percentage scaled by 1e18
     * @param _trancheNum tranche number
     * @param _newTrAPercentage new tranche A RPB
     */
    function setTrancheAFixedPercentage(uint256 _trancheNum, uint256 _newTrAPercentage) external onlyAdmins {
        trancheParameters[_trancheNum].trancheAFixedPercentage = _newTrAPercentage;
        trancheParameters[_trancheNum].storedTrancheAPrice = setTrancheAExchangeRate(_trancheNum);
    }

    function addTrancheToProtocol(address _buyerCoinAddress, 
            address _yTokenAddress, 
            bool _isVault,
            string memory _nameA, 
            string memory _symbolA, 
            string memory _nameB, 
            string memory _symbolB, 
            uint256 _fixPercentage, 
            uint8 _underlyingDec) external onlyAdmins nonReentrant {
        require(tranchesDeployerAddress != address(0), "JYearn: set tranche eth deployer");

        trancheAddresses[tranchePairsCounter].buyerCoinAddress = _buyerCoinAddress;
        trancheAddresses[tranchePairsCounter].yTokenAddress = _yTokenAddress;
        trancheAddresses[tranchePairsCounter].isVault = _isVault;
        trancheAddresses[tranchePairsCounter].ATrancheAddress = 
                IJTranchesDeployer(tranchesDeployerAddress).deployNewTrancheATokens(_nameA, _symbolA, tranchePairsCounter);
        trancheAddresses[tranchePairsCounter].BTrancheAddress = 
                IJTranchesDeployer(tranchesDeployerAddress).deployNewTrancheBTokens(_nameB, _symbolB, tranchePairsCounter); 
        
        trancheParameters[tranchePairsCounter].underlyingDecimals = _underlyingDec;
        trancheParameters[tranchePairsCounter].trancheAFixedPercentage = _fixPercentage;
        trancheParameters[tranchePairsCounter].trancheALastActionTime = block.timestamp;

        trancheParameters[tranchePairsCounter].storedTrancheAPrice = uint256(1e18);

        trancheParameters[tranchePairsCounter].redemptionPercentage = 10000;  //default value 100%, no fees

        // add tokens in adminTools contracts so they can change staking details
        // IJAdminTools(adminToolsAddress).addAdmin(trancheAddresses[tranchePairsCounter].ATrancheAddress);
        // IJAdminTools(adminToolsAddress).addAdmin(trancheAddresses[tranchePairsCounter].BTrancheAddress);

        calcRPSFromPercentage(tranchePairsCounter); // initialize tranche A RPB

        emit TrancheAddedToProtocol(tranchePairsCounter, trancheAddresses[tranchePairsCounter].ATrancheAddress, trancheAddresses[tranchePairsCounter].BTrancheAddress);

        tranchePairsCounter = tranchePairsCounter.add(1);
    } 

    /**
     * @dev enables or disables tranche deposit (default: disabled)
     * @param _trancheNum tranche number
     * @param _enable true or false
     */
    function setTrancheDeposit(uint256 _trancheNum, bool _enable) external onlyAdmins {
        trancheDepositEnabled[_trancheNum] = _enable;
    }

    /**
     * @dev deposit in yearn tokens
     * @param _trNum tranche number
     * @param _amount amount of token to be deposited in yearn token or vault
     */
    function yearnDeposit(uint256 _trNum, uint256 _amount) internal {
        address origToken = trancheAddresses[_trNum].buyerCoinAddress;
        address yToken = trancheAddresses[_trNum].yTokenAddress;

        IERC20Upgradeable(origToken).approve(yToken, _amount);

        IYToken(yToken).deposit(_amount);
    }

    /**
     * @dev withdraw from yearn tokens
     * @param _trNum tranche number
     * @param _yAmount amount of ytokens to be redeemed from yearn token or vault
     */
    function yearnWithdraw(uint256 _trNum, uint256 _yAmount) internal returns (bool) {
        address yToken = trancheAddresses[_trNum].yTokenAddress;

        if (_yAmount > IYToken(yToken).balanceOf(address(this)))
            _yAmount = IYToken(yToken).balanceOf(address(this));

        IYToken(yToken).withdraw(_yAmount);

        return true;
    }
    
    /**
     * @dev set Tranche A exchange rate
     * @param _trancheNum tranche number
     * @return tranche A token current price
     */
    function setTrancheAExchangeRate(uint256 _trancheNum) internal returns (uint256) {
        calcRPSFromPercentage(_trancheNum);
        uint256 deltaTime = (block.timestamp).sub(trancheParameters[_trancheNum].trancheALastActionTime);
        uint256 deltaPrice = (trancheParameters[_trancheNum].trancheACurrentRPS).mul(deltaTime);
        trancheParameters[_trancheNum].storedTrancheAPrice = (trancheParameters[_trancheNum].storedTrancheAPrice).add(deltaPrice);
        trancheParameters[_trancheNum].trancheALastActionTime = block.timestamp;
        return trancheParameters[_trancheNum].storedTrancheAPrice;
    }

    /**
     * @dev get Tranche A exchange rate
     * @param _trancheNum tranche number
     * @return tranche A token current price
     */
    function getTrancheAExchangeRate(uint256 _trancheNum) public view returns (uint256) {
        return trancheParameters[_trancheNum].storedTrancheAPrice;
    }

    /**
     * @dev get RPB for a given percentage (expressed in 1e18)
     * @param _trancheNum tranche number
     * @return RPB for a fixed percentage
     */
    function getTrancheACurrentRPS(uint256 _trancheNum) external view returns (uint256) {
        return trancheParameters[_trancheNum].trancheACurrentRPS;
    }

    /**
     * @dev get Tranche A exchange rate per seconds (tokens with 18 decimals)
     * @param _trancheNum tranche number
     * @return tranche A token RPS
     */
    function calcRPSFromPercentage(uint256 _trancheNum) public returns (uint256) {
        trancheParameters[_trancheNum].trancheACurrentRPB = trancheParameters[_trancheNum].storedTrancheAPrice
                        .mul(trancheParameters[_trancheNum].trancheAFixedPercentage).div(SECONDS_PER_YEAR).div(1e18);
        return trancheParameters[_trancheNum].trancheACurrentRPS;
    }

    /**
     * @dev get price for yTokens
     * @param _trancheNum tranche number
     * @return yToken price
     */
    function getYTokenNormPrice(uint256 _trancheNum) public view returns (uint256){
        uint256 tmpPrice = IYToken(trancheAddresses[_trancheNum].yTokenAddress).getPricePerFullShare();
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 yTokenNormPrice = tmpPrice.mul(10 ** diffDec);
        return yTokenNormPrice;
    }

    /**
     * @dev get price for yVaults
     * @param _trancheNum tranche number
     * @return yVault price
     */
    function getYVaultNormPrice(uint256 _trancheNum) public view returns (uint256){
        uint256 tmpPrice = IYToken(trancheAddresses[_trancheNum].yTokenAddress).pricePerShare();
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 yVaultNormPrice = tmpPrice.mul(10 ** diffDec);
        return yVaultNormPrice;
    }

    /**
     * @dev get Tranche A value in underlying tokens
     * @param _trancheNum tranche number
     * @return trANormValue tranche A value in underlying tokens
     */
    function getTrAValue(uint256 _trancheNum) public view returns (uint256 trANormValue) {
        uint256 totASupply = IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress).totalSupply();
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        trANormValue = totASupply.mul(getTrancheAExchangeRate(_trancheNum)).div(1e18).div(10 ** diffDec);
        return trANormValue;
    }

    /**
     * @dev get Tranche B value in underlying tokens
     * @param _trancheNum tranche number
     * @return tranche B value in underlying tokens
     */
    function getTrBValue(uint256 _trancheNum) public view returns (uint256) {
        uint256 totProtValue = getTotalValue(_trancheNum);
        uint256 totTrAValue = getTrAValue(_trancheNum);
        if (totProtValue > totTrAValue) {
            return totProtValue.sub(totTrAValue);
        } else
            return 0;
    }

    /**
     * @dev get Tranche total value in underlying tokens
     * @param _trancheNum tranche number
     * @return tranche total value in underlying tokens
     */
    function getTotalValue(uint256 _trancheNum) public view returns (uint256) {
        uint256 yPrice;
        if (trancheAddresses[_trancheNum].isVault)
            yPrice = getYVaultNormPrice(_trancheNum);
        else
            yPrice = getYTokenNormPrice(_trancheNum);

        uint256 totProtSupply = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);

        return totProtSupply.mul(yPrice).div(1e18);
    }

    /**
     * @dev get Tranche B exchange rate
     * @param _trancheNum tranche number
     * @return tbPrice tranche B token current price
     */
    function getTrancheBExchangeRate(uint256 _trancheNum) public view returns (uint256 tbPrice) {
        // set amount of tokens to be minted via taToken price
        // Current tbDai price = ((aDai-(aSupply X taPrice)) / bSupply)
        // where: aDai = How much aDai we hold in the protocol
        // aSupply = Total number of taDai in protocol
        // taPrice = taDai / Dai price
        // bSupply = Total number of tbDai in protocol
        
        uint256 totBSupply = IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress).totalSupply(); // 18 decimals
        if (totBSupply > 0) {
            uint256 totProtValue = getTotalValue(_trancheNum); //underlying token decimals
            uint256 totTrAValue = getTrAValue(_trancheNum); //underlying token decimals
            uint256 totTrBValue = totProtValue.sub(totTrAValue); //underlying token decimals
            // if normalized price in tranche A price, everything should be scaled to 1e18 
            uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
            totTrBValue = totTrBValue.mul(10 ** diffDec);
            tbPrice = totTrBValue.mul(1e18).div(totBSupply);
        } else {
            tbPrice = uint256(1e18);
        }
        return tbPrice;
    }

    /**
     * @dev buy Tranche A Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function buyTrancheAToken(uint256 _trancheNum, uint256 _amount) external payable nonReentrant {
        require(trancheDepositEnabled[_trancheNum], "JYearn: tranche deposit disabled");
        uint256 prevYTokenBalance = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);
        address _tokenAddr = trancheAddresses[_trancheNum].buyerCoinAddress;
        // check approve
        require(IERC20Upgradeable(_tokenAddr).allowance(msg.sender, address(this)) >= _amount, "JYearn: allowance failed buying tranche A");
        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(_tokenAddr), msg.sender, address(this), _amount);
        yearnDeposit(_trancheNum, _amount);

        uint256 newYTokenBalance = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);
        setTrancheAExchangeRate(_trancheNum);
        uint256 taAmount;
        if (newYTokenBalance > prevYTokenBalance) {
            // set amount of tokens to be minted calculate taToken amount via taToken price
            // if normalized price in tranche A price, everything should be scaled to 1e18 
            uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
            uint256 normAmount = _amount.mul(10 ** diffDec);
            taAmount = normAmount.mul(1e18).div(trancheParameters[_trancheNum].storedTrancheAPrice);
            IJTrancheTokens(trancheAddresses[_trancheNum].ATrancheAddress).mint(msg.sender, taAmount);
        }

        lastActivity[msg.sender] = block.number;
        emit TrancheATokenMinted(_trancheNum, msg.sender, _amount, taAmount);
    }

    function redeemYTokens(uint256 _trancheNum, uint256 _amount, bool isTrancheA) internal view returns (uint256) {
        uint256 tokVal;
        if (isTrancheA) 
            tokVal = _amount.mul(trancheParameters[_trancheNum].storedTrancheAPrice).div(1e18);
        else
            tokVal = _amount.mul(getTrancheBExchangeRate(_trancheNum)).div(1e18);
        // everything should be scaled to 1e18 
        uint256 diffDec;
        uint256 normAmount = tokVal;
        if (trancheParameters[_trancheNum].underlyingDecimals < 18) {
            diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
            normAmount = tokVal.div(10 ** diffDec);
        }
        // not sure about this, but it should be checked
        uint256 trTotAmount;
        if (isTrancheA)
            trTotAmount = getTrAValue(_trancheNum);
        else
            trTotAmount = getTrBValue(_trancheNum);
        if (normAmount > trTotAmount)
            normAmount = trTotAmount;

        uint256 tempYPrice;
        if (trancheAddresses[_trancheNum].isVault)
            tempYPrice = getYVaultNormPrice(_trancheNum);  // price per full share
        else
            tempYPrice = getYTokenNormPrice(_trancheNum);
        uint256 redeemAmount = (normAmount.mul(1e18).div(tempYPrice));
        return redeemAmount;
    }

    function getUserAmount(address origToken, uint256 _trancheNum, uint256 _amount, bool _isTrancheA) internal returns(uint256, uint256){
        uint256 startBal = IERC20Upgradeable(origToken).balanceOf(address(this));
        uint256 tokensToRedeem;
        if (_isTrancheA)
            tokensToRedeem = redeemYTokens(_trancheNum, _amount, true);
        else
            tokensToRedeem = redeemYTokens(_trancheNum, _amount, false);
        bool ret = yearnWithdraw(_trancheNum, tokensToRedeem);
        uint256 endBal;
        uint256 diffBal;
        if (ret) {
            endBal = IERC20Upgradeable(origToken).balanceOf(address(this));
            
            if(endBal >= startBal) {
                diffBal = endBal.sub(startBal);
            } else {
                diffBal = endBal;
            }
        }
        uint256 redemptionPercent = uint256(trancheParameters[_trancheNum].redemptionPercentage);
        uint256 userAmount = diffBal.mul(redemptionPercent).div(PERCENT_DIVIDER);
        return (diffBal, userAmount);
    }

    /**
     * @dev redeem Tranche A Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function redeemTrancheAToken(uint256 _trancheNum, uint256 _amount) external nonReentrant {
        require((block.number).sub(lastActivity[msg.sender]) >= redeemTimeout, "JYearn: redeem timeout not expired on tranche A");
        // check approve
        require(IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress).allowance(msg.sender, address(this)) >= _amount, 
                "JYearn: allowance failed redeeming tranche A");
        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(trancheAddresses[_trancheNum].ATrancheAddress), msg.sender, address(this), _amount);

        setTrancheAExchangeRate(_trancheNum);

        address origToken = trancheAddresses[_trancheNum].buyerCoinAddress;

        (uint256 diffBal, uint256 userAmount) = getUserAmount(origToken, _trancheNum, _amount, true);
        uint256 tmpBal = diffBal;

        if (diffBal > 0) {
            if(userAmount <= diffBal) {
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), msg.sender, userAmount);
                tmpBal = tmpBal.sub(userAmount);
            } else {
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), msg.sender, diffBal);
                tmpBal = 0;
            }
        }

        uint256 feesAmount = diffBal.sub(userAmount);
        if (tmpBal > 0 && feesAmount > 0) {
            if (feesAmount <= tmpBal)
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), feesCollectorAddress, feesAmount);
            else
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), feesCollectorAddress, tmpBal);
        }

        IJTrancheTokens(trancheAddresses[_trancheNum].ATrancheAddress).burn(_amount);
        lastActivity[msg.sender] = block.number;
        emit TrancheATokenRedemption(_trancheNum, msg.sender, _amount, userAmount, feesAmount);
    }

    /**
     * @dev buy Tranche B Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function buyTrancheBToken(uint256 _trancheNum, uint256 _amount) external payable nonReentrant {
        require(trancheDepositEnabled[_trancheNum], "JYearn: tranche deposit disabled");
        // refresh value for tranche A
        setTrancheAExchangeRate(_trancheNum);
        // get tranche B exchange rate
        // if normalized price in tranche B price, everything should be scaled to 1e18 
        uint256 diffDec = uint256(18).sub(uint256(trancheParameters[_trancheNum].underlyingDecimals));
        uint256 normAmount = _amount.mul(10 ** diffDec);
        uint256 tbAmount = normAmount.mul(1e18).div(getTrancheBExchangeRate(_trancheNum));
        uint256 prevYTokenBalance = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);
        address _tokenAddr = trancheAddresses[_trancheNum].buyerCoinAddress;
        // check approve
        require(IERC20Upgradeable(_tokenAddr).allowance(msg.sender, address(this)) >= _amount, "JYearn: allowance failed buying tranche B");
        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(_tokenAddr), msg.sender, address(this), _amount);
        yearnDeposit(_trancheNum, _amount);

        uint256 newYTokenBalance = getTokenBalance(trancheAddresses[_trancheNum].yTokenAddress);
        if (newYTokenBalance > prevYTokenBalance) {
            IJTrancheTokens(trancheAddresses[_trancheNum].BTrancheAddress).mint(msg.sender, tbAmount);
        } else 
            tbAmount = 0;

        lastActivity[msg.sender] = block.number;
        emit TrancheBTokenMinted(_trancheNum, msg.sender, _amount, tbAmount);
    }

    /**
     * @dev redeem Tranche B Tokens
     * @param _trancheNum tranche number
     * @param _amount amount of stable coins sent by buyer
     */
    function redeemTrancheBToken(uint256 _trancheNum, uint256 _amount) external nonReentrant {
        require((block.number).sub(lastActivity[msg.sender]) >= redeemTimeout, "JYearn: redeem timeout not expired on tranche B");
        // check approve
        require(IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress).allowance(msg.sender, address(this)) >= _amount, 
                "JYearn: allowance failed redeeming tranche B");

        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(trancheAddresses[_trancheNum].BTrancheAddress), msg.sender, address(this), _amount);

        setTrancheAExchangeRate(_trancheNum);

        address origToken = trancheAddresses[_trancheNum].buyerCoinAddress;

        (uint256 diffBal, uint256 userAmount) = getUserAmount(origToken, _trancheNum, _amount, false);
        uint256 tmpBal = diffBal;

        if (diffBal > 0) {
            if(userAmount <= diffBal) {
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), msg.sender, userAmount);
                tmpBal = tmpBal.sub(userAmount);
            } else {
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), msg.sender, diffBal);
                tmpBal = 0;
            }
        }

        uint256 feesAmount = diffBal.sub(userAmount);
        if (tmpBal > 0 && feesAmount > 0) {
            if (feesAmount <= tmpBal)
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), feesCollectorAddress, feesAmount);
            else
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(origToken), feesCollectorAddress, tmpBal);
        }

        IJTrancheTokens(trancheAddresses[_trancheNum].BTrancheAddress).burn(_amount);
        lastActivity[msg.sender] = block.number;
        emit TrancheBTokenRedemption(_trancheNum, msg.sender, _amount, userAmount, feesAmount);
    }

    /**
     * @dev get every token balance in this contract
     * @param _tokenContract token contract address
     */
    function getTokenBalance(address _tokenContract) public view returns (uint256) {
        return IERC20Upgradeable(_tokenContract).balanceOf(address(this));
    }

    /**
     * @dev transfer tokens in this contract to fees collector contract
     * @param _tokenContract token contract address
     * @param _amount token amount to be transferred 
     */
    function transferTokenToFeesCollector(address _tokenContract, uint256 _amount) external onlyAdmins {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(_tokenContract), feesCollectorAddress, _amount);
    }
    
    /**
     * @dev get token rewards amount (only if some YFI token are inside contract)
     * @return amount of unclaimed tokens
     */
    function getYFIUnclaimedRewardShares() public view returns(uint256) {
        require(yfiRewardsAddress != address(0), "JYearn: not a valid YFI reward address");
        return IYearnRewards(yfiRewardsAddress).claimable(address(this));
    }

    /**
     * @dev claim token rewards if YFI tokens are staked into this contract, exchanging YFI token for adai tokens
     * @param _amount amount of YFI token to requested rewards on it
     */
    function claimYearnRewards(uint256 _amount) external {
        require(yfiTokenAddress != address(0) && yfiRewardsAddress != address(0), "JYearn: not valid YFI addresses");
        uint256 yfiBalance = IERC20Upgradeable(yfiTokenAddress).balanceOf(address(this));
        require(yfiBalance > 0, "JYearn: not enough YFI tokens to claim rewards");

        IYearnRewards(yfiRewardsAddress).claim(_amount);
    }

}