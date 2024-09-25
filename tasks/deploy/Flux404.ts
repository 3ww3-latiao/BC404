import consola from 'consola';
import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { parseEther } from 'viem';

interface Args {
  name: string;
  symbol: string;
  address: `0x${string}`;
  totalSupply: string;
  uri: string;
  minted: number;
  maxMintedCount: number;
  unit: number;
  calculation: number;
}

async function action(args: Args, hre: HardhatRuntimeEnvironment) {
  const client = await hre.viem.getPublicClient();
  const Flux404 = await hre.viem.deployContract('contracts/Flux404.sol:Flux404', [
    args.name,
    args.symbol,
    args.address,
    parseEther(args.totalSupply),
    args.uri,
    BigInt(args.minted),
    BigInt(args.maxMintedCount),
    args.unit,
    args.calculation,
  ]);

  consola.success(`Flux404 deployed to: ${client.chain.blockExplorers?.default.url}/address/${Flux404.address}`);
}

export default task('deploy:Flux404', 'Deploy Flux404 contract')
  .addParam('name', 'The name of the Flux404 contract')
  .addParam('symbol', 'The symbol of the Flux404 contract')
  .addParam('address', 'Admin address of the Flux404 contract')
  .addParam('uri', 'The URI of the Flux404 contract')
  .addParam('minted', 'The number of tokens minted')
  .addParam('totalSupply', 'The total supply of the Flux404 contract')
  .addOptionalParam('maxMintedCount', 'The maximum number of tokens that can be minted', 10000, types.int)
  .addOptionalParam('unit', 'Incremental Unit', 1, types.int)
  .addOptionalParam('calculation', 'Incremental Calculation', 1, types.int)
  .setAction(action);
