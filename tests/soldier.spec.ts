import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, waitForPlayers3FromConsole, sleep, createRoomAndJoinTwo, createRoomAndJoinThree, startGameChooseFirst, postSetup } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a soldier and eliminates opponent', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,3,1,1], {
    [aliceId]: [2],
    [bobId]: [4],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('僧侶').check();
  await sleep(300);
  await page1.getByRole('button', { name: '決定' }).click();
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

// 3-players: first player uses Soldier, logs show declaration and target is eliminated
test('three players soldier declaration logs and eliminates target', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  await postSetup(page1, roomName, [1,3,5,1], {
    [aliceId]: [2],
    [bobId]: [4],
    [charlieId]: [1],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('僧侶').check();
  await sleep(300);
  await page1.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('alice さんが 兵士 で bob さんの 僧侶 を宣言 → 的中！')).toBeVisible();
  await expect(page1.getByText('bob (脱落)')).toBeVisible();

  await context1.close();
  await context2.close();
  await context3.close();
});

// Soldier princess-family grouping: guessing Princess(Glasses) hits when target holds Princess
test('soldier guess princess_glasses hits target holding princess', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,3,2,1], {
    [aliceId]: [2],
    [bobId]: [8],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('姫(眼鏡)').check();
  await sleep(200);
  await page1.getByRole('button', { name: '決定' }).click();
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

// Soldier princess-family grouping: guessing Princess(Bomb) hits when target holds Princess
test('soldier guess princess_bomb hits target holding princess', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,3,2,1], {
    [aliceId]: [2],
    [bobId]: [8],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('姫(爆弾)').check();
  await sleep(200);
  await page1.getByRole('button', { name: '決定' }).click();
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});
