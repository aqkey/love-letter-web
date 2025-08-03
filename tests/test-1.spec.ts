import { test, expect } from '@playwright/test';


test('two players can start and play a game', async ({ page }) => {
  // 1人目プレイヤー: フロントエンド側でUI操作
  await page.goto('/');
  await page.fill('input[name="room"]', 'ROOM1');
  await page.fill('input[name="name"]', 'Alice');
  await page.click('button#create-room');
  // 2人目プレイヤーは Socket.IO クライアントを直接使う例
  await page.goto('/');
  await page.fill('input[name="room"]', 'ROOM1');
  await page.fill('input[name="name"]', 'Bob');
  await page.click('button#create-room');

  // Game Start
  await page.click('button#start-game');
  await expect(page.locator('text=Aliceのターン')).toBeVisible();

  // カードを引く → 出す、などプレイの流れをテスト
  await page.click('button#draw');
  await page.click('button[data-card-index="0"]');

  // プレイ結果を検証
  await expect(page.locator('text=Bobのターン')).toBeVisible();

});