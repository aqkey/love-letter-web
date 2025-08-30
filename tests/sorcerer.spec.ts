import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a magician and eliminates opponent holding princess', async ({ browser }) => {

  
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
      deck: [1, 1, 1, 5], // draw order: 魔術師, 兵士, 兵士, 兵士
      hands: {
        [aliceId]: [4], // 僧侶
        [bobId]: [8],   // 姫
      },
    },
  });

  // Player1 draws soldier
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays 魔術師 targeting bob
  await page1.getByRole('button', { name: '魔術師' }).click();
  await page1.getByLabel('bob').check();
  await sleep(1000);
  await page1.getByRole('button', { name: '決定' }).click();

  // bob should be eliminated for discarding 姫
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a magician and use.  second player do not discart countess ', async ({ browser }) => {
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
      deck: [1, 1, 1, 5], // draw order: 魔術師, 兵士, 兵士, 兵士
      hands: {
        [aliceId]: [1], // 兵士
        [bobId]: [10],   // 伯爵夫人
      },
    },
  });

  // Player1 draws soldier
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays 魔術師 targeting bob
  await page1.getByRole('button', { name: '魔術師' }).click();
  await page1.getByLabel('bob').check();
  await sleep(1000);
  await page1.getByRole('button', { name: '決定' }).click();

  // bob should be eliminated for discarding 姫
  await expect(page1.getByText('相手のターンです。お待ちください...')).toBeVisible();

　// Player1 draws soldier
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  // Player1 plays soldier targeting bob
  await page2.getByRole('button', { name: '兵士' }).click();



  await context1.close();
  await context2.close();
});