import React, { useState, useEffect } from "react";
import socket from "./socket";

interface LobbyProps {
  setScreen: (screen: "lobby" | "game" | "result") => void;
  roomId: string;
  setRoomId: (roomId: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({
  setScreen,
  roomId,
  setRoomId,
  playerName,
  setPlayerName,
}) => {
  const [players, setPlayers] = useState<{ name: string }[]>([]);

  const handleCreateRoom = () => {
    socket.emit("createRoom", { roomId, name: playerName });
    localStorage.setItem("playerId", socket.id);
  };

  const handleStartGame = () => {
    socket.emit("startGame", { roomId });
    setScreen("game");
  };

  useEffect(() => {
    socket.on("roomUpdate", (data) => {
      setPlayers(data.players);
    });

    return () => {
      socket.off("roomUpdate");
    };
  }, []);

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-2xl mb-4">💌 Love Letter - ロビー</h1>
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
        部屋を作る / 入室
      </button>
      {players.length >= 2 ? (
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
    </div>
  );
};

export default Lobby;
