import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, sleep } from './utils/utils';
// E2E scenario: deck draw order [道化, 騎士, 道化, 僧侶]
// initial hands: Player1 騎士, Player2 僧侶
// first player draws 道化 and sees bob's hand

test("first player draws a clown and sees opponent's hand", async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);

  // Start game with alice first to ensure turn order
  await startGameChooseFirst(page1, 'alice');

  // Fetch player IDs from console
  const players = await playersPromise;
  const aliceId = players.find((p) => p.name === 'alice').id;
  const bobId = players.find((p) => p.name === 'bob').id;

  // Set deck and hands deterministically
  await postSetup(page1, roomName, [4, 2, 3, 2], {
    [aliceId]: [3], // 騎士
    [bobId]: [4],   // 僧侶
  });
  await sleep(300);

  // Player1 draws 道化
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays 道化 targeting bob
  await page1.getByRole('button', { name: '道化' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();

  // Modal should show bob's hand 僧侶
  await expect(page1.getByRole('heading', { name: '手札を見る' })).toBeVisible();
  await expect(page1.getByText(/bob.*僧侶/)).toBeVisible();
  await page1.getByRole('button', { name: 'OK' }).click();

  await context1.close();
  await context2.close();
});
