import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';
// E2E scenario: deck draw order [道化, 騎士, 道化, 僧侶]
// initial hands: Player1 騎士, Player2 僧侶
// first player draws 道化 and sees bob's hand

test('first player draws a clown and sees opponent\'s hand', async ({ browser }) => {
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
  await page1.getByRole('button', { name: '部屋を作る / 入室' }).click();
　await sleep(1000);

  // Player2 joins room
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '部屋を作る / 入室' }).click();
　await sleep(1000);

  // Start game
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page2.getByRole('button', { name: 'ゲーム開始' }).click();

  　// ユーザIDの取得
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Set up deterministic deck and hands
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [4, 2, 3, 2], // draw order: 道化, 騎士, 道化, 僧侶
      hands: {
        [aliceId]: [3], // 騎士
        [bobId]: [4],   // 僧侶
      },
    },
  });
　await sleep(1000);

  // Player1 draws 道化
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays 道化 targeting bob
  await page1.getByRole('button', { name: '道化' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();

  // Modal should show bob's hand 僧侶
  await expect(page1.getByRole('heading', { name: '手札を見る' })).toBeVisible();
  await expect(page1.getByText(/bob.*僧侶/)).toBeVisible();
  await page1.getByRole('button', { name: 'OK' }).click();

  await context1.close();
  await context2.close();
});