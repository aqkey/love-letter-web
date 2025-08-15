import { test, expect, BrowserContext, Page } from '@playwright/test';
import { waitForPlayersFromConsole, sleep } from './utils/utils';


// E2E scenario: deck [兵士,兵士,騎士,兵士],
// initial hands: Player1 道化, Player2 僧侶,
// first player draws 兵士 and eliminates opponent.

test('first player draws a soldier and eliminates opponent', async ({ browser }) => {
  // TODO
});