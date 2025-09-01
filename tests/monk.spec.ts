import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';

test('Monk protection blocks Soldier and logs event', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(500);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // 1) 状態セット: alice=僧侶, bob=兵士
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 1, 1, 1],
      hands: {
        [aliceId]: [4],
        [bobId]: [1],
      },
    },
  });
  await sleep(300);

  // 2) プレイ: aliceが僧侶、bobが兵士
  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page1.getByRole('button', { name: '僧侶' }).click();
  await sleep(200);

  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page2.getByRole('button', { name: '兵士' }).first().click();
  await page2.getByLabel('alice').check();
  await page2.getByLabel('伯爵夫人').check();
  await sleep(200);
  await page2.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('bob さんが 兵士 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Clown and logs event', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(500);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [2, 1, 3, 2],
      hands: {
        [aliceId]: [4],
        [bobId]: [2],
      },
    },
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page1.getByRole('button', { name: '僧侶' }).click();
  await sleep(200);

  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page2.getByRole('button', { name: '道化' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 道化 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Knight and logs event', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(500);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [3, 1, 2, 3],
      hands: {
        [aliceId]: [4],
        [bobId]: [3],
      },
    },
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page1.getByRole('button', { name: '僧侶' }).click();
  await sleep(200);

  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page2.getByRole('button', { name: '騎士' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 騎士 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks Sorcerer and logs event', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(500);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [5, 1, 2, 3],
      hands: {
        [aliceId]: [4],
        [bobId]: [5],
      },
    },
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page1.getByRole('button', { name: '僧侶' }).click();
  await sleep(200);

  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page2.getByRole('button', { name: '魔術師' }).click();
  await page2.getByLabel('alice').check();
  await sleep(200);
  await page2.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('bob さんが 魔術師 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});

test('Monk protection blocks General and logs event', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(500);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [6, 1, 2, 3],
      hands: {
        [aliceId]: [4],
        [bobId]: [6],
      },
    },
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page1.getByRole('button', { name: '僧侶' }).click();
  await sleep(200);

  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await sleep(200);
  await page2.getByRole('button', { name: '将軍' }).click();
  await page2.getByRole('button', { name: 'alice' }).click();

  await expect(page1.getByText('bob さんが 将軍 を出しました')).toBeVisible();
  await expect(page1.getByText('alice は僧侶の効果で守られました')).toBeVisible();

  await context1.close();
  await context2.close();
});
