import { test, expect, BrowserContext, Page } from '@playwright/test';
import { sleep, createRoomAndJoinTwo, startGameManual, postSetup, createRoomAndJoinThree } from './utils/utils';

// E2E scenario: deck [兵士,兵士,兵士,将軍],
// initial hands: Player1 女侯爵, Player2 兵士,
// player1 draws 将軍 making total cost 13 and must play 女侯爵.


test('player discard  by playing princess_bomb and bob win.', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  await startGameManual(page1, ['alice','bob','charlie']);
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,1,12], {
    [aliceId]: [4],
    [bobId]: [1],
  });
  await sleep(500);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫(爆弾)' }).click();
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});


test('3 player play, player1 plays monk, player2 plays princess_bomb, player3 win ', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser);
  await startGameManual(page1, ['alice','bob','charlie']);
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  await postSetup(page1, roomName, [1,1,12,4], {
    [aliceId]: [1],
    [bobId]: [7],
    [charlieId]: [2],
  });
  await sleep(500);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await expect(page1.getByText('勝者: charlie さん！')).toBeVisible();

  await context1.close();
  await context2.close();
  await context3.close();
});
