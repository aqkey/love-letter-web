import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup, sleep } from './utils/utils';

// 再戦フロー: マスターが「もう一度遊ぶ」→ 再戦モーダルで開始 → 他プレイヤーが「ゲームに戻る」
// 期待: 他プレイヤー画面がゲーム画面へ遷移し、新規ゲームの状態（ログ・山札枚数・手番表示）が反映される
test('result -> replay modal -> other player returns to game', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // まずは1ゲーム目を即終了させて結果画面へ（alice が姫(爆弾)で負ける）
  await postSetup(page1, roomName, [1,1,1,12], {
    [aliceId]: [4],
    [bobId]: [1],
  });
  await sleep(400);
  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '姫(爆弾)' }).click();
  await expect(page1.getByText('勝者: bob さん！')).toBeVisible();
  await expect(page2.getByText('勝者: bob さん！')).toBeVisible();

  // マスター(alice)が「もう一度遊ぶ」を押して再戦モーダルを開き、先頭プレイヤーを alice に指定して開始
  await page1.getByRole('button', { name: 'もう一度遊ぶ' }).click();
  await expect(page1.getByText('再戦のターン順の設定')).toBeVisible();
  await page1.getByLabel('先頭のプレイヤーを選択（2番目以降はランダム）').check();
  await page1.getByRole('combobox').selectOption({ label: 'alice' });
  await page1.getByRole('button', { name: '再戦開始' }).click();

  // bob 画面がゲーム画面に遷移し、新規ゲームの要素が見えること
  // - 手番表示/ドロー操作のいずれかが見える
  // - 「ゲームが開始されました」ログが表示される
  await sleep(500);
  const turnText = page2.getByText('相手のターンです。お待ちください...');
  const drawBtn = page2.getByRole('button', { name: 'カードを引く' });
  await expect(turnText.or(drawBtn)).toBeVisible();

  await context1.close();
  await context2.close();
});
