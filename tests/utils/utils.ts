import { Page, Browser, BrowserContext } from '@playwright/test';

/**
 * Capture players info from console logs after both players join
 * 
 * @param page1 プレイヤー1のPageオブジェクト
 * @returns プレイヤー情報配列（例：[{ id, name }, { id, name }]）
 */
export function waitForPlayersFromConsole(page1: Page): Promise<any[]> {
  return new Promise(resolve => {
    page1.on('console', async msg => {
      console.log(`[browser console] ${msg.text()}`);
      if (msg.text().startsWith('gameStarted players:')) {
        const args = msg.args();
        if (args.length >= 2) {
          const arr = await args[1].jsonValue();
          if (Array.isArray(arr) && arr.length === 2) {
            resolve(arr);
          }
        }
      }
    });
  });
}
export function waitForPlayers3FromConsole(page1: Page): Promise<any[]> {
  return new Promise(resolve => {
    page1.on('console', async msg => {
      console.log(`[browser console] ${msg.text()}`);
      if (msg.text().startsWith('gameStarted players:')) {
        const args = msg.args();
        if (args.length >= 2) {
          const arr = await args[1].jsonValue();
          if (Array.isArray(arr) && arr.length === 3) {
            resolve(arr);
          }
        }
      }
    });
  });
}


/**
 * 指定ミリ秒だけ非同期で待機する
 * @param ms 待機する時間（ミリ秒）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 2人用のルームを作成し、alice/bobで入室して初期化する
 */
export async function createRoomAndJoinTwo(browser: Browser, aliceName = 'alice', bobName = 'bob') {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayersFromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill(aliceName);
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill(bobName);
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  return { context1, page1, context2, page2, roomName, playersPromise };
}

/** 開始モーダル: 完全ランダムで開始 */
export async function startGameRandom(page1: Page) {
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page1.getByLabel('完全ランダム').check();
  await page1.getByRole('button', { name: '開始', exact: true }).click();
  await sleep(500);
}

/** 開始モーダル: 先頭プレイヤーを選んで開始（2番目以降はランダム） */
export async function startGameChooseFirst(page1: Page, firstPlayerLabel: string) {
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page1.getByLabel('先頭のプレイヤーを選択（2番目以降はランダム）').check();
  await page1.getByRole('combobox').selectOption({ label: firstPlayerLabel });
  await page1.getByRole('button', { name: '開始', exact: true }).click();
  await sleep(500);
}

/** 3人用にルームを作成し、alice/bob/charlie で入室する */
export async function createRoomAndJoinThree(browser: Browser, names = ['alice','bob','charlie']) {
  const context1: BrowserContext = await browser.newContext();
  const page1: Page = await context1.newPage();
  const context2: BrowserContext = await browser.newContext();
  const page2: Page = await context2.newPage();
  const context3: BrowserContext = await browser.newContext();
  const page3: Page = await context3.newPage();

  await page1.goto('http://localhost:3000');
  await page2.goto('http://localhost:3000');
  await page3.goto('http://localhost:3000');

  const roomName = Math.random().toString(36).substring(2);
  const playersPromise = waitForPlayers3FromConsole(page1);

  await page1.getByRole('textbox', { name: 'ニックネーム：' }).fill(names[0]);
  await page1.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page1.getByRole('button', { name: '部屋を作る' }).click();
  await sleep(500);

  await page2.getByRole('textbox', { name: 'ニックネーム：' }).fill(names[1]);
  await page2.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page2.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  await page3.getByRole('textbox', { name: 'ニックネーム：' }).fill(names[2]);
  await page3.getByRole('textbox', { name: 'ルームID：' }).fill(roomName);
  await page3.getByRole('button', { name: '入室' }).click();
  await sleep(500);

  return { context1, page1, context2, page2, context3, page3, roomName, playersPromise };
}

/** デッキと手札を固定 */
export async function postSetup(page: Page, roomName: string, deck: number[], hands: Record<string, number[]>) {
  await page.request.post('http://localhost:4000/test/setup', {
    data: { roomId: roomName, deck, hands },
  });
}

/** 開始モーダル: 完全マニュアルで順番を指定して開始 */
export async function startGameManual(page1: Page, orderLabels: string[]) {
  await page1.getByRole('button', { name: 'ゲーム開始' }).click();
  await page1.getByLabel('完全マニュアル（全員の順番を指定）').check();
  // 順にセレクトを埋める
  const selects = page1.locator('select');
  const count = await selects.count();
  for (let i = 0; i < Math.min(count, orderLabels.length); i++) {
    await selects.nth(i).selectOption({ label: orderLabels[i] });
  }
  await page1.getByRole('button', { name: '開始', exact: true }).click();
  await sleep(500);
}
