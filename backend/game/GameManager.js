// backend/game/GameManager.js

const CARD_LIST = [
  { id: 1, name: "兵士", enName: "soldier", count: 5 },
  { id: 2, name: "道化", enName: "clown", count: 2 },
  { id: 3, name: "騎士", enName: "knight", count: 2 },
  { id: 4, name: "僧侶", enName: "monk", count: 2 },
  { id: 5, name: "魔術師", enName: "sorcerer", count: 2 },
  { id: 6, name: "将軍", enName: "general", count: 1 },
  { id: 7, name: "大臣", enName: "minister", count: 1 },
  { id: 8, name: "姫", enName: "princess", count: 1 },
];

class GameManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = {}; // { socketId: { name, hand, isEliminated } }
    this.deck = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.playedCards = [];
    this.gameStarted = false;
  }

  // Return true if the player is eliminated by the minister effect
  checkMinisterElimination(playerId, io) {
    const player = this.players[playerId];
    if (!player || player.isEliminated) return false;

    const hasMinister = player.hand.some((c) => c.id === 7);
    if (!hasMinister) return false;

    const total = player.hand.reduce((sum, c) => sum + c.id, 0);
    if (total > 12) {
      player.isEliminated = true;
      player.hasDrawnCard = false;
      console.log(`${player.name} は大臣の効果で脱落しました。`);
      if (io) {
        io.to(this.roomId).emit("playerEliminated", {
          playerId: playerId,
          name: player.name,
        });
      }

      const alive = Object.values(this.players).filter((p) => !p.isEliminated);
      if (alive.length === 1 && io) {
        io.to(this.roomId).emit("gameEnded", { winner: alive[0].name });
      }
      return true;
    }
    return false;
  }

  checkPrincessElimination(playerId, discardedCard, io) {
    const player = this.players[playerId];
    if (!player || player.isEliminated) return;

    if (discardedCard && discardedCard.id === 8) {
      player.isEliminated = true;
      console.log(`${player.name} は姫を捨てたため脱落しました。`);
      if (io) {
        io.to(this.roomId).emit("playerEliminated", {
          playerId: playerId,
          name: player.name,
        });
      }

      const alive = Object.values(this.players).filter((p) => !p.isEliminated);
      if (alive.length === 1 && io) {
        io.to(this.roomId).emit("gameEnded", { winner: alive[0].name });
      }
    }
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
    // 1枚除外
    this.deck.pop();
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
          enName: card.enName
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

  drawCard(playerId) {
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
      return null;
    }

    const card = this.deck.pop();
    player.hand.push(card);
    player.hasDrawnCard = true; 
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
          if (targetHand.id === guessCardId) {
            this.players[targetPlayerId].isEliminated = true;
            console.log(
              `${this.players[targetPlayerId].name} は脱落しました！（兵士の効果）`
            );
            io.to(this.roomId).emit("playerEliminated", {
              playerId: targetPlayerId,
              name: this.players[targetPlayerId].name,
            });
            const alive = Object.values(this.players).filter(
              (p) => !p.isEliminated
            );
            if (alive.length === 1) {
              io.to(this.roomId).emit("gameEnded", {
                winner: alive[0].name,
              });
            }
          } else {
            console.log(`${this.players[targetPlayerId].name} はセーフでした。`);
          }
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
          console.log(`[seeHand emit] to ${playerId} :`, this.players[targetPlayerId].name, targetHand);
          io.to(playerId).emit("seeHand", {
            targetName: this.players[targetPlayerId].name,
            card: targetHand,
          });
        }
        break;
      case 3: // 騎士（knight）Add commentMore actions
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
            if (myCard.id === targetCard.id) {
              console.log("騎士の効果: 引き分けでした。");
            } else if (myCard.id < targetCard.id) {
              player.isEliminated = true;
              console.log(`${player.name} は脱落しました！（騎士の効果）`);
              io.to(this.roomId).emit("playerEliminated", {
                playerId: playerId,
                name: player.name,
              });
            } else {
              this.players[targetPlayerId].isEliminated = true;
              console.log(`${this.players[targetPlayerId].name} は脱落しました！（騎士の効果）`);
              io.to(this.roomId).emit("playerEliminated", {
                playerId: targetPlayerId,
                name: this.players[targetPlayerId].name,
              });
            }

            const alive = Object.values(this.players).filter((p) => !p.isEliminated);
            if (alive.length === 1) {
              io.to(this.roomId).emit("gameEnded", {
                winner: alive[0].name,
              });
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
              io.to(targetId).emit("replaceCard", newCard);
              this.checkMinisterElimination(targetId, io);
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
            io.to(playerId).emit("replaceCard", player.hand[0]);
          }
          if (this.players[targetPlayerId].hand[0]) {
            io.to(targetPlayerId).emit(
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
}

module.exports = GameManager;
