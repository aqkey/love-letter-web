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
  cost: number;
}

interface PlayedCardEntry {
  player: string;
  card: Card;
}

interface PlayerInfo {
  name: string;
  id: string;
  isEliminated?: boolean;
}

interface CardPlayedData {
  playerId: string;
  player: string;
  card: Card;
  playedCards: PlayedCardEntry[];
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
  const [deckCount, setDeckCount] = useState<number>(0);
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  // プレイヤーリスト（ターゲット選択用）
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  // 道化カードのターゲット選択
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectCardIndex, setSelectCardIndex] = useState<number | null>(null);

  // 兵士カード用
  const [showSoldierModal, setShowSoldierModal] = useState(false);
  const [soldierTargetId, setSoldierTargetId] = useState<string>("");
  const [guessCardId, setGuessCardId] = useState<number | null>(null);

  // 魔術師カード用
  const [showSorcererModal, setShowSorcererModal] = useState(false);
  const [sorcererTargetId, setSorcererTargetId] = useState<string>("");

  const CARD_OPTIONS: Card[] = [
    // 兵士では宣言できないため除外
    { id: 2, name: "道化", enName: "clown", cost: 1 },
    { id: 3, name: "騎士", enName: "knight", cost: 2 },
    { id: 4, name: "僧侶", enName: "monk", cost: 3 },
    { id: 5, name: "魔術師", enName: "sorcerer", cost: 4 },
    { id: 6, name: "将軍", enName: "general", cost: 5 },
    { id: 7, name: "大臣", enName: "minister", cost: 6 },
    { id: 8, name: "姫", enName: "princess", cost: 7 },
    { id: 9, name: "姫(眼鏡)", enName: "princess_glasses", cost: 8 },
    { id: 10, name: "伯爵夫人", enName: "countess", cost: 8 },
    { id: 11, name: "女侯爵", enName: "marchioness", cost: 7 },
    { id: 11, name: "姫(爆弾)", enName: "princess_bomb", cost: 8 },
  ];

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
      if (data.deckCount !== undefined) {
        setDeckCount(data.deckCount);
      }
      if (data.players && data.players.length > 0) {
        console.log("gameStarted players:", data.players);
        setPlayers(
          data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            isEliminated: p.isEliminated ?? false,
          }))
        );
      }
      setEventLogs((prev) => [...prev, "ゲームが開始されました"]);
    });

    socket.on("roomUpdate", (data) => {
      console.log("roomUpdate players:", data.players);
      if (data.players)
        setPlayers(
          data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            isEliminated: p.isEliminated ?? false,
          }))
        );
    });

    socket.on("rejoinSuccess", (data) => {
      setHand(data.hand || []);
      setPlayedCards(data.playedCards || []);
      setCurrentPlayer(data.currentPlayer || "");
      if (data.players && data.players.length > 0) {
        setPlayers(
          data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            isEliminated: p.isEliminated ?? false,
          }))
        );
      }
      if (data.deckCount !== undefined) {
        setDeckCount(data.deckCount);
      }
    });

    socket.on("initialHand", (hand) => {
      setHand(hand);
    });

    socket.on("cardDrawn", (card) => {
      setHand((prev) => [...prev, card]);
    });

    socket.on("deckCount", ({ deckCount }) => {
      setDeckCount(deckCount);
    });

    socket.on("replaceCard", (card) => {
      setHand([card]);
    });

    socket.on("cardPlayed", (data: CardPlayedData) => {
      if (!data || !data.card) return;
      setPlayedCards(data.playedCards);
      setEventLogs((prev) => [
        ...prev,
        `${data.player} さんが ${data.card.name} を出しました`,
      ]);
      if (data.playerId === socket.id) {
        setHand((prev) =>
          prev.filter((_, i) => i !== prev.findIndex((c) => c.id === data.card.id && c.name === data.card.name))
        );
      }
    });

    socket.on("nextTurn", (data) => {
      setCurrentPlayer(data.currentPlayer);
      setEventLogs((prev) => [...prev, `${data.currentPlayer} さんのターンです`]);
    });

    // 手札を見る（道化の効果）モーダル表示
    socket.on("seeHand", ({ targetName, card }) => {
      console.log("seeHand event受信", targetName, card);
      setSeeHandInfo({ targetName, card });
      setShowSeeHandModal(true);
    });

    socket.on("playerEliminated", ({ playerId, name }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, isEliminated: true } : p
        )
      );
      setErrorMessage(`${name} さんが脱落しました`);
      setEventLogs((prev) => [...prev, `${name} さんが脱落しました`]);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    socket.on("playerRevived", ({ playerId, name }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, isEliminated: false } : p
        )
      );
      setErrorMessage(`${name} さんが復活しました`);
      setEventLogs((prev) => [...prev, `${name} さんが復活しました`]);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    socket.on("gameEnded", ({ winner }) => {
      setWinner(winner);
      setScreen("result");
      setEventLogs((prev) => [...prev, `${winner} さんの勝利です`]);
    });

    socket.on("errorMessage", (message) => {
      setErrorMessage(message);
      setEventLogs((prev) => [...prev, message]);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    return () => {
      socket.off("gameStarted");
      socket.off("roomUpdate");
      socket.off("rejoinSuccess");
      socket.off("initialHand");
      socket.off("cardDrawn");
      socket.off("replaceCard");
      socket.off("cardPlayed");
      socket.off("nextTurn");
      socket.off("seeHand");
      socket.off("deckCount");
      socket.off("playerEliminated");
      socket.off("playerRevived");
      socket.off("gameEnded");
      socket.off("errorMessage");
    };
  }, []);

  const handleDraw = () => {
    socket.emit("drawCard", { roomId });
  };

  // カードを出す
  const handlePlay = (index: number) => {
    const card = hand[index];
    if (card.id === 2 || card.id === 3 || card.id === 6) {
      // 道化・騎士・将軍カードはターゲット選択のみ
      setSelectCardIndex(index);
      setShowTargetModal(true);
      return;
    }
    if (card.id === 1) {
      // 兵士カードはターゲットと宣言するカードを選ぶ
      setSelectCardIndex(index);
      setShowSoldierModal(true);
      setSoldierTargetId("");
      setGuessCardId(null);
      return;
    }
    if (card.id === 5) {
      setSelectCardIndex(index);
      setShowSorcererModal(true);
      setSorcererTargetId("");
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

  // 兵士使用時の決定
  const handlePlaySoldier = () => {
    if (selectCardIndex === null || !soldierTargetId || guessCardId === null) return;
    socket.emit("playCard", {
      roomId,
      cardIndex: selectCardIndex,
      targetPlayerId: soldierTargetId,
      guessCardId: guessCardId,
    });
    setShowSoldierModal(false);
    setSelectCardIndex(null);
    setSoldierTargetId("");
    setGuessCardId(null);
  };

  const handlePlaySorcerer = () => {
    if (selectCardIndex === null || !sorcererTargetId) return;
    socket.emit("playCard", {
      roomId,
      cardIndex: selectCardIndex,
      targetPlayerId: sorcererTargetId,
      guessCardId: null,
    });
    setShowSorcererModal(false);
    setSelectCardIndex(null);
    setSorcererTargetId("");
  };

  // 自分以外で脱落していないプレイヤー
  const otherPlayers = players.filter(
    (p) => p.name !== playerName && !p.isEliminated
  );
  const alivePlayers = players.filter((p) => !p.isEliminated);

  return (
    <div className="max-w-md mx-auto bg-white p-4 rounded shadow">
      <p className="font-bold mb-2">あなたの名前：{playerName}</p>
      <h2 className="text-lg mb-2">ターン：{currentPlayer}</h2>
      <p className="mb-2">山札残り枚数：{deckCount}</p>

      <div className="mb-4">
        <h3 className="text-md font-bold mb-2">プレイヤー状態</h3>
        <ul className="list-disc list-inside">
          {players.map((p) => (
            <li
              key={p.id}
              className={p.isEliminated ? "line-through text-gray-500" : ""}
            >
              {p.name} {p.isEliminated ? "(脱落)" : ""}
            </li>
          ))}
        </ul>
      </div>

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

      {/* ターゲット選択モーダル（道化・騎士用） */}
      {showTargetModal && (
        <div className="fixed z-10 left-0 top-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="mb-2">相手を選んでください</h3>
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

      {/* 兵士カード用モーダル */}
      {showSoldierModal && (
        <div className="fixed z-10 left-0 top-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="mb-2">ターゲットと宣言するカードを選んでください</h3>
            <div className="mb-2">
              <p className="mb-1">相手</p>
              <ul>
                {otherPlayers.map((p) => (
                  <li key={p.id} className="mb-1">
                    <label>
                      <input
                        type="radio"
                        name="soldierTarget"
                        value={p.id}
                        onChange={() => setSoldierTargetId(p.id)}
                        className="mr-1"
                      />
                      {p.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-2">
              <p className="mb-1">宣言するカード</p>
              <ul>
                {CARD_OPTIONS.map((c) => (
                  <li key={c.id} className="mb-1">
                    <label>
                      <input
                        type="radio"
                        name="guessCard"
                        value={c.id}
                        onChange={() => setGuessCardId(c.id)}
                        className="mr-1"
                      />
                      {c.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handlePlaySoldier}
              disabled={!soldierTargetId || guessCardId === null}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
            >
              決定
            </button>
            <button
              onClick={() => setShowSoldierModal(false)}
              className="text-gray-600"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 魔術師カード用モーダル */}
      {showSorcererModal && (
        <div className="fixed z-10 left-0 top-0 w-full h-full bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="mb-2">対象プレイヤーを選んでください</h3>
            <ul>
              {alivePlayers.map((p) => (
                <li key={p.id} className="mb-1">
                  <label>
                    <input
                      type="radio"
                      name="sorcererTarget"
                      value={p.id}
                      onChange={() => setSorcererTargetId(p.id)}
                      className="mr-1"
                    />
                    {p.name}
                  </label>
                </li>
              ))}
            </ul>
            <button
              onClick={handlePlaySorcerer}
              disabled={!sorcererTargetId}
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
            >
              決定
            </button>
            <button
              onClick={() => setShowSorcererModal(false)}
              className="text-gray-600"
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
    
      <div className="mt-4">
        <h3 className="text-md font-bold mb-2">イベントログ</h3>
        <div className="border rounded p-2 h-32 overflow-y-auto bg-gray-50">
          {eventLogs.map((log, index) => (
            <p key={index} className="text-sm">
              {log}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Game;
