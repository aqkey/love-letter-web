import React, { useState, useEffect } from "react";
import socket from "./socket";

interface LobbyProps {
  setScreen: (screen: "lobby" | "game" | "result" | "howto") => void;
  roomId: string;
  setRoomId: (roomId: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  // リザルトからの「もう一度遊ぶ」で遷移してきた場合に開始モーダルを自動表示する
  autoOpenStartModal?: boolean;
  onAutoStartHandled?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  setScreen,
  roomId,
  setRoomId,
  playerName,
  setPlayerName,
  autoOpenStartModal = false,
  onAutoStartHandled,
}) => {
  const [players, setPlayers] = useState<{ name: string }[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem("playerId"));
  const [gameMasterId, setGameMasterId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderMode, setOrderMode] = useState<'random' | 'choose_first' | 'manual'>('random');
  const [firstPlayerId, setFirstPlayerId] = useState<string>("");
  const [manualOrder, setManualOrder] = useState<string[]>([]);

  const handleCreateRoom = () => {
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("playerName", playerName);
    const storedId = localStorage.getItem("playerId");
    socket.emit("createRoom", { roomId, name: playerName, playerId: storedId });
  };

  const handleJoinRoom = () => {
    localStorage.setItem("roomId", roomId);
    localStorage.setItem("playerName", playerName);
    const storedId = localStorage.getItem("playerId");
    socket.emit("joinRoom", { roomId, name: playerName, playerId: storedId });
  };

  const handleStartGame = () => {
    // モーダルで順番設定
    // 手動順序の初期値を現在のプレイヤー順に
    setManualOrder((players as any[]).map(p => p.id));
    setShowOrderModal(true);
  };

  const handleConfirmStart = () => {
    const payload: any = { roomId, orderMode };
    if (orderMode === 'choose_first' && firstPlayerId) {
      payload.firstPlayerId = firstPlayerId;
    }
    if (orderMode === 'manual') {
      payload.turnOrder = manualOrder;
    }
    socket.emit("startGame", payload);
    setShowOrderModal(false);
    setScreen("game");
  };

  const handleClearSession = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("roomId");
    localStorage.removeItem("playerName");
    setRoomId("");
    setPlayerName("");
  };

  useEffect(() => {
    socket.on("roomUpdate", (data) => {
      setPlayers(data.players);
      setGameMasterId(data.gameMasterId);
    });
    socket.on("playerId", (id) => {
      localStorage.setItem("playerId", id);
      setPlayerId(id);
    });
    socket.on("syncState", (data: any) => {
      if (data?.players) setPlayers(data.players);
      if (data?.gameMasterId) setGameMasterId(data.gameMasterId);
    });
    socket.on("rejoinSuccess", () => {
      setScreen("game");
    });
    const onLobbyGameStarted = () => {
      setScreen("game");
    };
    socket.on("gameStarted", onLobbyGameStarted);
    socket.on("errorMessage", (message) => {
      setErrorMessage(message);
    });

    return () => {
      socket.off("roomUpdate");
      socket.off("playerId");
      socket.off("syncState");
      socket.off("rejoinSuccess");
      socket.off("gameStarted", onLobbyGameStarted);
      socket.off("errorMessage");
    };
  }, [setScreen]);

  // リザルトから戻ってきたときに、自動で「ゲーム開始」モーダルを開く
  useEffect(() => {
    if (!autoOpenStartModal) return;
    // プレイヤー情報と自分がゲームマスターであることが分かってから実行
    if (players.length >= 2 && playerId && gameMasterId && playerId === gameMasterId) {
      setManualOrder((players as any[]).map(p => p.id));
      setShowOrderModal(true);
      onAutoStartHandled && onAutoStartHandled();
    }
  }, [autoOpenStartModal, players, playerId, gameMasterId, onAutoStartHandled]);

  // ロビー表示直後に現在の部屋状態を問い合わせる（再戦で戻ってきたときのため）
  useEffect(() => {
    if (roomId) {
      socket.emit("requestSync", { roomId });
    }
  }, [roomId]);

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-2xl mb-4">💌 Love Letter - ロビー</h1>
      {errorMessage && (
        <p className="text-red-500 font-bold mb-2">{errorMessage}</p>
      )}
      <label className="block mb-2">
        ニックネーム：
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="border rounded w-full p-2 mt-1"
        />
      </label>
      <label className="block mb-4">
        ルームID：
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border rounded w-full p-2 mt-1"
        />
      </label>
      <button
        onClick={handleCreateRoom}
        disabled={!playerName || !roomId}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        部屋を作る
      </button>
      <button
        onClick={handleJoinRoom}
        disabled={!playerName || !roomId}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        入室
      </button>
      <button
        onClick={handleClearSession}
        className="bg-red-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        セッションクリア
      </button>
      <button
        onClick={() => setScreen("howto")}
        className="bg-purple-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        ルール説明
      </button>
      {players.length >= 2 && playerId === gameMasterId ? (
        <button
          onClick={handleStartGame}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          ゲーム開始
        </button>
      ) : (
        <p>2人以上でゲーム開始できます</p>
      )}

      <div className="mt-4">
        <h3 className="text-md font-bold mb-2">現在の参加者</h3>
        <ul className="list-disc list-inside">
          {players.map((p, index) => (
            <li key={index}>{p.name}</li>
          ))}
        </ul>
      </div>

      {showOrderModal && (
        <div className="fixed z-30 left-0 top-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow max-w-md w-11/12">
            <h3 className="text-lg font-bold mb-2">ターン順の設定</h3>
            <div className="space-y-2 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="orderMode"
                  checked={orderMode === 'random'}
                  onChange={() => setOrderMode('random')}
                />
                完全ランダム
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="orderMode"
                  checked={orderMode === 'choose_first'}
                  onChange={() => setOrderMode('choose_first')}
                />
                先頭のプレイヤーを選択（2番目以降はランダム）
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="orderMode"
                  checked={orderMode === 'manual'}
                  onChange={() => setOrderMode('manual')}
                />
                完全マニュアル（全員の順番を指定）
              </label>
            </div>
            {orderMode === 'choose_first' && (
              <div className="mb-3">
                <label className="block mb-1">先頭のプレイヤー</label>
                <select
                  className="border rounded w-full p-2"
                  value={firstPlayerId}
                  onChange={(e) => setFirstPlayerId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {players.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {orderMode === 'manual' && (
              <div className="mb-3 space-y-2">
                {(players as any[]).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-20 shrink-0">{idx + 1}番手</span>
                    <select
                      className="border rounded w-full p-2"
                      value={manualOrder[idx] || ''}
                      onChange={(e) => {
                        const next = [...manualOrder];
                        next[idx] = e.target.value;
                        setManualOrder(next);
                      }}
                    >
                      <option value="">選択してください</option>
                      {(players as any[]).map((p) => (
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
                onClick={() => setShowOrderModal(false)}
                className="px-3 py-2 rounded text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmStart}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={(orderMode === 'choose_first' && !firstPlayerId) || (orderMode === 'manual' && (!manualOrder.length || new Set(manualOrder).size !== (players as any[]).length || manualOrder.some(v => !v)))}
              >
                開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
