// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import '@openzeppelin/contracts/utils/Strings.sol';
import './interfaces/ITokenURIRenderer.sol';

contract FluxTokenURIRenderer is ITokenURIRenderer {
    /// @dev The URL to the metadata for the tokenURI.
    string public baseTokenURI;
    string public name;

    constructor(string memory $baseTokenURI, string memory $name) {
        baseTokenURI = $baseTokenURI;
        name = $name;
    }

    function disconnect() external view {
        // This is a stub function.
    }

    function render(uint256 $id) external view returns (string memory) {
        /// @dev The token ID without the encoding shift.
        uint256 tokenId = $id - (1 << 255) - 1;

        return
            string.concat(
                'data:application/json;utf8,{"name": "',
                name,
                ' #',
                Strings.toString(tokenId),
                '","description":"',
                name,
                '","external_url":"(null)","image":"',
                baseTokenURI,
                Strings.toString(tokenId),
                '","attributes":[{"trait_type":"type","value":"',
                name,
                '"}]}'
            );
    }
}
