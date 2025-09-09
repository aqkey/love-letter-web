import React, { useState } from "react";
import socket from "./socket";
import Lobby from "./Lobby";
import Game from "./Game";
import HowTo from "./HowTo";

type CardDto = { id: number; name: string; enName: string; cost: number };
type FinalHandEntry = { id: string; name: string; hand: CardDto[]; isEliminated?: boolean };
type PlayedCardEntry = { player: string; card: CardDto };

const App: React.FC = () => {
  const [screen, setScreen] = useState<"lobby" | "game" | "result" | "howto">("lobby");
  const [roomId, setRoomId] = useState<string>(() => localStorage.getItem("roomId") || "");
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem("playerName") || "");
  const [winner, setWinner] = useState<string>("");
  const [finalHands, setFinalHands] = useState<FinalHandEntry[]>([]);
  const [finalEventLogs, setFinalEventLogs] = useState<string[]>([]);
  const [finalPlayedCards, setFinalPlayedCards] = useState<PlayedCardEntry[]>([]);
  const [finalRemovedCard, setFinalRemovedCard] = useState<CardDto | null>(null);
  const [autoOpenStartModal, setAutoOpenStartModal] = useState<boolean>(false);
  const [gameMasterId, setGameMasterId] = useState<string | null>(null);
  // 再戦用モーダルの状態
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartOrderMode, setRestartOrderMode] = useState<'random' | 'choose_first' | 'manual'>('random');
  const [restartFirstPlayerId, setRestartFirstPlayerId] = useState<string>("");
  const [restartManualOrder, setRestartManualOrder] = useState<string[]>([]);

  const handleReturnToLobby = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("roomId");
    localStorage.removeItem("playerName");
    setRoomId("");
    setPlayerName("");
    setScreen("lobby");
  };

  const handleReplay = () => {
    // 同じルーム・同じ参加者で再開。ロビーに戻して開始モーダルを自動表示
    setAutoOpenStartModal(true);
    setScreen("lobby");
  };

  React.useEffect(() => {
    const onAppGameStarted = () => {
      setScreen("game");
    };
    socket.on("gameStarted", onAppGameStarted);
    return () => {
      socket.off("gameStarted", onAppGameStarted);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {screen === "lobby" && (
        <Lobby
          setScreen={setScreen}
          roomId={roomId}
          setRoomId={setRoomId}
          playerName={playerName}
          setPlayerName={setPlayerName}
          autoOpenStartModal={autoOpenStartModal}
          onAutoStartHandled={() => setAutoOpenStartModal(false)}
        />
      )}
      {screen === "game" && (
        <Game
          setScreen={setScreen}
          roomId={roomId}
          playerName={playerName}
          setWinner={setWinner}
          setFinalHands={setFinalHands}
          setFinalEventLogs={setFinalEventLogs}
          setFinalPlayedCards={setFinalPlayedCards}
          setFinalRemovedCard={setFinalRemovedCard}
          setGameMasterId={setGameMasterId}
        />
      )}
      {screen === "howto" && (
        <HowTo setScreen={setScreen} />
      )}
          {screen === "result" && (
        <div className="max-w-4xl mx-auto bg-white p-4 rounded shadow space-y-4 w-full">
          <div>
            {winner === "引き分け" ? (
              <h1 className="text-2xl mb-2">引き分けでした！</h1>
            ) : (
              <h1 className="text-2xl mb-2">勝者: {winner} さん！</h1>
            )}
          </div>

          {/* 2カラムレイアウト */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左カラム */}
            <div className="space-y-4">
              {/* 左上: 最終手札 */}
              <div className="border rounded p-3">
                <h2 className="text-lg font-bold mb-2">各プレイヤーの最終手札</h2>
                <ul className="space-y-2">
                  {finalHands.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span className="w-24 shrink-0">{p.name}</span>
                      <div className="flex flex-wrap gap-2">
                        {p.hand.map((card, idx) => (
                          <img
                            key={idx}
                            src={`/cards/${card.enName}.svg`}
                            alt={card.name}
                            className="w-10 h-auto"
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {/* 左下: 場に出たカード履歴 */}
              <div className="border rounded p-3">
                <h2 className="text-lg font-bold mb-2">場に出たカード履歴</h2>
                <ul className="space-y-2">
                  {finalPlayedCards.map((entry, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-24 shrink-0">{entry.player} さん:</span>
                      <img
                        src={`/cards/${entry.card.enName}.svg`}
                        alt={entry.card.name}
                        className="w-10 h-auto"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 右カラム */}
            <div className="space-y-4">
              {/* 右上: 除外カード */}
              <div className="border rounded p-3">
                <h2 className="text-lg font-bold mb-2">開始時に除外されたカード</h2>
                {finalRemovedCard ? (
                  <img
                    src={`/cards/${finalRemovedCard.enName}.svg`}
                    alt={finalRemovedCard.name}
                    className="w-16 h-auto"
                  />
                ) : (
                  <p className="text-sm text-gray-500">情報なし</p>
                )}
              </div>
              {/* 右下: イベントログ */}
              <div className="border rounded p-3">
                <h2 className="text-lg font-bold mb-2">イベントログ</h2>
                <div className="border rounded p-2 h-64 overflow-y-auto bg-gray-50">
                  {finalEventLogs.map((log, index) => (
                    <p key={index} className="text-sm">{log}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleReturnToLobby}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          >
            ロビーに戻る
          </button>
          {(() => {
            const myId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null;
            const isGameMaster = gameMasterId && myId && gameMasterId === myId;
            if (!isGameMaster) return null;
            return (
              <button
                onClick={() => {
                  // 再戦モーダルを開く（初期値設定）
                  setRestartOrderMode('random');
                  setRestartFirstPlayerId('');
                  setRestartManualOrder(finalHands.map(p => p.id));
                  setShowRestartModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded w-full"
              >
                もう一度遊ぶ
              </button>
            );
          })()}

          {showRestartModal && (
            <div className="fixed z-30 left-0 top-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-white p-4 rounded shadow max-w-md w-11/12">
                <h3 className="text-lg font-bold mb-2">再戦のターン順の設定</h3>
                <div className="space-y-2 mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restartOrderMode"
                      checked={restartOrderMode === 'random'}
                      onChange={() => setRestartOrderMode('random')}
                    />
                    完全ランダム
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restartOrderMode"
                      checked={restartOrderMode === 'choose_first'}
                      onChange={() => setRestartOrderMode('choose_first')}
                    />
                    先頭のプレイヤーを選択（2番目以降はランダム）
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="restartOrderMode"
                      checked={restartOrderMode === 'manual'}
                      onChange={() => setRestartOrderMode('manual')}
                    />
                    完全マニュアル（全員の順番を指定）
                  </label>
                </div>

                {restartOrderMode === 'choose_first' && (
                  <div className="mb-3">
                    <label className="block mb-1">先頭のプレイヤー</label>
                    <select
                      className="border rounded w-full p-2"
                      value={restartFirstPlayerId}
                      onChange={(e) => setRestartFirstPlayerId(e.target.value)}
                    >
                      <option value="">選択してください</option>
                      {finalHands.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {restartOrderMode === 'manual' && (
                  <div className="mb-3 space-y-2">
                    {finalHands.map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-20 shrink-0">{idx + 1}番手</span>
                        <select
                          className="border rounded w-full p-2"
                          value={restartManualOrder[idx] || ''}
                          onChange={(e) => {
                            const next = [...restartManualOrder];
                            next[idx] = e.target.value;
                            setRestartManualOrder(next);
                          }}
                        >
                          <option value="">選択してください</option>
                          {finalHands.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">同じプレイヤーを重複選択しないようにしてください。</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRestartModal(false)}
                    className="px-3 py-2 rounded text-gray-700"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => {
                      const payload: any = { roomId, orderMode: restartOrderMode };
                      if (restartOrderMode === 'choose_first' && restartFirstPlayerId) {
                        payload.firstPlayerId = restartFirstPlayerId;
                      }
                      if (restartOrderMode === 'manual') {
                        payload.turnOrder = restartManualOrder;
                      }
                      socket.emit('restartGame', payload);
                      setShowRestartModal(false);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    disabled={
                      (restartOrderMode === 'choose_first' && !restartFirstPlayerId) ||
                      (restartOrderMode === 'manual' && (
                        !restartManualOrder.length ||
                        new Set(restartManualOrder).size !== finalHands.length ||
                        restartManualOrder.some(v => !v)
                      ))
                    }
                  >
                    再戦開始
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
