import React, { useEffect, useMemo, useRef, useState } from "react";
import { HowToContent } from "./HowTo";
import socket from "./socket";
import CutIn, { CutInItem } from "./components/CutIn";

interface GameProps {
  setScreen: (screen: "lobby" | "game" | "result") => void;
  roomId: string;
  playerName: string;
  setWinner: (name: string) => void;
  setFinalHands: (hands: { id: string; name: string; hand: Card[]; isEliminated?: boolean }[]) => void;
  setFinalEventLogs: (logs: string[]) => void;
  setFinalPlayedCards: (entries: PlayedCardEntry[]) => void;
  setFinalRemovedCard: (card: Card | null) => void;
  setGameMasterId: (id: string | null) => void;
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
  targetPlayerId?: string | null;
  targetName?: string | null;
  guessCardName?: string | null;
  byElimination?: boolean;
}

const Game: React.FC<GameProps> = ({
  setScreen,
  roomId,
  playerName,
  setWinner,
  setFinalHands,
  setFinalEventLogs,
  setFinalPlayedCards,
  setFinalRemovedCard,
  setGameMasterId,
}) => {
  const [hand, setHand] = useState<Card[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<string>("");
  const [playedCards, setPlayedCards] = useState<PlayedCardEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deckCount, setDeckCount] = useState<number>(0);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const eventLogsRef = useRef<string[]>([]);
  const eventLogBoxRef = useRef<HTMLDivElement | null>(null);
  // カード演出の最後の発火時刻、および終了予定時刻
  const lastCardEffectRef = useRef<number>(0);
  const cardEffectActiveUntilRef = useRef<number>(0);
  // 脱落演出の待機キューとタイマー
  const eliminationQueueRef = useRef<string[]>([]);
  const eliminationTimerRef = useRef<number | null>(null);
  const endTransitionTimerRef = useRef<number | null>(null);
  // カード系カットインの再生時間（CutIn.module.css と同期）
  const CUTIN_DURATION_MS = 2400; // CSS animation duration
  const MIN_WAIT_FOR_CARD_MS = 50; // 次のcardPlayed到着をわずかに待つ

  const scheduleEliminationEffects = () => {
    // 既存タイマーをクリア
    if (eliminationTimerRef.current) {
      clearTimeout(eliminationTimerRef.current);
      eliminationTimerRef.current = null;
    }
    if (eliminationQueueRef.current.length === 0) return;
    const now = Date.now();
    // カード演出が進行中ならその終了を待つ。無い場合も最小待機を入れて、直後に来るcardPlayedに追従できる猶予を作る。
    const readyAt = Math.max(cardEffectActiveUntilRef.current, now + MIN_WAIT_FOR_CARD_MS);
    const delay = Math.max(0, readyAt - now);
    eliminationTimerRef.current = window.setTimeout(() => {
      const name = eliminationQueueRef.current.shift();
      if (name) enqueueCutIn(`${name}\n   脱  落...`, undefined, 'danger');
      // まだ残っていれば次もスケジュール
      if (eliminationQueueRef.current.length > 0) {
        scheduleEliminationEffects();
      }
    }, delay) as unknown as number;
  };
  const [cutInQueue, setCutInQueue] = useState<CutInItem[]>([]);
  const enqueueCutIn = (
    title: string,
    imageSrc?: string,
    variant: CutInItem['variant'] = 'card'
  ) => {
    setCutInQueue((prev) => [
      ...prev,
      { id: Date.now() + Math.floor(Math.random() * 1000), title, imageSrc, variant },
    ]);
  };
  const handleCutInDone = (id: number) => {
    setCutInQueue((prev) => prev.filter((it) => it.id !== id));
  };
  useEffect(() => {
    eventLogsRef.current = eventLogs;
    // 新規ログ追加時に最新まで自動スクロール
    const box = eventLogBoxRef.current;
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }, [eventLogs]);

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
    { id: 12, name: "姫(爆弾)", enName: "princess_bomb", cost: 8 },
  ];

  // 手札を見るモーダル
  const [showSeeHandModal, setShowSeeHandModal] = useState(false);
  const [seeHandInfo, setSeeHandInfo] = useState<{ targetName: string; card: Card } | null>(null);
  // ルール説明モーダル
  const [showHowToModal, setShowHowToModal] = useState(false);

  useEffect(() => {
    console.log("【playersの中身一覧】");
    players.forEach((player, index) => {
    console.log(`index: ${index}`);
    Object.entries(player).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
      });
    });
    socket.emit("requestSync", { roomId });
    socket.on("syncState", (data) => {
      if (data.hand) setHand(data.hand);
      if (data.players)
        setPlayers(
          data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            isEliminated: p.isEliminated ?? false,
          }))
        );
      if (data.currentPlayer) setCurrentPlayer(data.currentPlayer);
      if (data.deckCount !== undefined) setDeckCount(data.deckCount);
      if (data.playedCards) setPlayedCards(data.playedCards);
      if ((data as any).gameMasterId) setGameMasterId((data as any).gameMasterId);
    });
    const onGameStarted = (data: any) => {
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
      setEventLogs((prev) => [
        ...prev,
        "ゲームが開始されました",
        "-------------",
        `${data.currentPlayer} さんのターンです`,
      ]);
    };
    socket.on("gameStarted", onGameStarted);

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
      if ((data as any).gameMasterId) {
        setGameMasterId((data as any).gameMasterId);
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
      // 兵士（id:1）専用エフェクト（脱落中の自動捨て札では表示しない）
      if (!data.byElimination && data.card.id === 1 && data.targetName && data.guessCardName) {
        setEventLogs((prev) => [
          ...prev,
          `${data.player} さんが 兵士 を出した`,
        ]);
        lastCardEffectRef.current = Date.now();
        cardEffectActiveUntilRef.current = lastCardEffectRef.current + CUTIN_DURATION_MS;
        enqueueCutIn(`${data.player}は兵士を使った\n\n「${data.targetName} は ${data.guessCardName} だ！！」`, `/cards/${data.card.enName}.svg`);
        // 新しいカード演出に合わせて、待機中の脱落演出を再スケジュール
        if (eliminationQueueRef.current.length) scheduleEliminationEffects();
      }
      // 対象付きログ（道化=2, 騎士=3, 魔術師=5, 将軍=6）
      else if ([2, 3, 5, 6].includes(data.card.id) && data.targetName) {
        const name = data.card.name; // 表示名をそのまま使用
        setEventLogs((prev) => [
          ...prev,
          `${data.player} が ${name} を ${data.targetName} に使いました`,
        ]);
        // エフェクト用テキスト: 「XXXは<カード名>を使った」\n↓\n<対象>
        if (!data.byElimination) {
          lastCardEffectRef.current = Date.now();
          cardEffectActiveUntilRef.current = lastCardEffectRef.current + CUTIN_DURATION_MS;
          enqueueCutIn(`${data.player}は${name}を使った\n↓\n${data.targetName}`, `/cards/${data.card.enName}.svg`);
          if (eliminationQueueRef.current.length) scheduleEliminationEffects();
        }
      } else {
        setEventLogs((prev) => [
          ...prev,
          `${data.player} さんが ${data.card.name} を出した`,
        ]);
        // エフェクト用テキスト: 「XXXは<カード名>を使った」
        if (!data.byElimination) {
          lastCardEffectRef.current = Date.now();
          cardEffectActiveUntilRef.current = lastCardEffectRef.current + CUTIN_DURATION_MS;
          enqueueCutIn(`「${data.player}は${data.card.name}を使った」`, `/cards/${data.card.enName}.svg`);
          if (eliminationQueueRef.current.length) scheduleEliminationEffects();
        }
      }
      if (data.playerId === socket.id) {
        setHand((prev) =>
          prev.filter((_, i) => i !== prev.findIndex((c) => c.id === data.card.id && c.name === data.card.name))
        );
      }
    });

    socket.on("nextTurn", (data) => {
      setCurrentPlayer(data.currentPlayer);
      setEventLogs((prev) => [
        ...prev,
        "-------------",
        `${data.currentPlayer} さんのターンです`,
      ]);
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
      // 脱落演出はカード演出の終了後に出すため、キューへ追加してスケジュール
      eliminationQueueRef.current.push(name);
      scheduleEliminationEffects();
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
      enqueueCutIn(`${name}\n復活`, undefined, 'success');
      setTimeout(() => setErrorMessage(""), 3000);
    });

    // 兵士の宣言結果（誰に何を宣言し、当たり/外れ）
    socket.on("soldierPlayed", (data: any) => {
      const { playerName, targetName, guessCardName, hit, protected: isProtected } = data || {};
      const msg = isProtected
        ? `${playerName} さんが 兵士 で ${targetName} さんの ${guessCardName} を宣言 → 僧侶で保護中`
        : hit
        ? `${playerName} さんが 兵士 で ${targetName} さんの ${guessCardName} を宣言 → 的中！`
        : `${playerName} さんが 兵士 で ${targetName} さんの ${guessCardName} を宣言 → ハズレ`;
      setEventLogs((prev) => [...prev, msg]);
    });

    // 僧侶保護により効果が無効化されたときの共通ログ
    socket.on("protectedByMonk", (data: any) => {
      const { targetName } = data || {};
      if (!targetName) return;
      setEventLogs((prev) => [
        ...prev,
        `${targetName} は僧侶の効果で守られました`,
      ]);
    });

    socket.on("gameEnded", ({ winner, finalHands, playedCards, removedCard }) => {
      setWinner(winner);
      // 結果画面用に手札とイベントログを保存
      if (finalHands) setFinalHands(finalHands);
      if (playedCards) setFinalPlayedCards(playedCards);
      setFinalRemovedCard(removedCard || null);
      // これまでの全ログをスナップショットして結果画面に渡す
      setFinalEventLogs([...eventLogsRef.current, `${winner} さんの勝利です`]);
      // 余韻のため、一定時間後にリザルトへ遷移
      const tid = window.setTimeout(() => setScreen("result"), 5000);
      // @ts-ignore
      endTransitionTimerRef.current = tid;
      setEventLogs((prev) => [...prev, `${winner} さんの勝利です`]);
    });

    socket.on("errorMessage", (message) => {
      setErrorMessage(message);
      setEventLogs((prev) => [...prev, message]);
      setTimeout(() => setErrorMessage(""), 3000);
    });

    return () => {
      socket.off("gameStarted", onGameStarted);
      socket.off("roomUpdate");
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
      socket.off("syncState");
      socket.off("soldierPlayed");
      socket.off("protectedByMonk");
      // 残っている脱落演出タイマーをクリア
      if (eliminationTimerRef.current) {
        clearTimeout(eliminationTimerRef.current);
        eliminationTimerRef.current = null;
      }
      // リザルト遷移タイマーのクリア
      if (endTransitionTimerRef.current) {
        clearTimeout(endTransitionTimerRef.current);
        endTransitionTimerRef.current = null;
      }
    };
  }, [roomId]);

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

  const selfPlayer = players.find((p) => p.name === playerName);
  const isSelfEliminated = Boolean(selfPlayer?.isEliminated);

  return (
    <div className="max-w-md mx-auto bg-amber-50/95 p-4 rounded-lg shadow-xl ring-1 ring-yellow-800/30">
      {/* セクション1: ルームIDとあなたの名前（ボックス＋一列表示） */}
      <div className="mb-4 border-2 border-yellow-700/40 bg-amber-100/60 rounded p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-md font-bold text-gray-900 break-all px-3 py-1">
            roomID：{roomId}
          </div>
          <div className="text-md font-bold text-gray-700">
            PlayerName：{playerName}
          </div>
        </div>
      </div>
      {/* ルール説明（小さなボタン） */}
      <div className="mb-2 -mt-2">
        <button
          onClick={() => setShowHowToModal(true)}
          className="text-xs text-purple-700 underline"
        >
          ルール説明
        </button>
      </div>

      {/* セクション2: （削除）ターン/山札残りの表示は場札セクションに統合 */}

      {errorMessage && (
        <p className="text-red-500 font-bold mb-2">{errorMessage}</p>
      )}


      {/* 待機メッセージは「カードを引く」ボタンの直下に移動しました */}

      {/* プレイヤー別の場札一覧（プレイ順で上から並べる） */}
      <div className="mt-4 rounded-lg p-3 bg-gradient-to-br from-stone-800 to-slate-900 text-amber-100 shadow-inner relative">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-bold">場に出たカード（プレイヤー別・プレイ順）</h3>
          <span className="text-sm opacity-90">山札残り枚数：{deckCount}</span>
        </div>
        {(() => {
          // プレイヤーごとの場札（各プレイヤー内の順はプレイ順）
          const playedByPlayer = new Map<string, Card[]>();
          playedCards.forEach((entry) => {
            const list = playedByPlayer.get(entry.player) || [];
            list.push(entry.card);
            playedByPlayer.set(entry.player, list);
          });
          const lastPlayed = playedCards.length ? playedCards[playedCards.length - 1] : null;
          // プレイ順にプレイヤー名を並べる（初登場順）。未プレイの人は後ろに追加
          const orderFromPlays: string[] = [];
          playedCards.forEach((entry) => {
            if (!orderFromPlays.includes(entry.player)) orderFromPlays.push(entry.player);
          });
          const allNames = players.map((p) => p.name);
          const remaining = allNames.filter((n) => !orderFromPlays.includes(n));
          const orderedNames = [...orderFromPlays, ...remaining];

          return (
            <ul className="space-y-2">
              {orderedNames.map((name) => {
                const p = players.find((pp) => pp.name === name);
                const isElim = Boolean(p?.isEliminated);
                const isCurrent = name === currentPlayer;
                const rowClass = `${isElim ? "opacity-50 grayscale" : ""} ${isCurrent ? "scale-[1.02]" : ""}`;
                const nameClass = `${isElim ? "text-gray-300" : ""} ${isCurrent ? "text-xl font-extrabold" : ""}`;
                return (
                  <li key={name} className={`flex items-center gap-3 ${rowClass}`}>
                    <span className={`w-4 text-center ${isCurrent ? 'text-yellow-300' : 'text-transparent'}`}>▶︎</span>
                    <span className={`w-24 shrink-0 ${nameClass}`}>
                      {name} {isElim ? "(脱落)" : ""}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const list = playedByPlayer.get(name) || [];
                        return list.map((card, idx) => {
                          const isLast = !!lastPlayed && name === lastPlayed.player && idx === list.length - 1;
                          const ringClass = isLast ? 'ring-2 ring-white' : 'ring-1 ring-yellow-200/40';
                          return (
                            <img
                              key={idx}
                              src={`/cards/${card.enName}.svg`}
                              alt={card.name}
                              className={`w-10 h-auto rounded ${ringClass} shadow`}
                            />
                          );
                        });
                      })()}
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        })()}
        {/* カードプレイ時のカットイン（このパネル上に重ねて表示） */}
        <CutIn queue={cutInQueue} onDone={handleCutInDone} />
      </div>

      {/* 自分の手札 */}
      <h3 className="text-md font-bold mt-4 mb-2 text-center">自分の手札</h3>
      <div className={`grid grid-cols-2 gap-2 mb-4 justify-items-center ${isSelfEliminated ? 'opacity-50 grayscale' : ''}`}>
        {hand.map((card, index) => {
          const disabled = isSelfEliminated || playerName !== currentPlayer || hand.length < 2;
          return (
            <button
              key={index}
              onClick={() => handlePlay(index)}
              disabled={disabled}
              className={`rounded overflow-hidden ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <img
                src={`/cards/${card.enName}.svg`}
                alt={card.name}
                className="w-full h-auto"
              />
            </button>
          );
        })}
      </div>
      {playerName === currentPlayer && (
        <button
          onClick={handleDraw}
          disabled={hand.length >= 2}
          className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded w-full"
        >
          カードを引く
        </button>
      )}

      {playerName !== currentPlayer && (
        <div className="mt-2 mb-2">
          <p className="text-center text-gray-800">相手のターンです。お待ちください...</p>
        </div>
      )}

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
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="guessCard"
                        value={c.id}
                        onChange={() => setGuessCardId(c.id)}
                        className="mr-1"
                      />
                      <img
                        src={`/cards/${c.enName}.svg`}
                        alt={c.name}
                        className="w-8 h-auto"
                      />
                      <span>{c.name}</span>
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
            <p className="mb-2">
              <span className="font-bold">{seeHandInfo.targetName}</span>
              さんの手札は
            </p>
            <img
              src={`/cards/${seeHandInfo.card.enName}.svg`}
              alt={seeHandInfo.card.name}
              className="w-32 h-auto mx-auto mb-2"
            />
            <p className="mb-4">
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

      {/* ルール説明モーダル（ゲーム中表示用） */}
      {showHowToModal && (
        <div className="fixed z-30 left-0 top-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white max-w-3xl w-11/12 max-h-[80vh] overflow-y-auto p-4 rounded shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">ルール説明</h3>
              <button
                onClick={() => setShowHowToModal(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                閉じる
              </button>
            </div>
            {/* 説明コンテンツ */}
            <HowToContent />
          </div>
        </div>
      )}
    
      <div className="mt-4 text-center">
        <h3 className="text-md font-bold mb-2">イベントログ</h3>
        <div
          ref={eventLogBoxRef}
          className="border rounded p-2 h-32 overflow-y-auto bg-amber-50 mx-auto max-w-md text-left"
        >
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
