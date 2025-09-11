import { test, expect } from '@playwright/test';
import { createRoomAndJoinThree, startGameManual, postSetup, sleep } from './utils/utils';

// 3人対戦で、山札が尽きたタイミングで手札の最大コスト比較となり
// 2人が魔術師(5)を持って引き分けになるケース
test('three players draw game when two hold sorcerer at deck exhaustion', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser, ['alice','bob','charlie']);

  // 開始順を固定: alice → bob → charlie
  await startGameManual(page1, ['alice','bob','charlie']);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  // 山札を空にしてから、alice がドローを試みると即座に決着 → 手札最大コスト比較
  // alice: 魔術師(5), bob: 魔術師(5), charlie: 兵士(1) → 引き分け
  await postSetup(page1, roomName, [], {
    [aliceId]: [5],
    [bobId]: [5],
    [charlieId]: [1],
  });
  await sleep(300);

  // 先頭プレイヤー alice がドローを押下（山札がない → 決着処理へ）
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // リザルト画面の遷移には演出の余韻でディレイがあるため、十分に待つ
  await expect(page1.getByText('引き分けでした！')).toBeVisible({ timeout: 10000 });

  await context1.close();
  await context2.close();
  await context3.close();
});

// 引き分け後にミニゲームが行われ、勝者が決まることを確認する
test('tie triggers mini-game and decides a winner', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser, ['alice','bob','charlie']);

  // 開始順を固定: alice → bob → charlie
  await startGameManual(page1, ['alice','bob','charlie']);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  // 山札を空にし、alice/bob が同コスト最大の手札で引き分け、charlie は兵士(1)
  await postSetup(page1, roomName, [], {
    [aliceId]: [5],
    [bobId]: [5],
    [charlieId]: [1],
  });
  await sleep(300);

  // 山札なしでドロー→即リザルト（引き分け）
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // 引き分け表示を確認
  await expect(page1.getByText('引き分けでした！')).toBeVisible({ timeout: 10000 });

  // 約7秒後にミニゲームモーダルが自動表示される（トップ同率の生存者のみ候補）
  await expect(page1.getByText('引き分け判定ミニゲーム')).toBeVisible({ timeout: 20000 });
  // モーダル上の候補リストが alice/bob のみであること（順不同）
  await expect(page1.getByText(/alice\s*\/\s*bob|bob\s*\/\s*alice/)).toBeVisible();

  // スピン後に自動で勝者が決定され、モーダルが閉じて結果が更新される
  // 勝者は alice/bob のいずれかになる
  await expect(page1.getByText('引き分け判定ミニゲーム')).toBeHidden({ timeout: 15000 });
  await expect(page1.getByText(/alice is winner!!|bob is winner!!/)).toBeVisible({ timeout: 15000 });

  await context1.close();
  await context2.close();
  await context3.close();
});

// 3人プレイで最後の手札が「姫 / 姫(眼鏡) / 姫(爆弾)」で全員同率トップの場合、
// 3人でミニゲームに参加することを確認
test('three-way tie shows all three players in mini-game', async ({ browser }) => {
  const { context1, page1, context2, page2, context3, page3, roomName, playersPromise } = await createRoomAndJoinThree(browser, ['alice','bob','charlie']);

  // 開始順を固定: alice → bob → charlie
  await startGameManual(page1, ['alice','bob','charlie']);

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;
  const charlieId = players.find(p => p.name === 'charlie').id;

  // 山札を空にし、3人の最終手札コストが全員8（同率トップ）
  await postSetup(page1, roomName, [], {
    [aliceId]: [8],  // 姫
    [bobId]: [9],    // 姫(眼鏡)
    [charlieId]: [12] // 姫(爆弾)
  });
  await sleep(300);

  // 山札なしでドロー→即リザルト（引き分け）
  await page1.getByRole('button', { name: 'カードを引く' }).click();

  // 引き分け表示を確認
  await expect(page1.getByText('引き分けでした！')).toBeVisible({ timeout: 10000 });

  // 約7秒後にミニゲームモーダルが自動表示され、候補に3人全員が含まれる（順不同）
  await expect(page1.getByText('引き分け判定ミニゲーム')).toBeVisible({ timeout: 20000 });
  const anyOrder = /(alice\s*\/\s*bob\s*\/\s*charlie|alice\s*\/\s*charlie\s*\/\s*bob|bob\s*\/\s*alice\s*\/\s*charlie|bob\s*\/\s*charlie\s*\/\s*alice|charlie\s*\/\s*alice\s*\/\s*bob|charlie\s*\/\s*bob\s*\/\s*alice)/;
  await expect(page1.getByText(anyOrder)).toBeVisible();
  await sleep(10000);
  await context1.close();
  await context2.close();
  await context3.close();
});
