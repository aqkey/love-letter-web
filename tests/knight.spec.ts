import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep, createRoomAndJoinTwo, startGameChooseFirst, postSetup } from './utils/utils';

// E2E scenario: deck draw order [騎士, 兵士, 騎士, 兵士]
// initial hands: Player1 姫, Player2 伯爵夫人
// first player draws 騎士 but no one is eliminated

test('first player draws a knight but no one is eliminated', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);

  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Deterministic setup
  await postSetup(page1, roomName, [3, 3], {
    [aliceId]: [8], // 姫
    [bobId]: [10],  // 伯爵夫人
  });

  // Alice draws and plays Knight on bob
  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '騎士' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();

  // No one should be eliminated
  await expect(page1.getByText('bob (脱落)')).not.toBeVisible();
  await expect(page1.getByText('相手のターンです。お待ちください...')).toBeVisible();

  await context1.close();
  await context2.close();
});
