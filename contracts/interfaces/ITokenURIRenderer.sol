// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import '@openzeppelin/contracts/utils/Strings.sol';

interface ITokenURIRenderer {
    function disconnect() external view;

    function render(uint256 $id) external view returns (string memory);
}
