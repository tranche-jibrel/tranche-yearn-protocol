// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// yDAI v2 Contract –– https://github.com/yearn/itoken/blob/master/contracts/YDAIv2.sol
interface IYToken is IERC20{
    function deposit(uint256 _amount) external;

    function withdraw(uint256 _shares) external;

    // function balanceOf(address account) external view returns (uint256);
    // function approve(address spender, uint256 amount) external returns (bool);
    // function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    // function transfer(address recipient, uint256 amount) external returns (bool);
}
