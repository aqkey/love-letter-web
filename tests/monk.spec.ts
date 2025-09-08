import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, waitForPlayersFromConsole, sleep } from './utils/utils';

test('Monk protection blocks Soldier and logs event', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,1,1], {
    [aliceId]: [4],
    [bobId]: [1],
  });
  await sleep(200);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '兵士' }).first().click();
  await page2.getByLabel('alice').check();
  await page2.getByLabel('伯爵夫人').check();
  await page2.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('bob さんが 兵士 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Clown and logs event', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [2,1,3,2], {
    [aliceId]: [4],
    [bobId]: [2],
  });
  await sleep(200);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '道化' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 道化 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Knight and logs event', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [3,1,2,3], {
    [aliceId]: [4],
    [bobId]: [3],
  });
  await sleep(200);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '騎士' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 騎士 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Sorcerer and logs event', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [5,1,2,3], {
    [aliceId]: [4],
    [bobId]: [5],
  });
  await sleep(200);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '魔術師' }).click();
  await page2.getByLabel('alice').check();
  await page2.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('bob さんが 魔術師 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks General and logs event', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [6,1,2,3], {
    [aliceId]: [4],
    [bobId]: [6],
  });
  await sleep(200);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '将軍' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 将軍 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});
