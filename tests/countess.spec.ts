import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

// Countess: deck runs out -> player holding Countess is eliminated

test('player holding countess is eliminated when deck is empty', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Set empty deck; alice holds Countess, bob holds Soldier
  await postSetup(page1, roomName, [1], {
    [aliceId]: [10],
    [bobId]: [1],
  });
  await sleep(200);

  // Any draw attempt triggers handleCountessElimination (deck empty)
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();
  await context1.close();
  await context2.close();
});
