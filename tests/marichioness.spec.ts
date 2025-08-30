import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';

// E2E scenario: deck [兵士,兵士,兵士,将軍],
// initial hands: Player1 女侯爵, Player2 兵士,
// player1 draws 将軍 making total cost 13 and must play 女侯爵.

test('player forced to play marchioness when hand cost is 12 or more', async ({ browser }) => {
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
      deck: [1, 1, 1, 6], // draw order: 将軍, 兵士, 兵士, 兵士
      hands: {
        [aliceId]: [11], // 女侯爵
        [bobId]: [1], // 兵士
      },
    },
  });
  await sleep(1000);

  // Player1 draws 将軍
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 attempts to play 将軍 but is forced to play 女侯爵
  await page1.getByRole('button', { name: '将軍' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();


  await expect(
    page1.getByText('手札のコスト合計が12以上のため、女侯爵を出さなければなりません。')
  ).toBeVisible();

  // Play 女侯爵
  await page1.getByRole('button', { name: '女侯爵' }).click();
  await expect(page1.getByRole('button', { name: '女侯爵' })).not.toBeVisible();

  // player2 play card
  await page2.getByRole('button', { name: 'カードを引く' }).click();


  await context1.close();
  await context2.close();
});


test('player discard  when hand is  marchioness & minister', async ({ browser }) => {
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
      deck: [1, 1, 1, 7], // draw order: 大臣, 兵士, 兵士, 兵士
      hands: {
        [aliceId]: [11], // 女侯爵
        [bobId]: [1], // 兵士
      },
    },
  });
  await sleep(1000);

  // Player1 draws 将軍
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // alice is discard by minister
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

