import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, waitForPlayers3FromConsole, sleep } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a soldier and eliminates opponent', async ({ browser }) => {

  
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();



  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  // create room name
  const roomName = Math.random().toString(36).substring(2);


  // console msgを先にフックしておく
  const playersPromise = waitForPlayersFromConsole(page1);

  // Player1 creates room
  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
　await sleep(2000);

  // Player2 joins room
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
　await sleep(2000);



  // Start game
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(2000);


  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Set up deterministic deck and hands
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 3, 1, 1], // draw order: soldier, soldier, knight, soldier
      hands: {
        [aliceId]: [2], // 道化
        [bobId]: [4]   // 僧侶
      },
    },
  });

  // Player1 draws soldier
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays soldier targeting bob and guessing 僧侶
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('僧侶').check();
  await sleep(1000);

  await page1.getByRole('button', { name: '決定' }).click();
  await sleep(1000);
  // bob should be eliminated
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

// 3-players: first player uses Soldier, logs show declaration and target is eliminated
test('three players soldier declaration logs and eliminates target', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();
  const context3: BrowserContext = await browser.newContext();
  const page3: Page = await context3.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');
  await page3.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayers3FromConsole(page1);

  // Join three players
  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(1000);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(1000);

  await page3.getByRole('textbox', { name: 'ニックネーム：' }).fill('charlie');
  await page3.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page3.getByRole('button', { name: '入室' }).click();
  await sleep(1000);

  // Start game (only room owner: alice)
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  // Deterministic setup: alice draws Soldier, bob holds Monk
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 3, 5, 1], // first draw: Soldier for alice
      hands: {
        [aliceId]: [2], // clown
        [bobId]: [4],   // monk (target)
        [charlieId]: [1], // soldier (irrelevant)
      },
    },
  });

  // Alice draws and plays Soldier on bob, guessing Monk
  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('僧侶').check();
  await sleep(500);
  await page1.getByRole('button', { name: '決定' }).click();

  // Check event log message (hit)
  await expect(
    page1.getByText('alice さんが 兵士 で bob さんの 僧侶 を宣言 → 的中！')
  ).toBeVisible();

  // Bob should be marked eliminated in player list
  await expect(page1.getByText('bob (脱落)')).toBeVisible();

  await context1.close();
  await context2.close();
  await context3.close();
});

// Soldier princess-family grouping: guessing Princess(Glasses) hits when target holds Princess
test('soldier guess princess_glasses hits target holding princess', async ({ browser }) => {
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
  await sleep(800);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(800);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(800);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 3, 2, 1], // alice draws Soldier
      hands: {
        [aliceId]: [2], // clown
        [bobId]: [8],   // princess
      },
    },
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('姫(眼鏡)').check();
  await sleep(300);
  await page1.getByRole('button', { name: '決定' }).click();

  // Hit should be recognized and bob eliminated (game ends)
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

// Soldier princess-family grouping: guessing Princess(Bomb) hits when target holds Princess
test('soldier guess princess_bomb hits target holding princess', async ({ browser }) => {
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
  await sleep(800);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(800);

  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(800);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 3, 2, 1], // alice draws Soldier
      hands: {
        [aliceId]: [2], // clown
        [bobId]: [8],   // princess
      },
    },
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '兵士' }).click();
  await page1.getByLabel('bob').check();
  await page1.getByLabel('姫(爆弾)').check();
  await sleep(300);
  await page1.getByRole('button', { name: '決定' }).click();

  // Hit should be recognized and bob eliminated (game ends)
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});
