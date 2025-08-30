import React, { useState } from "react";
import Lobby from "./Lobby";
import Game from "./Game";

const App: React.FC = () => {
  const [screen, setScreen] = useState<"lobby" | "game" | "result">("lobby");
  const [roomId, setRoomId] = useState<string>(() => localStorage.getItem("roomId") || "");
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem("playerName") || "");
  const [winner, setWinner] = useState<string>("");

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
        />
      )}
      {screen === "result" && (
        <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
          {winner === "引き分け" ? (
            <h1 className="text-2xl mb-4">引き分けでした！</h1>
          ) : (
            <h1 className="text-2xl mb-4">勝者: {winner} さん！</h1>
          )}
          <button
            onClick={() => setScreen("lobby")}
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
