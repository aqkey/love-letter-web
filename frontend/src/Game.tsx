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
  enName: string;
}

interface PlayedCardEntry {
  player: string;
  card: Card;
}

interface PlayerInfo {
  name: string;
  id: string;
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

  // プレイヤーリスト（ターゲット選択用）
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  // 道化カードのターゲット選択
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectCardIndex, setSelectCardIndex] = useState<number | null>(null);

  // 手札を見るモーダル
  const [showSeeHandModal, setShowSeeHandModal] = useState(false);
  const [seeHandInfo, setSeeHandInfo] = useState<{ targetName: string; card: Card } | null>(null);

  useEffect(() => {
    console.log("【playersの中身一覧】");
    players.forEach((player, index) => {
    console.log(`index: ${index}`);
    Object.entries(player).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
      });
    });
    socket.on("gameStarted", (data) => {
      setCurrentPlayer(data.currentPlayer);
      if (data.players && data.players.length > 0) {
        console.log("gameStarted players:", data.players);
        setPlayers(data.players);
      }
    });

    socket.on("roomUpdate", (data) => {
      console.log("roomUpdate players:", data.players);
      if (data.players) setPlayers(data.players);
    });

    socket.on("initialHand", (hand) => {
      setHand(hand);
    });

    socket.on("cardDrawn", (card) => {
      setHand((prev) => [...prev, card]);
    });

    socket.on("cardPlayed", (data) => {
      if (!data || !data.card) return;
      setPlayedCards(data.playedCards);
      setHand((prev) =>
        prev.filter((_, i) => i !== prev.findIndex((c) => c.id === data.card.id && c.name === data.card.name))
      );
    });

    socket.on("nextTurn", (data) => {
      setCurrentPlayer(data.currentPlayer);
    });

    // 手札を見る（道化の効果）モーダル表示
    socket.on("seeHand", ({ targetName, card }) => {
      console.log("seeHand event受信", targetName, card);
      setSeeHandInfo({ targetName, card });
      setShowSeeHandModal(true);
    });

    socket.on("errorMessage", (message) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("roomUpdate");
      socket.off("initialHand");
      socket.off("cardDrawn");
      socket.off("cardPlayed");
      socket.off("nextTurn");
      socket.off("seeHand");
      socket.off("errorMessage");
    };
  }, []);

  const handleDraw = () => {
    socket.emit("drawCard", { roomId });
  };

  // カードを出す
  const handlePlay = (index: number) => {
    const card = hand[index];
    if (card.id === 2) {
      console.log('ターゲット選択モーダルを出す');
      otherPlayers.forEach((p) => {
        console.log(`プレイヤー名: ${p.name}, id: ${p.id}`);
      });
      // 道化カードの場合のみターゲット選択UI表示
      
      setSelectCardIndex(index);
      setShowTargetModal(true);
      
      return;
    }
    socket.emit("playCard", {
      roomId,
      cardIndex: index,
      targetPlayerId: null,
      guessCardId: null,
    });
  };

  // ターゲット決定（道化のとき）
  const handleSelectTarget = (targetId: string) => {
    console.log("選択されたプレイヤーID:", targetId);  
    if (selectCardIndex === null) return;
    socket.emit("playCard", {
      roomId,
      cardIndex: selectCardIndex,
      targetPlayerId: targetId,
      guessCardId: null,
    });
    setShowTargetModal(false);
    setSelectCardIndex(null);
  };

  // 自分以外のプレイヤー
  const otherPlayers = players.filter((p) => p.name !== playerName);

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <h2 className="text-lg mb-2">ターン：{currentPlayer}</h2>

      {errorMessage && (
        <p className="text-red-500 font-bold mb-2">{errorMessage}</p>
      )}

      {playerName === currentPlayer ? (
        <button
          onClick={handleDraw}
          disabled={hand.length >= 2}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-2 w-full"
        >
          カードを引く
        </button>
      ) : (
        <p className="mb-4">相手のターンです。お待ちください...</p>
      )}

      {/* 手札表示 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {hand.map((card, index) => (
          <button
            key={index}
            onClick={() => handlePlay(index)}
            disabled={playerName !== currentPlayer || hand.length < 2}
            className={`bg-pink-500 text-white px-4 py-2 rounded ${
              playerName !== currentPlayer || hand.length < 2
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {card.name}
          </button>
        ))}
      </div>

      {/* ターゲット選択モーダル（道化用） */}
      {showTargetModal && (
        <div className="fixed z-10 left-0 top-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="mb-2">見る相手を選んでください</h3>
            <ul>
              {otherPlayers.map((p) => (
                <li key={p.id} className="mb-2">
                  <button
                    onClick={() => handleSelectTarget(p.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowTargetModal(false)}
              className="text-gray-600 mt-2"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 手札を見るモーダル（道化の効果） */}
      {showSeeHandModal && seeHandInfo && (
        <div className="fixed z-20 left-0 top-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow text-center">
            <h3 className="mb-4 text-lg font-bold">手札を見る</h3>
            <p className="mb-4">
              <span className="font-bold">{seeHandInfo.targetName}</span>
              さんの手札は
              <span className="text-pink-500 font-bold">「{seeHandInfo.card.name}」</span>
              です
            </p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setShowSeeHandModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

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
