import { expect } from 'chai';
import hre from 'hardhat';
import { Hash, checksumAddress, formatEther, formatUnits, parseUnits } from 'viem';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('BC404 contract', function () {
  function generateSetup(incrementalCalculation: 1 | 2) {
    return async function setup() {
      const [wallet] = await hre.viem.getWalletClients();
      const owner = wallet.account.address;
      const decimals = 10n ** 18n;
      const maxMinted = 100000;
      const BC404 = await hre.viem.deployContract('contracts/BC404.sol:BC404', [
        'BC404',
        'BC404',
        owner,
        parseUnits('1000000000', 18),
        'testURI',
        BigInt(1),
        BigInt(maxMinted),
        1,
        incrementalCalculation,
      ]);

      const startId = (1n << 255n) + 1n;

      return {
        owner,
        BC404,
        decimals,
        startId,
        parseUnits: (num: string | number | bigint) => parseUnits(num.toString(), 18),
        formatUnits: (num: bigint) => formatUnits(num, 18),
      };
    };
  }

  type BC404 = Awaited<ReturnType<ReturnType<typeof generateSetup>>>;
  const IncrementalBC404Setup = generateSetup(1);
  let IncrementalBC404: BC404;

  const GeometricBC404Setup = generateSetup(2);
  let GeometricBC404: BC404;

  beforeEach(async () => {
    IncrementalBC404 = await loadFixture(IncrementalBC404Setup);
    GeometricBC404 = await loadFixture(GeometricBC404Setup);
  });

  it('Deployment BC404', async () => {
    const { owner, BC404, parseUnits } = IncrementalBC404;

    expect(await BC404.read.name()).to.equal('BC404');
    expect(await BC404.read.symbol()).to.equal('BC404');
    expect(await BC404.read.totalSupply()).to.equal(parseUnits('1000000000'));

    const ownerBalance = await BC404.read.balanceOf([owner]);

    expect(ownerBalance).to.equal(parseUnits('1000000000'));
  });

  for (let i = 0; i < 5; i++) {
    const startMinted = 10 ** i;

    it(`BC404 mint with startMinted ${startMinted}`, async () => {
      const { BC404, parseUnits } = IncrementalBC404;
      const [, { account: account2 }] = await hre.viem.getWalletClients();

      await BC404.write.setTransferCount([BigInt(startMinted)]);

      for (let i = 0; i < 30; i++) {
        expect(await BC404.read.balanceOf([account2.address])).to.equal(parseUnits(i * startMinted));
        await BC404.write.transfer([account2.address, parseUnits(startMinted)]);

        // Arithmetic progression
        let minted = startMinted;
        let curMinted = minted;
        while (curMinted <= startMinted * (i + 1)) curMinted += ++minted;
        expect((await BC404.read.owned([account2.address])).length).to.equal(minted - startMinted);
      }
      // Arithmetic progression
      let minted = startMinted;
      let curMinted = minted;
      let curCount = startMinted * 30;
      while (curMinted <= curCount) curMinted += ++minted;
      expect((await BC404.read.owned([account2.address])).length).to.equal(minted - startMinted);
    });

    it(`BC404 burn with startMinted ${startMinted}`, async () => {
      const { BC404, parseUnits, startId } = IncrementalBC404;
      const [, { account }, { account: account2 }, { account: account3 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);
      const address3 = checksumAddress(account3.address);

      await BC404.write.setTransferCount([BigInt(startMinted)]);

      await BC404.write.transfer([address, parseUnits(startMinted * 100)]);
      // transfer tokens to address2
      await BC404.write.transfer([address2, parseUnits(startMinted * 10)], {
        account: address,
      });

      let burnedAddressMinted = startMinted;
      let curBurnedAddressMinted = burnedAddressMinted;
      let curBurnedAddressCount = startMinted * (100 - 10);
      while (curBurnedAddressMinted <= curBurnedAddressCount) curBurnedAddressMinted += ++burnedAddressMinted;

      const addressOwned = await BC404.read.owned([address]);
      // check address NFTs count
      expect(addressOwned.length).to.equal(burnedAddressMinted - startMinted);
      // check address NFTs
      expect(addressOwned).to.deep.equal(
        Array.from({ length: burnedAddressMinted - startMinted }, (_, i) => startId + BigInt(i + startMinted)),
      );

      let address2Minted = startMinted;
      let curAddress2Minted = address2Minted;
      let curAddress2Count = startMinted * 100;
      while (curAddress2Minted <= curAddress2Count) curAddress2Minted += ++address2Minted;

      let tempAddress2Minted = address2Minted;
      let tempCurAddress2Minted = address2Minted;
      let tempCurAddress2Count = startMinted * 10;
      while (tempCurAddress2Minted <= tempCurAddress2Count) tempCurAddress2Minted += ++tempAddress2Minted;

      const realAddress2Minted = tempAddress2Minted - address2Minted;

      // check address2 NFTs count
      const address2Owned = await BC404.read.owned([address2]);
      expect(address2Owned.length).to.equal(realAddress2Minted);
      // check address2 NFTs
      expect(address2Owned).to.deep.equal(
        Array.from({ length: realAddress2Minted }, (_, i) => startId + BigInt(i + address2Minted)),
      );

      // transfer tokens to address3
      await BC404.write.transfer([address3, parseUnits(startMinted * 10)], {
        account: address,
      });

      let tempAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Count = startMinted * 10;
      while (tempCurAddress3Minted <= tempCurAddress3Count) tempCurAddress3Minted += ++tempAddress3Minted;

      const realAddress3Minted = tempAddress3Minted - tempAddress2Minted;

      // check address3 NFTs count
      const address3Owned = await BC404.read.owned([address3]);
      expect(address3Owned.length).to.equal(realAddress3Minted);
      // check address3 NFTs
      expect(address3Owned).to.deep.equal(
        Array.from({ length: realAddress3Minted }, (_, i) => startId + BigInt(i + tempAddress2Minted)),
      );
    });

    it(`BC404 transfer NFTs with startMinted ${startMinted}`, async () => {
      const { BC404, parseUnits, startId } = IncrementalBC404;
      const [, { account }, { account: account2 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);

      const mint = parseUnits(startMinted * 100);

      await BC404.write.setTransferCount([BigInt(startMinted)]);

      // mint
      await BC404.write.transfer([address, mint]);

      // transfer NFTs
      const owned = await BC404.read.owned([address]);

      let count = 0n;
      for (const id of owned) {
        count += id - startId;
        await BC404.write.safeTransferFrom([address, address2, id], { account: address });
      }

      expect(await BC404.read.owned([address])).to.length(0);
      expect(await BC404.read.owned([address2])).to.length(owned.length);

      expect(await BC404.read.balanceOf([address])).to.eq(mint - parseUnits(count));
      expect(await BC404.read.balanceOf([address2])).to.eq(parseUnits(count));
    });
  }

  for (let i = 0; i <= 5; i++) {
    const startMinted = 1;
    const incrementalUnit = i + 1;

    it(`BC404 mint with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits } = IncrementalBC404;
      const [, { account: account2 }] = await hre.viem.getWalletClients();

      await BC404.write.setIncrementalUnit([incrementalUnit]);

      for (let i = 0; i < 30; i++) {
        expect(await BC404.read.balanceOf([account2.address])).to.equal(parseUnits(i * startMinted));
        await BC404.write.transfer([account2.address, parseUnits(startMinted)]);
      }

      // Arithmetic progression
      let minted = startMinted;
      let count = 0;
      let curMinted = minted;
      let curCount = startMinted * 30;
      while (curMinted <= curCount) {
        curMinted += minted += incrementalUnit;
        count++;
      }
      expect((await BC404.read.owned([account2.address])).length).to.equal(count);
    });

    it(`BC404 burn with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits, startId } = IncrementalBC404;
      const [, { account }, { account: account2 }, { account: account3 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);
      const address3 = checksumAddress(account3.address);

      await BC404.write.setIncrementalUnit([incrementalUnit]);

      await BC404.write.transfer([address, parseUnits(100)]);
      // transfer tokens to address2
      await BC404.write.transfer([address2, parseUnits(10)], {
        account: address,
      });

      let burnedAddressMinted = 1;
      let count = 0;
      let curBurnedAddressMinted = burnedAddressMinted;
      let curBurnedAddressCount = 100 - 10;
      while (curBurnedAddressMinted <= curBurnedAddressCount) {
        curBurnedAddressMinted += burnedAddressMinted += incrementalUnit;
        count++;
      }

      const addressOwned = await BC404.read.owned([address]);
      // check address NFTs count
      expect(addressOwned.length).to.equal(count);
      // check address NFTs
      expect(addressOwned).to.deep.equal(
        Array.from({ length: count }, (_, i) => startId + BigInt(i * incrementalUnit + 1)),
      );

      let address2Minted = 1;
      let address2MintedCount = 0;
      let curAddress2Minted = address2Minted;
      let curAddress2Count = 100;
      while (curAddress2Minted <= curAddress2Count) {
        curAddress2Minted += address2Minted += incrementalUnit;
        address2MintedCount++;
      }

      let tempAddress2Minted = address2Minted;
      let tempCurAddress2Minted = address2Minted;
      let tempCurAddress2Count = 10;
      while (tempCurAddress2Minted <= tempCurAddress2Count) {
        tempCurAddress2Minted += tempAddress2Minted += incrementalUnit;
      }

      const realAddress2Minted = tempAddress2Minted - address2Minted;

      // check address2 NFTs count
      const address2Owned = await BC404.read.owned([address2]);
      expect(address2Owned.length).to.equal(realAddress2Minted);
      // check address2 NFTs
      expect(address2Owned).to.deep.equal(
        Array.from({ length: realAddress2Minted }, (_, i) => startId + BigInt(i + address2Minted)),
      );

      // transfer tokens to address3
      await BC404.write.transfer([address3, parseUnits(10)], {
        account: address,
      });

      let tempAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Count = 10;
      while (tempCurAddress3Minted <= tempCurAddress3Count) {
        tempCurAddress3Minted += tempAddress3Minted += incrementalUnit;
      }

      const realAddress3Minted = tempAddress3Minted - tempAddress2Minted;

      // check address3 NFTs count
      const address3Owned = await BC404.read.owned([address3]);
      expect(address3Owned.length).to.equal(realAddress3Minted);
      // check address3 NFTs
      expect(address3Owned).to.deep.equal(
        Array.from({ length: realAddress3Minted }, (_, i) => startId + BigInt(i + tempAddress2Minted)),
      );
    });

    it(`BC404 transfer NFTs with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits, startId } = IncrementalBC404;
      const [, { account }, { account: account2 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);

      await BC404.write.setIncrementalUnit([incrementalUnit]);

      const mint = parseUnits(startMinted * 100);

      // mint
      await BC404.write.transfer([address, mint]);

      // transfer NFTs
      const owned = await BC404.read.owned([address]);

      let count = 0n;
      for (const id of owned) {
        count += id - startId;
        await BC404.write.safeTransferFrom([address, address2, id], { account: address });
      }

      expect(await BC404.read.owned([address])).to.length(0);
      expect(await BC404.read.owned([address2])).to.length(owned.length);

      expect(await BC404.read.balanceOf([address])).to.eq(mint - parseUnits(count));
      expect(await BC404.read.balanceOf([address2])).to.eq(parseUnits(count));
    });
  }

  for (let i = 0; i <= 5; i++) {
    const startMinted = 100;
    const incrementalUnit = (i + 1) / 100;

    it(`GeometricBC404 mint with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits } = GeometricBC404;
      const [, { account: account2 }] = await hre.viem.getWalletClients();

      await BC404.write.setIncrementalUnit([(i + 1) * 100]);
      await BC404.write.setTransferCount([BigInt(startMinted)]);

      for (let i = 0; i < 30; i++) {
        expect(await BC404.read.balanceOf([account2.address])).to.equal(parseUnits(i * startMinted));
        await BC404.write.transfer([account2.address, parseUnits(startMinted)]);
      }

      // Arithmetic progression
      let minted = startMinted;
      let count = 0;
      let curMinted = minted;
      let curCount = startMinted * 30;
      while (curMinted <= curCount) {
        curMinted += minted += Math.floor(minted * incrementalUnit);
        count++;
      }
      expect((await BC404.read.owned([account2.address])).length).to.equal(count);
    });

    it(`GeometricBC404 burn with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits, startId } = GeometricBC404;
      const [, { account }, { account: account2 }, { account: account3 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);
      const address3 = checksumAddress(account3.address);

      await BC404.write.setIncrementalUnit([(i + 1) * 100]);
      await BC404.write.setTransferCount([BigInt(startMinted)]);

      await BC404.write.transfer([address, parseUnits(100)]);
      // transfer tokens to address2
      await BC404.write.transfer([address2, parseUnits(10)], {
        account: address,
      });

      const burnOwned: number[] = [];
      let burnedAddressMinted = startMinted;
      let count = 0;
      let curBurnedAddressMinted = burnedAddressMinted;
      let curBurnedAddressCount = 100 - 10;
      while (curBurnedAddressMinted <= curBurnedAddressCount) {
        burnOwned.push(burnedAddressMinted);
        curBurnedAddressMinted += burnedAddressMinted += burnedAddressMinted * incrementalUnit;
        count++;
      }

      const addressOwned = await BC404.read.owned([address]);
      // check address NFTs count
      expect(addressOwned.length).to.equal(count);
      // check address NFTs
      expect(addressOwned).to.deep.equal(Array.from({ length: count }, (_, i) => startId + BigInt(burnOwned[i])));

      let address2Minted = 1;
      let address2MintedCount = 0;
      let curAddress2Minted = address2Minted;
      let curAddress2Count = 100;
      while (curAddress2Minted <= curAddress2Count) {
        curAddress2Minted += address2Minted += burnedAddressMinted * incrementalUnit;
        address2MintedCount++;
      }

      let tempAddress2Minted = address2Minted;
      let tempCurAddress2Minted = address2Minted;
      let tempCurAddress2Count = 10;
      while (tempCurAddress2Minted <= tempCurAddress2Count) {
        tempCurAddress2Minted += tempAddress2Minted += tempAddress2Minted * incrementalUnit;
      }

      const realAddress2Minted = tempAddress2Minted - address2Minted;

      // check address2 NFTs count
      const address2Owned = await BC404.read.owned([address2]);
      expect(address2Owned.length).to.equal(realAddress2Minted);
      // check address2 NFTs
      expect(address2Owned).to.deep.equal(
        Array.from({ length: realAddress2Minted }, (_, i) => startId + BigInt(i + address2Minted)),
      );

      // transfer tokens to address3
      await BC404.write.transfer([address3, parseUnits(10)], {
        account: address,
      });

      let tempAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Minted = tempAddress2Minted;
      let tempCurAddress3Count = 10;
      while (tempCurAddress3Minted <= tempCurAddress3Count) {
        tempCurAddress3Minted += tempAddress3Minted += tempAddress3Minted * incrementalUnit;
      }

      const realAddress3Minted = tempAddress3Minted - tempAddress2Minted;

      // check address3 NFTs count
      const address3Owned = await BC404.read.owned([address3]);
      expect(address3Owned.length).to.equal(realAddress3Minted);
      // check address3 NFTs
      expect(address3Owned).to.deep.equal(
        Array.from({ length: realAddress3Minted }, (_, i) => startId + BigInt(i + tempAddress2Minted)),
      );
    });

    it(`BC404 transfer NFTs with incrementalUnit ${incrementalUnit}`, async () => {
      const { BC404, parseUnits, startId } = GeometricBC404;
      const [, { account }, { account: account2 }] = await hre.viem.getWalletClients();
      const address = checksumAddress(account.address);
      const address2 = checksumAddress(account2.address);

      const mint = parseUnits(startMinted * 100);

      await BC404.write.setIncrementalUnit([(i + 1) * 100]);
      await BC404.write.setTransferCount([BigInt(startMinted)]);

      // mint
      await BC404.write.transfer([address, mint]);

      // transfer NFTs
      const owned = await BC404.read.owned([address]);

      let count = 0n;
      for (const id of owned) {
        count += id - startId;
        await BC404.write.safeTransferFrom([address, address2, id], { account: address });
      }

      expect(await BC404.read.owned([address])).to.length(0);
      expect(await BC404.read.owned([address2])).to.length(owned.length);

      expect(await BC404.read.balanceOf([address])).to.eq(mint - parseUnits(count));
      expect(await BC404.read.balanceOf([address2])).to.eq(parseUnits(count));
    });
  }

  it('BC404 transfer 100000000 token to exempt', async () => {
    const { BC404, parseUnits } = IncrementalBC404;
    const [, { account: account2 }] = await hre.viem.getWalletClients();

    await BC404.write.setERC721TransferExempt([account2.address, true]);
    await BC404.write.transfer([account2.address, parseUnits(100000000)]);
    expect(await BC404.read.balanceOf([account2.address])).to.equal(parseUnits(100000000));
  });
});
