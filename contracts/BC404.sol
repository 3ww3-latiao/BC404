// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './ERC404V2.sol';
import './interfaces/ITokenURIRenderer.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import 'hardhat/console.sol';

contract BC404 is ERC404V2, Ownable {
    /// @dev The URL to the metadata for the tokenURI.
    string public baseTokenURI;

    /// @dev Slot for contract render.
    ITokenURIRenderer public renderer;

    /// @dev The maximum number of NFT that can be minted.
    uint256 public maxMintedCount;

    error TokenInvalid();

    /// @dev Addresses whitelisted from minting / burning for gas savings (pairs, routers, etc)
    mapping(address => bool) public whitelist;

    uint16 public incrementalUnit;
    uint8 public incrementalCalculation = 1;
    uint8 public constant ARITHMETIC_PROGRESSION = 1;
    uint8 public constant GEOMETRIC_PROGRESSION = 2;
    uint16 public constant PERCENT = 10000;

    constructor(
        string memory $name,
        string memory $symbol,
        address $admin,
        uint256 $totalSupply,
        string memory $baseTokenURI,
        uint256 $minted,
        uint256 $maxMintedCount,
        uint16 $incrementalUnit,
        uint8 $incrementalCalculation
    ) ERC404V2($name, $symbol, 18) Ownable(msg.sender) {
        baseTokenURI = $baseTokenURI;

        setERC721TransferExempt(address(this), true);
        setERC721TransferExempt($admin, true);
        setERC721TransferExempt(msg.sender, true);

        _mintERC20($admin, $totalSupply);

        /// reset transfer count
        minted = $minted;
        maxMintedCount = $maxMintedCount;
        incrementalUnit = $incrementalUnit;
        incrementalCalculation = $incrementalCalculation;

        /// transfer ownership to admin
        transferOwnership($admin);
    }

    /**
     * @notice Allow the owner to set whitelist address.
     * @param target whitelist address
     * @param state whitelist state
     */
    function setWhitelist(address target, bool state) public onlyOwner {
        whitelist[target] = state;
    }

    function setWhitelistBatch(address[] memory targets, bool state) public onlyOwner {
        for (uint256 i = 0; i < targets.length; i++) {
            whitelist[targets[i]] = state;
        }
    }

    /// @notice Function for ERC-721 transfers from.
    /// @dev This function is recommended for ERC721 transfers.
    function erc721TransferFrom(address from_, address to_, uint256 id_) public virtual override {
        // Prevent minting tokens from 0x0.
        if (from_ == address(0)) {
            revert InvalidSender();
        }

        // Prevent burning tokens to 0x0.
        if (to_ == address(0)) {
            revert InvalidRecipient();
        }

        if (from_ != _getOwnerOf(id_)) {
            revert Unauthorized();
        }

        // Check that the operator is either the sender or approved for the transfer.
        if (msg.sender != from_ && !isApprovedForAll[from_][msg.sender] && msg.sender != getApproved[id_]) {
            revert Unauthorized();
        }

        // We only need to check ERC-721 transfer exempt status for the recipient
        // since the sender being ERC-721 transfer exempt means they have already
        // had their ERC-721s stripped away during the rebalancing process.
        if (erc721TransferExempt(to_)) {
            revert RecipientIsERC721TransferExempt();
        }

        _transferERC20(from_, to_, erc721ToTokenBalance(id_));
        _transferERC721(from_, to_, id_);
    }

    /**
     * @notice Allow the owner to set the ERC721 transfer exempt status.
     * @dev This function is only available to the owner and enables the ability
     *      to prevent NFT conversion for specific addresses.
     * @dev This is used for the liquidity pool as well as a few other instances.
     * @param $account The account to set the ERC721 transfer exempt status of.
     * @param $value The value to set the ERC721 transfer exempt status to.
     */
    function setERC721TransferExempt(address $account, bool $value) public onlyOwner {
        /// @dev Control the fractionalization allowances.
        _setERC721TransferExempt($account, $value);
    }

    /**
     * @notice Allow the owner to set the transfer count.
     * @dev This function is only available to the owner and enables the ability
     *     to set the transfer count.
     * @param $count The count to set the transfer count to.
     */
    function setTransferCount(uint256 $count) public onlyOwner {
        minted = $count;
    }

    function setIncrementalUnit(uint16 $incrementalUnit) public onlyOwner {
        incrementalUnit = $incrementalUnit;
    }

    /**
     * @notice Allow the owner to set the base token URI.
     * @dev This function is only available to the owner and enables the ability
     *      to set the base token URI for the tokenURI.
     * @param $uri The URI to set as the base token URI.
     */
    function setBaseTokenURI(string memory $uri) public onlyOwner {
        baseTokenURI = $uri;
    }

    /**
     * @notice Allow the owner to set the renderer for the tokenURI.
     * @dev This function is only available to the owner and enables the ability
     *      to set the renderer for the tokenURI.
     * @param $renderer The address of the renderer to set.
     */
    function setRenderer(address $renderer) public onlyOwner {
        /// @dev Disconnect the Renderer from this contract.
        if (address(renderer) != address(0)) {
            renderer.disconnect();
        }

        /// @dev Set the renderer for the tokenURI.
        renderer = ITokenURIRenderer($renderer);
    }

    /**
     * @notice Allow the owner to mint a token to an address.
     * @dev This function is only available to the owner and enables the ability
     *
     * @param  $id The token ID to get the token URI of.
     */
    function tokenURI(uint256 $id) public view override returns (string memory) {
        if (_getOwnerOf($id) == address(0)) revert TokenInvalid();

        /// @dev The token ID without the encoding shift.
        uint256 tokenId = $id - (1 << 255);

        /// @dev If the renderer has been initialized, use the renderer.
        if (address(renderer) != address(0)) {
            return renderer.render($id);
        }

        /// @dev If the static metadata has not yet been initialized, use the prereveal.
        bytes memory uriBytes = bytes(baseTokenURI);
        uint256 length = uriBytes.length;
        if (length > 0 && uriBytes[length - 1] != 0x2F) {
            return baseTokenURI;
        }

        /// @dev When the renderer has not yet been initialized, use the static.
        return string.concat(baseTokenURI, Strings.toString(tokenId));
    }

    function erc721ToTokenBalance(uint256 id) public view returns (uint256 banlance) {
        uint256 tokenId = id - ID_ENCODING_PREFIX - 1;
        uint256 tokenBanlance = tokenId > maxMintedCount ? maxMintedCount : tokenId;
        banlance = tokenBanlance * units;
    }

    function getCurMinted() public view returns (uint256) {
        return minted > maxMintedCount ? maxMintedCount : minted;
    }

    function updateMinted() internal {
        unchecked {
            // arithmetic progression
            if (incrementalCalculation == ARITHMETIC_PROGRESSION) {
                minted += incrementalUnit;
            }
            // geometric progression
            else if (incrementalCalculation == GEOMETRIC_PROGRESSION) {
                minted += (minted * incrementalUnit) / PERCENT;
            }
        }
    }

    function erc721TokenBalanceOf(address _account) public view returns (uint256 banlance) {
        for (uint256 i = 0; i < _owned[_account].length; i++) {
            uint256 id = _owned[_account][i];
            uint256 tokenBanlance = erc721ToTokenBalance(id);
            unchecked {
                banlance += tokenBanlance;
            }
        }
    }

    /// @notice Internal function for ERC-20 transfers. Also handles any ERC-721 transfers that may be required.
    // Handles ERC-721 exemptions.
    function _transferERC20WithERC721(
        address from_,
        address to_,
        uint256 value_
    ) internal virtual override returns (bool) {
        _transferERC20(from_, to_, value_);

        // Preload for gas savings on branches
        bool isFromERC721TransferExempt = erc721TransferExempt(from_);
        bool isToERC721TransferExempt = erc721TransferExempt(to_);

        // Skip _withdrawAndStoreERC721 and/or _retrieveOrMintERC721 for ERC-721 transfer exempt addresses
        // 1) to save gas
        // 2) because ERC-721 transfer exempt addresses won't always have/need ERC-721s corresponding to their ERC20s.
        if (isFromERC721TransferExempt && isToERC721TransferExempt) {
            // Case 1) Both sender and recipient are ERC-721 transfer exempt. No ERC-721s need to be transferred.
            // NOOP.
        } else if (isFromERC721TransferExempt) {
            // Case 2) The sender is ERC-721 transfer exempt, but the recipient is not. Contract should not attempt
            //         to transfer ERC-721s from the sender, but the recipient should receive ERC-721s
            //         from the bank/minted for any whole number increase in their balance.
            // Only cares about whole number increments.
            uint256 tokensMint = (balanceOf[to_] / units) - (erc721TokenBalanceOf(to_) / units);
            uint256 curMinted = getCurMinted();
            while (curMinted <= tokensMint) {
                _transferERC721(address(0), to_, ID_ENCODING_PREFIX + minted + 1);

                updateMinted();
                unchecked {
                    curMinted += getCurMinted();
                }

                // console.log('minted:', minted);
            }
        } else if (isToERC721TransferExempt) {
            // Case 3) The sender is not ERC-721 transfer exempt, but the recipient is. Contract should attempt
            //         to withdraw and store ERC-721s from the sender, but the recipient should not
            //         receive ERC-721s from the bank/minted.
            // Only cares about whole number increments.
            uint256 burnedBalance = balanceOf[from_];
            uint256 erc721TokenBalance = erc721TokenBalanceOf(from_);
            while (burnedBalance < erc721TokenBalance) {
                uint256 indexOfLastToken = _owned[from_].length - 1;
                uint256 tokenId = _owned[from_][indexOfLastToken];
                uint256 lastNFTBalance = erc721ToTokenBalance(tokenId);
                _transferERC721(from_, address(0), tokenId);
                burnedBalance += lastNFTBalance;
            }
        } else {
            // Case 4) Neither the sender nor the recipient are ERC-721 transfer exempt.
            // Strategy:
            // 1. First deal with the whole tokens. These are easy and will just be transferred.
            // 2. Look at the fractional part of the value:
            //   a) If it causes the sender to lose a whole token that was represented by an NFT due to a
            //      fractional part being transferred, withdraw and store an additional NFT from the sender.
            //   b) If it causes the receiver to gain a whole new token that should be represented by an NFT
            //      due to receiving a fractional part that completes a whole token, retrieve or mint an NFT to the recevier.

            // Whole tokens worth of ERC-20s get transferred as ERC-721s without any burning/minting.
            uint256 tokensMint = (balanceOf[to_] / units) - (erc721TokenBalanceOf(to_) / units);
            uint256 curMinted = getCurMinted();
            while (curMinted <= tokensMint) {
                updateMinted();
                unchecked {
                    curMinted += getCurMinted();
                }

                _transferERC721(address(0), to_, ID_ENCODING_PREFIX + minted);
            }

            uint256 burnedBalance = balanceOf[from_];
            uint256 erc721TokenBalance = erc721TokenBalanceOf(from_);
            while (burnedBalance < erc721TokenBalance) {
                uint256 indexOfLastToken = _owned[from_].length - 1;
                uint256 tokenId = _owned[from_][indexOfLastToken];
                uint256 lastNFTBalance = erc721ToTokenBalance(tokenId);
                _transferERC721(from_, address(0), tokenId);
                burnedBalance += lastNFTBalance;
            }
        }

        return true;
    }
}
