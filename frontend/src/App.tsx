import React, { useState } from "react";
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

  const handleReturnToLobby = () => {
    localStorage.removeItem("playerId");
    localStorage.removeItem("roomId");
    localStorage.removeItem("playerName");
    setRoomId("");
    setPlayerName("");
    setScreen("lobby");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      {screen === "lobby" && (
        <Lobby
          setScreen={setScreen}
          roomId={roomId}
          setRoomId={setRoomId}
          playerName={playerName}
          setPlayerName={setPlayerName}
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
        </div>
      )}
    </div>
  );
};

export default App;
