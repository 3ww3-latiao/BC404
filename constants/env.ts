import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  // infura
  INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID ?? '',

  // gas reporter
  GAS_REPORTER_ENABLED: process.env.GAS_REPORTER_ENABLED === 'true',

  // account
  ACCOUNT_PRIVATE_KEY: process.env.ACCOUNT_PRIVATE_KEY ?? '',
  
  // QUICKNODE
  QUICKNODE_BASE_ENDPOINT: process.env.QUICKNODE_BASE_ENDPOINT ?? '',
};
