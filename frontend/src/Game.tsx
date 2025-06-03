import React, { useEffect, useState } from "react";
import socket from "./socket";

interface GameProps {
  setScreen: (screen: "lobby" | "game" | "result") => void;
  roomId: string;
  playerName: string;
  setWinner: (name: string) => void;
}

interface Card {
  id: number;
  name: string;
}

interface PlayedCardEntry {
  player: string;
  card: Card;
}

const Game: React.FC<GameProps> = ({
  setScreen,
  roomId,
  playerName,
  setWinner,
}) => {
  const [hand, setHand] = useState<Card[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string>("");
  const [playedCards, setPlayedCards] = useState<PlayedCardEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    socket.on("gameStarted", (data) => {
      console.log("Game started:", data);
      setCurrentPlayer(data.currentPlayer);
    });

    socket.on("cardDrawn", (card) => {
      setHand((prev) => [...prev, card]);
    });

    socket.on("cardPlayed", (data) => {
      console.log(`${data.player} played ${data.card.name}`);
      setPlayedCards(data.playedCards);
    });

    socket.on("nextTurn", (data) => {
      setCurrentPlayer(data.currentPlayer);
    });

    socket.on("errorMessage", (message) => {
      console.error("Error:", message);
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("cardDrawn");
      socket.off("cardPlayed");
      socket.off("nextTurn");
      socket.off("errorMessage");
    };
  }, []);

  const handleDraw = () => {
    socket.emit("drawCard", { roomId });
  };

  const handlePlay = (index: number) => {
    socket.emit("playCard", { roomId, cardIndex: index });
    setHand((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h2 className="text-lg mb-2">ターン：{currentPlayer}</h2>

      {errorMessage && (
        <p className="text-red-500 font-bold mb-2">{errorMessage}</p>
      )}

      {playerName === currentPlayer ? (
        <button
          onClick={handleDraw}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-2 w-full"
        >
          カードを引く
        </button>
      ) : (
        <p className="mb-4">相手のターンです。お待ちください...</p>
      )}

      {/* 手札は常に表示 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {hand.map((card, index) => (
          <button
            key={index}
            onClick={() => handlePlay(index)}
            disabled={playerName !== currentPlayer}
            className={`bg-pink-500 text-white px-4 py-2 rounded ${
              playerName !== currentPlayer
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {card.name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-md font-bold mb-2">場に出たカード履歴</h3>
        <ul className="list-disc list-inside">
          {playedCards.map((entry, index) => (
            <li key={index}>
              {entry.player} さん: {entry.card.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Game;
