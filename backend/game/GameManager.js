// backend/game/GameManager.js

const CARD_LIST = require("./cards");
const effects = require("./effects");

class GameManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = {}; // { socketId: { name, hand, isEliminated } }
    this.deck = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.playedCards = [];
    this.gameStarted = false;
    this.gameMasterId = null;
    this.removedCard = null; // ゲーム開始時に除外したカード
  }

  emitToRoom(io, event, data) {
    if (io) io.to(this.roomId).emit(event, data);
  }

  emitToPlayer(io, playerId, event, data) {
    if (io) io.to(playerId).emit(event, data);
  }

  getAlivePlayers() {
    return Object.values(this.players).filter((p) => !p.isEliminated);
  }


  addPlayer(socketId, name) {
    if (Object.keys(this.players).length >= 5) return false;
    this.players[socketId] = {
      id: socketId,
      name,
      hand: [],
      isEliminated: false,
      isProtected: false,
      hasDrawnCard: false,
    };
    this.turnOrder.push(socketId);
    return true;
  }

  startGame() {
    this.createDeck();
    // 1枚除外（最終表示用に保持）
    this.removedCard = this.deck.pop();
    // 各プレイヤーに1枚配る
    Object.keys(this.players).forEach(socketId => {
      this.players[socketId].hand = [];
      this.players[socketId].isEliminated = false;
      this.players[socketId].isProtected = false;
      this.players[socketId].hasDrawnCard = false;
      const card = this.deck.pop();
      this.players[socketId].hand.push(card);
    });
    this.gameStarted = true;
  }


  createDeck() {
    this.deck = [];
    CARD_LIST.forEach(card => {
      for (let i = 0; i < card.count; i++) {
        this.deck.push({
          id: card.id,
          name: card.name,
          enName: card.enName,
          cost: card.cost,
        });
      }
    });
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  getCurrentPlayerId() {
    // 脱落しているプレイヤーをスキップ
    while (this.players[this.turnOrder[this.currentTurn % this.turnOrder.length]].isEliminated) {
      this.currentTurn++;
    }
    return this.turnOrder[this.currentTurn % this.turnOrder.length];
  }

  drawCard(playerId, io) {
    const player = this.players[playerId];
    if (!player || player.isEliminated) return null;

    // すでに2枚持っていたら引けない
    if (player.hand.length >= 2) {
      console.log(`${player.name} はすでにカードを2枚持っています。`);
      return null;
    }

    // 山札がない場合
    if (!this.deck.length) {
      console.log(`山札がありません。`);
      this.handleCountessElimination(io);
      return null;
    }

    const card = this.deck.pop();
    player.hand.push(card);
    player.hasDrawnCard = true;
    if (this.deck.length === 0) {
      this.handleCountessElimination(io);
    }
    return card;
  }

  playCard(playerId, cardIndex, targetPlayerId, guessCardId, io) {
    const player = this.players[playerId];
    // debug
    if (!player) {
      console.log(`playerId: ${playerId} のプレイヤーが見つかりません。`);
      return null;
    }
    // カードを引いたかどうかチェック、引いていない場合はカードを出させない
    if (!player.hasDrawnCard) {
      console.log(`${player.name} はまだカードを引いていないため出せません。`);
      return null;
    }
    // 
    if (!player.hand || player.hand.length <= cardIndex) return null;

    const selectedCard = player.hand[cardIndex];
    const totalCost = player.hand.reduce((sum, c) => sum + c.cost, 0);
    const hasMarchioness = player.hand.some((c) => c.id === 11);
    if (hasMarchioness && totalCost >= 12 && selectedCard.id !== 11) {
      console.log(
        `${player.name} は手札の合計コストが12以上のため女侯爵を出さなければなりません。`
      );
      this.emitToPlayer(
        io,
        playerId,
        "errorMessage",
        "手札のコスト合計が12以上のため、女侯爵を出さなければなりません。"
      );
      return null;
    }
    if (selectedCard.id === 10) {
      console.log(`${player.name} は伯爵夫人を出すことはできません。`);
      this.emitToPlayer(io, playerId, "errorMessage", "伯爵夫人は場に出せません。");
      return null;
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    if (!card) return null;

    this.playedCards.push({
      player: this.players[playerId].name,
      card: card,
    });

    // カード効果処理
    switch (card.id) {
      case 1: // 兵士（soldier）
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          this.players[targetPlayerId].isProtected
        ) {
          console.log(`${this.players[targetPlayerId].name} は僧侶の効果で守られています。`);
          // 宣言情報を通知（保護により無効）
          try {
            const guessInfo = CARD_LIST.find((c) => c.id === guessCardId);
            this.emitToRoom(io, "soldierPlayed", {
              playerId,
              playerName: this.players[playerId]?.name,
              targetPlayerId,
              targetName: this.players[targetPlayerId]?.name,
              guessCardId,
              guessCardName: guessInfo ? guessInfo.name : "不明",
              hit: false,
              protected: true,
            });
          } catch (_) {}
          break;
        }
        if (
          guessCardId &&
          targetPlayerId &&
          this.players[targetPlayerId] &&
          !this.players[targetPlayerId].isEliminated &&
          !this.players[targetPlayerId].isProtected
        ) {
          const targetHand = this.players[targetPlayerId].hand[0];
          const hit = targetHand.id === guessCardId;
          if (hit) {
              this.players[targetPlayerId].isEliminated = true;
              console.log(
                `${this.players[targetPlayerId].name} は脱落しました！（兵士の効果）`
              );
              const revived = this.checkPrincessGlassesRevival(targetPlayerId, io);
              if (!revived) {
                this.emitToRoom(io, "playerEliminated", {
                  playerId: targetPlayerId,
                  name: this.players[targetPlayerId].name,
                });
                const alive = this.getAlivePlayers();
                if (alive.length === 1) {
                  this.endGame(io, alive[0].name);
                }
              }
          } else {
            console.log(`${this.players[targetPlayerId].name} はセーフでした。`);
          }
          try {
            const guessInfo = CARD_LIST.find((c) => c.id === guessCardId);
            this.emitToRoom(io, "soldierPlayed", {
              playerId,
              playerName: this.players[playerId]?.name,
              targetPlayerId,
              targetName: this.players[targetPlayerId]?.name,
              guessCardId,
              guessCardName: guessInfo ? guessInfo.name : "不明",
              hit,
              protected: false,
              actualCardId: hit ? targetHand.id : undefined,
              actualCardName: hit ? targetHand.name : undefined,
            });
          } catch (_) {}
        }
        break;
      case 2: // 道化（clown）
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          this.players[targetPlayerId].isProtected
        ) {
          console.log(`${this.players[targetPlayerId].name} は僧侶の効果で守られています。`);
          break;
        }
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          !this.players[targetPlayerId].isEliminated &&
          !this.players[targetPlayerId].isProtected
        ) {
          const targetHand = this.players[targetPlayerId].hand[0];
          // io経由で直接プレイヤーに送る。playerIdはsocket.id
            console.log(
              `[seeHand emit] to ${playerId} :`,
              this.players[targetPlayerId].name,
              targetHand
            );
            this.emitToPlayer(io, playerId, "seeHand", {
              targetName: this.players[targetPlayerId].name,
              card: targetHand,
            });
        }
        break;
      case 3: // 騎士（knight）
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          this.players[targetPlayerId].isProtected
        ) {
          console.log(`${this.players[targetPlayerId].name} は僧侶の効果で守られています。`);
          break;
        }
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          !this.players[targetPlayerId].isEliminated &&
          !this.players[targetPlayerId].isProtected
        ) {
          const myCard = player.hand[0];
          const targetCard = this.players[targetPlayerId].hand[0];
          if (myCard && targetCard) {
            const myCost = myCard.cost;
            const targetCost = targetCard.cost;
            if (myCost === targetCost) {
              console.log("騎士の効果: 引き分けでした。");
            } else if (myCost < targetCost) {
              player.isEliminated = true;
              console.log(`${player.name} は脱落しました！（騎士の効果）`);
              const revived = this.checkPrincessGlassesRevival(playerId, io);
              if (!revived) {
                this.emitToRoom(io, "playerEliminated", {
                  playerId: playerId,
                  name: player.name,
                });
              }
            } else {
              this.players[targetPlayerId].isEliminated = true;
              console.log(`${this.players[targetPlayerId].name} は脱落しました！（騎士の効果）`);
              const revived = this.checkPrincessGlassesRevival(targetPlayerId, io);
              if (!revived) {
                this.emitToRoom(io, "playerEliminated", {
                  playerId: targetPlayerId,
                  name: this.players[targetPlayerId].name,
                });
              }
            }

              const alive = this.getAlivePlayers();
              if (alive.length === 1) {
                this.endGame(io, alive[0].name);
              }
          }
        }
        break;
      case 4: // 僧侶（monk）
        player.isProtected = true;
        break;
      case 5: // 魔術師（sorcerer）
        {
          const targetId = targetPlayerId || playerId;
          if (
            targetId &&
            this.players[targetId] &&
            this.players[targetId].isProtected
          ) {
            console.log(`${this.players[targetId].name} は僧侶の効果で守られています。`);
            break;
          }
          if (
            targetId &&
            this.players[targetId] &&
            !this.players[targetId].isEliminated &&
            !this.players[targetId].isProtected
          ) {
            const targetHand = this.players[targetId].hand;
            if (targetHand.length && targetHand[0].id === 10) {
              console.log(
                `${this.players[targetId].name} の伯爵夫人は魔術師の効果で捨てられません。`
              );
              break;
            }
              const discarded = this.players[targetId].hand.splice(0, 1)[0];
              if (discarded) {
                this.playedCards.push({
                  player: this.players[targetId].name,
                  card: discarded,
                });
                this.checkPrincessElimination(targetId, discarded, io);
              }
              if (this.deck.length) {
                const newCard = this.deck.pop();
                this.players[targetId].hand = [newCard];
                this.emitToPlayer(io, targetId, "replaceCard", newCard);
                this.checkMinisterElimination(targetId, io);
                if (this.deck.length === 0) {
                  this.handleCountessElimination(io);
                }
              }
          }
        }
        break;
      case 6: // 将軍（general）
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          this.players[targetPlayerId].isProtected
        ) {
          console.log(`${this.players[targetPlayerId].name} は僧侶の効果で守られています。`);
          break;
        }
        if (
          targetPlayerId &&
          this.players[targetPlayerId] &&
          !this.players[targetPlayerId].isEliminated &&
          !this.players[targetPlayerId].isProtected
        ) {
          const myHand = [...player.hand];
          const targetHand = [...this.players[targetPlayerId].hand];
          player.hand = targetHand;
          this.players[targetPlayerId].hand = myHand;
            if (player.hand[0]) {
              this.emitToPlayer(io, playerId, "replaceCard", player.hand[0]);
            }
            if (this.players[targetPlayerId].hand[0]) {
              this.emitToPlayer(
                io,
                targetPlayerId,
                "replaceCard",
                this.players[targetPlayerId].hand[0]
              );
            }
          this.checkMinisterElimination(playerId, io);
          this.checkMinisterElimination(targetPlayerId, io);
        }
        break;
      case 8: // 姫（princess）
        this.checkPrincessElimination(playerId, card, io);
        break;
      case 9: // 姫(眼鏡)
        // 特殊効果は脱落時に処理されるため、出したときの効果はなし
        break;
      case 10: // 伯爵夫人（countess）
        // このカードは場に出せないため効果なし
        break;
      case 11: // 女侯爵（marchioness）
        // 強制的に出す以外の効果はなし
        break;
      case 12: // 姫(爆弾)
        player.isEliminated = true;
        this.emitToRoom(io, "playerEliminated", {
          playerId: playerId,
          name: player.name,
        });
        const alive = this.getAlivePlayers();
        if (alive.length <= 1) {
          const winner = alive.length === 1 ? alive[0].name : "引き分け";
          this.endGame(io, winner);
        } else {
          this.determineWinnerByHandCost(io);
        }
        break;
      // TODO: 他のカード（道化、騎士、僧侶、魔術師、将軍、大臣、姫）の処理を追加
      default:
        console.log(`カードID ${card.id} の効果はまだ実装されていません。`);
    }
    player.hasDrawnCard = false; // カードを出したらフラグリセット
    return card;
  }

  nextTurn() {
    this.currentTurn++;
    const nextPlayerId = this.getCurrentPlayerId();
    if (this.players[nextPlayerId]) {
      this.players[nextPlayerId].isProtected = false;
    }
  }

  endGame(io, winner) {
    const finalHands = Object.values(this.players).map((p) => ({
      id: p.id,
      name: p.name,
      hand: p.hand,
      isEliminated: p.isEliminated,
    }));
    this.emitToRoom(io, "gameEnded", {
      winner,
      finalHands,
      playedCards: this.playedCards,
      removedCard: this.removedCard,
    });
  }
}

Object.assign(GameManager.prototype, effects);

module.exports = GameManager;
module.exports.CARD_LIST = CARD_LIST;
