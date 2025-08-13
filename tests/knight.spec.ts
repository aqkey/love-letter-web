import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';

// E2E scenario: deck draw order [騎士, 兵士, 騎士, 兵士]
// initial hands: Player1 姫, Player2 伯爵夫人
// first player draws 騎士 but no one is eliminated

test('first player draws a knight but no one is eliminated', async ({ browser }) => {
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
　await sleep(2000);

  // Player2 joins room
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '部屋を作る / 入室' }).click();
　await sleep(2000);



  // Start game
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page2.getByRole('button', { name: 'ゲーム開始' }).click();


  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Set up deterministic deck and hands
  await page1.request.post('http://localhost:4000/test/setup', {
    data: {
      roomId: roomName,
      deck: [3, 3], // draw order: 騎士, 兵士, 騎士, 兵士
      hands: {
        [aliceId]: [8],  // 姫
        [bobId]: [10],   // 伯爵夫人
      },
    },
  });

  // Player1 draws 騎士
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // Player1 plays 騎士 targeting bob
  await page1.getByRole('button', { name: '騎士' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();

  // No one should be eliminated
  await expect(page1.getByText('bob (脱落)')).not.toBeVisible();
  await expect(page1.getByText('相手のターンです。お待ちください...')).toBeVisible();

  await context1.close();
  await context2.close();
});