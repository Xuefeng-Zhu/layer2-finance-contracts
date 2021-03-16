import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';

import { Wallet } from '@ethersproject/wallet';

import { deployContracts, loadFixture } from './common';

const USER_KEY =
  '0xb6736f13344545561b1f279ffa935c9f614eceba097437823b95b5a615856306';
const DISPUTE_METHOD_SIG = '0x8bdc6232';

describe('Dispute', function () {
  async function fixture([admin]: Wallet[]) {
    const {
      registry,
      rollupChain,
      strategyDummy,
      testERC20
    } = await deployContracts(admin);

    const tokenAddress = testERC20.address;
    await registry.registerAsset(tokenAddress);

    await rollupChain.setNetDepositLimit(
      tokenAddress,
      ethers.utils.parseEther('10000')
    );
    await rollupChain.setBlockChallengePeriod(10);

    const user = new ethers.Wallet(USER_KEY).connect(ethers.provider);
    await admin.sendTransaction({
      to: user.address,
      value: ethers.utils.parseEther('10')
    });
    await testERC20.transfer(user.address, ethers.utils.parseEther('10000'));

    return {
      admin,
      registry,
      rollupChain,
      strategyDummy,
      testERC20,
      user
    };
  }

  // it('should dispute successfully', async function () {
  //   const { admin, rollupChain, testERC20, user } = await loadFixture(fixture);
  //   const tokenAddress = testERC20.address;
  //   const depositAmount = ethers.utils.parseEther('1');
  //   await testERC20
  //     .connect(user)
  //     .approve(rollupChain.address, depositAmount.mul(2));
  //   await rollupChain.connect(user).deposit(tokenAddress, depositAmount);
  //   await rollupChain.connect(user).deposit(tokenAddress, depositAmount);

  //   const txs = [
  //     // Deposit
  //     '0x00000000000000000000000000000000000000000000000000000000000000017d833337344eff4a5c06d56c3cee19fbadb57fbd6419ff52a18cb2095d8023e000000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000',
  //     // Commit
  //     '0x0000000000000000000000000000000000000000000000000000000000000003d855aac1c93edfb64f765c11ad22201c0e7f0bd376fb64324a5d23d7b9b05a9a000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000001783aefd88e00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004174e25df38b86e7a1c4ead5ba4fcc215f5c4e4cb9817cb50cdcee5700addd9ebe571a9a08adba3b4074f127cceafa140cc8a434aa52112a36022887403270ffa30100000000000000000000000000000000000000000000000000000000000000',
  //     // Deposit (bad)
  //     '0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000062616420737461746520726f6f7400000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000'
  //   ];
  //   await rollupChain.commitBlock(0, txs);

  //   const disputeData =
  //     DISPUTE_METHOD_SIG +
  //     fs.readFileSync('test/data/dispute_success.txt').toString();

  //   await expect(
  //     admin.sendTransaction({
  //       to: rollupChain.address,
  //       data: disputeData,
  //       gasLimit: 9500000
  //     })
  //   )
  //     .to.emit(rollupChain, 'RollupBlockReverted')
  //     .withArgs(0);
  // });

  it('should fail to dispute past challenge period', async function () {
    const { admin, rollupChain, testERC20, user } = await loadFixture(fixture);

    await rollupChain.setBlockChallengePeriod(0);

    const tokenAddress = testERC20.address;
    const depositAmount = ethers.utils.parseEther('1');
    await testERC20
      .connect(user)
      .approve(rollupChain.address, depositAmount.mul(2));
    await rollupChain.connect(user).deposit(tokenAddress, depositAmount);
    await rollupChain.connect(user).deposit(tokenAddress, depositAmount);

    const txs = [
      // Deposit
      '0x00000000000000000000000000000000000000000000000000000000000000017d833337344eff4a5c06d56c3cee19fbadb57fbd6419ff52a18cb2095d8023e000000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000',
      // Commit
      '0x0000000000000000000000000000000000000000000000000000000000000003d855aac1c93edfb64f765c11ad22201c0e7f0bd376fb64324a5d23d7b9b05a9a000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000001783aefd88e00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004174e25df38b86e7a1c4ead5ba4fcc215f5c4e4cb9817cb50cdcee5700addd9ebe571a9a08adba3b4074f127cceafa140cc8a434aa52112a36022887403270ffa30100000000000000000000000000000000000000000000000000000000000000',
      // Deposit (bad)
      '0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000062616420737461746520726f6f7400000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000'
    ];
    await rollupChain.commitBlock(0, txs);

    const disputeData =
      DISPUTE_METHOD_SIG +
      fs.readFileSync('test/data/dispute_success.txt').toString();

    await expect(
      admin.sendTransaction({
        to: rollupChain.address,
        data: disputeData
      })
    ).to.be.revertedWith('Block challenge period is over');
  });

  it('should fail to dispute with invalid empty input', async function () {
    const { rollupChain, testERC20, user } = await loadFixture(fixture);
    const tokenAddress = testERC20.address;
    const depositAmount = ethers.utils.parseEther('1');
    await testERC20
      .connect(user)
      .approve(rollupChain.address, depositAmount.mul(2));
    await rollupChain.connect(user).deposit(tokenAddress, depositAmount);
    await rollupChain.connect(user).deposit(tokenAddress, depositAmount);

    const txs = [
      // Deposit
      '0x00000000000000000000000000000000000000000000000000000000000000017d833337344eff4a5c06d56c3cee19fbadb57fbd6419ff52a18cb2095d8023e000000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000',
      // Commit
      '0x0000000000000000000000000000000000000000000000000000000000000003d855aac1c93edfb64f765c11ad22201c0e7f0bd376fb64324a5d23d7b9b05a9a000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000001783aefd88e00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004174e25df38b86e7a1c4ead5ba4fcc215f5c4e4cb9817cb50cdcee5700addd9ebe571a9a08adba3b4074f127cceafa140cc8a434aa52112a36022887403270ffa30100000000000000000000000000000000000000000000000000000000000000',
      // Deposit (bad)
      '0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000062616420737461746520726f6f7400000000000000000000000000290a43e5b2b151d530845b2d5a818240bc7c70000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000'
    ];
    await rollupChain.commitBlock(0, txs);

    await expect(
      rollupChain.disputeTransition(
        {
          transition: '0x00',
          blockId: 0,
          index: 0,
          siblings: [
            '0x0000000000000000000000000000000000000000000000000000000000000000'
          ]
        },
        {
          transition: '0x00',
          blockId: 0,
          index: 0,
          siblings: [
            '0x0000000000000000000000000000000000000000000000000000000000000000'
          ]
        },
        {
          stateRoot:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          value: {
            account: user.address,
            accountId: 0,
            idleAssets: [0],
            stTokens: [0],
            timestamp: 0
          },
          index: 0,
          siblings: [
            '0x0000000000000000000000000000000000000000000000000000000000000000'
          ]
        },
        {
          stateRoot:
            '0x0000000000000000000000000000000000000000000000000000000000000000',
          value: {
            assetId: 0,
            assetBalance: 0,
            stTokenSupply: 0,
            pendingCommitAmount: 0,
            pendingUncommitAmount: 0
          },
          index: 0,
          siblings: [
            '0x0000000000000000000000000000000000000000000000000000000000000000'
          ]
        }
      )
    ).to.be.revertedWith('No fraud detected!');
  });
});
