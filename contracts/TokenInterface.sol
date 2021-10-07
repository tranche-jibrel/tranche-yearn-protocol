// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract TokenInterface {
    function deposit() external virtual payable;
    function withdraw(uint256) external virtual;
}
