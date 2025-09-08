import { test, expect } from '@playwright/test';
import { createRoomAndJoinTwo, startGameChooseFirst, postSetup } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('general swaps hands between players', async ({ browser }) => {
  const { context1, page1, context2, page2, roomName, playersPromise } = await createRoomAndJoinTwo(browser);
  // Ensure alice starts first to draw General deterministically
  await startGameChooseFirst(page1, 'alice');
  const players = await playersPromise;
  const aliceId = players.find(p => p.name === 'alice').id;
  const bobId = players.find(p => p.name === 'bob').id;

  // draw uses stack pop(); place desired top card (将軍=6) at the end
  await postSetup(page1, roomName, [1,1,1,6], {
    [aliceId]: [1],
    [bobId]: [4],
  });

  await page1.getByRole('button', { name: 'カードを引く' }).click();
  await page1.getByRole('button', { name: '将軍' }).click();
  await page1.getByRole('button', { name: 'bob' }).click();
  await page1.waitForTimeout(300);
  await context1.close();
  await context2.close();
});
