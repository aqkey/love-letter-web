import { Page } from '@playwright/test';

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


/**
 * 指定ミリ秒だけ非同期で待機する
 * @param ms 待機する時間（ミリ秒）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


