import { test, expect } from '@playwright/test';
import { createRoomAndJoinThree, startGameManual, postSetup, sleep } from './utils/utils';

// Verify that manual turn order selection works for 3 players.
// We set order to: charlie -> alice -> bob
// Then we check draw button visibility to confirm turn progression.
test('manual turn order applies to three players', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser);

  // Open start modal and set manual order: charlie first, then alice, then bob
  await startGameManual(page1, ['charlie', 'alice', 'bob']);

  const players = await playersPromise;
  const aliceId = players.find((p) => p.name === 'alice').id;
  const bobId = players.find((p) => p.name === 'bob').id;
  const charlieId = players.find((p) => p.name === 'charlie').id;

  // Fix hands and deck so charlie can draw then play Monk to advance the turn
  await postSetup(page1, roomName, [1, 1, 1, 1], {
    [aliceId]: [1],    // Soldier (not used in this test)
    [bobId]: [1],      // Soldier (not used)
    [charlieId]: [4],  // Monk (to play quickly and end turn)
  });
  await sleep(300);

  // It should be charlie's turn initially (only page3 can draw)
  await expect(page3.getByRole('button', { name: 'カードを引く' })).toBeVisible();
  await expect(page1.getByRole('button', { name: 'カードを引く' })).toHaveCount(0);
  await expect(page2.getByRole('button', { name: 'カードを引く' })).toHaveCount(0);

  // charlie draws and plays Monk to move turn to the next player (alice)
  await page3.getByRole('button', { name: 'カードを引く' }).click();
  await page3.getByRole('button', { name: '僧侶' }).click();
  await sleep(300);

  // Now it should be alice's turn
  await expect(page1.getByRole('button', { name: 'カードを引く' })).toBeVisible();
  await expect(page2.getByRole('button', { name: 'カードを引く' })).toHaveCount(0);
  await expect(page3.getByRole('button', { name: 'カードを引く' })).toHaveCount(0);

  await context1.close();
  await context2.close();
  await context3.close();
});

