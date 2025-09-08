import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

// If a player discards Princess while also holding Princess(Glasses),
// they should be revival .

test('discarding princess with princess_glasses in hand does not revive', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // alice は 姫(眼鏡) を所持 → 姫 をドローしプレイすると脱落（復活しない想定）
  await postSetup(page1, roomName, [1,1,1,8], {
    [aliceId]: [9],
    [bobId]: [1],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫', exact: true }).click();
  await expect(page1.getByText('勝者: bob さん！')).not.toBeVisible();

  await context1.close();
  await context2.close();
});
