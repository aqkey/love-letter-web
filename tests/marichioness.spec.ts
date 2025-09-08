import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

// E2E scenario: deck [兵士,兵士,兵士,将軍],
// initial hands: Player1 女侯爵, Player2 兵士,
// player1 draws 将軍 making total cost 13 and must play 女侯爵.

test('player forced to play marchioness when hand cost is 12 or more', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,1,6], {
    [aliceId]: [11],
    [bobId]: [1],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '将軍' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();
  await expect(page1.getByText('手札のコスト合計が12以上のため、女侯爵を出さなければなりません。')).toBeVisible();
  await page1.getByRole('button', { name: '女侯爵' }).click();
  await context1.close();
  await context2.close();
});


test('player discard  when hand is  marchioness & minister', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

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

