import { io } from "socket.io-client";

// 接続先は環境変数で指定。未設定時は「同一オリジン」を優先し、
// それも不可能な場合の最終手段として localhost を使用。
// 例) REACT_APP_SOCKET_URL=http://192.168.0.10:4000
let socketUrl = process.env.REACT_APP_SOCKET_URL as string | undefined;
if (!socketUrl) {
  if (typeof window !== "undefined") {
    // 開発環境（ポート3000）では、同一ホストの4000番へ接続
    if (window.location.port === "3000") {
      socketUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
    } else {
      // それ以外は同一オリジン（空文字）
      socketUrl = "";
    }
  } else {
    // SSRやテストなどブラウザ外はlocalhostへ
    socketUrl = "http://localhost:4000";
  }
}

const socket = io(socketUrl);

export default socket;
