import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayers3FromConsole, sleep } from './utils/utils';

// E2E scenario: deck [兵士,兵士,兵士,将軍],
// initial hands: Player1 女侯爵, Player2 兵士,
// player1 draws 将軍 making total cost 13 and must play 女侯爵.

/*
test('player discard  by playing princess_bomb and bob win.', async ({ browser }) => {
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
  await sleep(1000);

  // Player2 joins room
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(1000);

  // Start game
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(1000);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Set up deterministic deck and hands
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 1, 12, 8], // draw order: 姫(爆弾), 兵士, 兵士, 兵士
      hands: {
        [aliceId]: [4], // 僧侶
        [bobId]: [1], // 兵士
      },
    },
  });
  await sleep(1000);

  // Player1 draws 姫（爆弾）
  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '僧侶' }).click();
  

  // alice is discard by 姫（爆弾）
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});
*/

test('3 player play, player1 plays monk, player2 plays princess_bomb, player3 win ', async ({ browser }) => {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();
  const context3: BrowserContext = await browser.newContext();
  const page3: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');
  await page3.goto('http://localhost:3000');


  // create room name
  const roomName = Math.random().toString(36).substring(2);

  // console msgを先にフックしておく
  const playersPromise = waitForPlayers3FromConsole(page1);

  // Player1 creates room
  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(1000);

  // Player2 joins room
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(1000);

　// Player3 joins room
  await page3.getByRole('textbox', { name: 'ニックネーム：' }).fill('charlie');
  await page3.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page3.getByRole('button', { name: '入室' }).click();
  await sleep(1000);

  // Start game
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await sleep(1000);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  // Set up deterministic deck and hands
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [1, 1, 12, 4], // draw order: 僧侶, 姫(爆弾), 兵士, 兵士
      hands: {
        [aliceId]: [1], // 道化
        [bobId]: [1], // 兵士
        [charlieId]: [2], // 道化

      },
    },
  });
  await sleep(1000);

  // Player1 draws 将軍
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 attempts to play 将軍 but is forced
  await page1.getByRole('button', { name: '僧侶' }).click();

  // Player2 draw princess_bomb, win Player3
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '姫(爆弾)' }).click();

  await expect(page1.getByText('勝者: charlie さん！')).toBeVisible(); 


  await context1.close();
  await context2.close();
});

