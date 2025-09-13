import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

test('player discards princess and is eliminated', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,3,8], {
    [aliceId]: [1],
    [bobId]: [4],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫' }).click();
  await expect(page2.getByText('勝者: bob さん！')).toBeVisible();
  await context1.close();
  await context2.close();
});
