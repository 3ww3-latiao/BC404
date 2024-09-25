import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-gas-reporter';
import { ENV } from './constants/env';
import './tasks';

const config: HardhatUserConfig = {
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: ENV.GAS_REPORTER_ENABLED,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 10_000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${ENV.INFURA_PROJECT_ID}`,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
    merlinMainnet: {
      url: `https://rpc.merlinchain.io`,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
    arbSepolia: {
      url: `https://arbitrum-sepolia.infura.io/v3/${ENV.INFURA_PROJECT_ID}`,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
    base: {
      url: ENV.QUICKNODE_BASE_ENDPOINT,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
    baseSepolia: {
      url: `https://base-sepolia.infura.io/v3/${ENV.INFURA_PROJECT_ID}`,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${ENV.INFURA_PROJECT_ID}`,
      accounts: [ENV.ACCOUNT_PRIVATE_KEY],
    },
  },
};

export default config;
