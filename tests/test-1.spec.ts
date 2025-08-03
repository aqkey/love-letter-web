import { test, expect, BrowserContext, Page } from '@playwright/test';


test('two players can start and play a game', async ({ browser }) => {
  // 1人目プレイヤー: フロントエンド側でUI操作
  // プレイヤー1用のブラウザコンテキスト（クッキー・セッション分離）
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  await page1.goto('http://localhost:3000');

  // プレイヤー2用のブラウザコンテキスト
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();
  await page2.goto('http://localhost:3000');

  // プレイヤー1が部屋を作成
  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill('alice');
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill('roomA');
  await page1.getByRole('button', { name: '部屋を作る / 入室' }).click();

  // プレイヤー2が部屋に参加
  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill('bob');
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill('roomA');
  await page2.getByRole('button', { name: '部屋を作る / 入室' }).click();


  // Game Start
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page2.getByRole('button', { name: 'ゲーム開始' }).click();


  // カードを引く → 出す、などプレイの流れをテスト
  await page1.getByRole('button', {name:'カードを引く'}).click();

  // プレイ結果を検証
  // TODO

});