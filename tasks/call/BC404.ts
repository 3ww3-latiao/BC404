import consola from 'consola';
import { scope, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Hash } from 'viem';

const contractScope = scope('call:BC404', 'BC404 contract tasks');

interface SetupArgs {
  address: Hash;
}

async function setup(args: SetupArgs, hre: HardhatRuntimeEnvironment) {
  const BC404 = await hre.viem.getContractAt('contracts/BC404.sol:BC404', args.address);
  const client = await hre.viem.getPublicClient();

  return { BC404, blockExplorersUrl: client.chain.blockExplorers?.default.url as string };
}

// Transfer Token to BC404 contract
contractScope
  .task('transfer', 'Transfer Token to BC404 contract')
  .addParam('address', 'Address of the Token contract')
  .addParam('to', 'Address of the receiver')
  .addParam('amount', 'Amount of tokens to transfer')
  .setAction(async (args, hre) => {
    const { BC404, blockExplorersUrl } = await setup(args, hre);
    consola.success(
      'TX:',
      `${blockExplorersUrl}/tx/${await BC404.write.transfer([args.to, BigInt(args.amount) * 10n ** 18n])}`,
    );
  });

// Set ERC721 transfer exempt
contractScope
  .task('setERC721TransferExempt', 'Set ERC721 transfer exempt')
  .addParam('address', 'Address of the Flux contract')
  .addParam('to', 'Address of the receiver')
  .addOptionalParam('state', 'Exempt state', true, types.boolean)
  .setAction(async (args, hre) => {
    const { BC404, blockExplorersUrl } = await setup(args, hre);
    consola.success(
      'TX:',
      `${blockExplorersUrl}/tx/${await BC404.write.setERC721TransferExempt([args.to, args.state])}`,
    );
  });

// Transfer NFT to BC404 contract
contractScope
  .task('safeTransferFrom', 'Transfer NFT to BC404 contract')
  .addParam('address', 'Address of the Flux contract')
  .addParam('from', 'Address of the sender')
  .addParam('to', 'Address of the receiver')
  .addParam('id', 'ID of the token')
  .setAction(async (args, hre) => {
    const { BC404, blockExplorersUrl } = await setup(args, hre);
    consola.success(
      'TX:',
      `${blockExplorersUrl}/tx/${await BC404.write.safeTransferFrom([args.from, args.to, BigInt(args.id)])}`,
    );
  });

// Set whitelist batch
contractScope
  .task('setWhitelistBatch', 'Set whitelist batch')
  .addParam('address', 'Address of the Flux contract')
  .addParam('addresses', 'Addresses to whitelist, use comma(,) separated values')
  .addOptionalParam('state', 'Exempt state', true, types.boolean)
  .setAction(async (args, hre) => {
    const { BC404, blockExplorersUrl } = await setup(args, hre);
    consola.success(
      'TX:',
      `${blockExplorersUrl}/tx/${await BC404.write.setWhitelistBatch([
        (args.addresses as string).split(',').map((str) => str.trim() as Hash),
        args.state,
      ])}`,
    );
  });

// Get NFT owner
contractScope
  .task('ownerOf', 'Get NFT owner')
  .addParam('address', 'Address of the Flux contract')
  .addParam('id', 'ID of the token')
  .setAction(async (args, hre) => {
    const { BC404 } = await setup(args, hre);
    consola.success(await BC404.read.ownerOf([BigInt(args.id)]));
  });

// Get Address balance
contractScope
  .task('balanceOf', 'Get Address balance')
  .addParam('address', 'Address of the Flux contract')
  .addParam('owner', 'Address of the owner')
  .setAction(async (args, hre) => {
    const { BC404 } = await setup(args, hre);
    consola.success(await BC404.read.balanceOf([args.owner]));
  });

// Get Token URI
contractScope
  .task('tokenURI', 'Get Token URI')
  .addParam('address', 'Address of the Flux contract')
  .addParam('id', 'ID of the token')
  .setAction(async (args, hre) => {
    const { BC404 } = await setup(args, hre);
    consola.success(await BC404.read.tokenURI([BigInt(args.id)]));
  });

contractScope
  .task('approve')
  .addParam('address', 'Address of the Flux contract')
  .addParam('spender', 'Address of the spender')
  .addOptionalParam(
    'param',
    'Count or NFT id to approve',
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    types.string,
  )
  .setAction(async (args, hre) => {
    const { BC404, blockExplorersUrl } = await setup(args, hre);
    consola.success('TX:', `${blockExplorersUrl}/tx/${await BC404.write.approve([args.spender, BigInt(args.param)])}`);
  });

contractScope
  .task('getMinted')
  .addParam('address', 'Address of the Flux contract')
  .setAction(async (args, hre) => {
    const { BC404 } = await setup(args, hre);
    consola.success(await BC404.read.minted());
  });
