import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';


test('minister eliminates player when hand cost becomes 12 or more', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Alice holds 女侯爵(7)、then draws 大臣(7) -> total >= 12 => eliminated
  await postSetup(page1, roomName, [1,1,1,7], {
    [aliceId]: [11],
    [bobId]: [1],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});
