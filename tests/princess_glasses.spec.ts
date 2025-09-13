import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

// If a player discards Princess while also holding Princess(Glasses),
// they should revive immediately and the game should not end.

test('discarding princess with princess_glasses in hand revives', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // alice は 姫(眼鏡) を所持 → 姫 をドローしプレイすると脱落→即復活の想定
  await postSetup(page1, roomName, [1,1,1,8], {
    [aliceId]: [9],
    [bobId]: [1],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫', exact: true }).click();
  // 復活により勝敗は未確定のまま、ドローボタンが有効になっている
  await sleep(300);
  await expect(page1.getByText('勝者:')).not.toBeVisible();
  await expect(page2.getByRole('button', { name: 'カードを引く' })).toBeEnabled();

  await context1.close();
  await context2.close();
});


// 兵士命中→復活: 命中後に勝者テキストが出ない、対象の手札がすぐ1枚になりターンが続く
test('soldier hits target; target revives (no winner, turn continues)', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // alice は道化で開始 → 兵士ドロー。bob は姫(眼鏡)のみ所持。
  await postSetup(page1, roomName, [1,3,1,1], {
    [aliceId]: [2],
    [bobId]: [9],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('姫', { exact: true }).check();
  await sleep(200);
  await page1.getByRole('button', { name: '決定' }).click();

  // 眼鏡により相手は即復活。勝者は出ない。
  await expect(page1.getByText('勝者:')).not.toBeVisible();
  await expect(page2.getByRole('button', { name: 'カードを引く' })).toBeEnabled();

  await context1.close();
  await context2.close();
});

// 姫(爆弾)プレイ＋眼鏡所持: 即脱落で復活しない、状況に応じて即決着
test('playing princess_bomb while holding glasses: no revival and lose', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // デッキ末尾が姫(爆弾)。aliceは眼鏡を所持して開始。
  await postSetup(page1, roomName, [1,1,1,12], {
    [aliceId]: [9],
    [bobId]: [1],
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫(爆弾)' }).click();
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});
