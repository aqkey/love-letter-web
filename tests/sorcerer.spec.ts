import { test, expect, BrowserContext, Page } from '@playwright/test';
import { sleep, createRoomAndJoinTwo, startGameChooseFirst, postSetup } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a magician and eliminates opponent holding princess', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,1,5], {
    [aliceId]: [4],
    [bobId]: [8],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '魔術師' }).click();
  await page1.getByLabel('bob').check();
  await sleep(500);
  await page1.getByRole('button', { name: '決定' }).click();
  await expect(page1.getByText('勝者: alice さん！')).toBeVisible();

  await context1.close();
  await context2.close();
});

// Sorcerer UI: target hand updates immediately on forced discard (with replacement draw)
test('sorcerer forces discard and target UI shows replacement card', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // Deck: after alice draws sorcerer(5), remaining deck is [1,1,3]; replacement draw pops last => 3 (騎士)
  await postSetup(page1, roomName, [1,1,3,5], {
    [aliceId]: [2],   // 道化（aliceは引いて魔術師を使う）
    [bobId]: [1],     // 兵士（強制捨て → 置き直しで騎士に更新されるはず）
  });
  await sleep(300);

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '魔術師' }).click();
  await page1.getByLabel('bob').check();
  await sleep(200);
  await page1.getByRole('button', { name: '決定' }).click();

  // Target(bob) UI should update to show Knight (騎士)
  await expect(page2.getByRole('img', { name: '騎士' })).toBeVisible();
  // And should not show Soldier (兵士) anymore

  await context1.close();
  await context2.close();
});


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a magician and use.  second player do not discart countess ', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Start game (random order is fine for this test)
  await startGameChooseFirst(page1, 'alice');

  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  await postSetup(page1, roomName, [1,1,1,5], {
    [aliceId]: [1],
    [bobId]: [10],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '魔術師' }).click();
  await page1.getByLabel('bob').check();
  await sleep(500);
  await page1.getByRole('button', { name: '決定' }).click();

  await expect(page1.getByText('相手のターンです。お待ちください...')).toBeVisible();
  await page2.getByRole('button', { name: 'カードを引く' }).click();
  await page2.getByRole('button', { name: '兵士' }).click();

  await context1.close();
  await context2.close();
});
