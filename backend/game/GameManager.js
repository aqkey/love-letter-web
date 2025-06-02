// backend/game/GameManager.js
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

  addPlayer(socketId, name) {
    if (Object.keys(this.players).length >= 5) return false;
    this.players[socketId] = {
      name,
      hand: [],
      isEliminated: false,
    };
    this.turnOrder.push(socketId);
    return true;
  }

  startGame() {
    this.deck = this.createDeck();
    this.shuffleDeck();
    // 配布
    for (const playerId of Object.keys(this.players)) {
      this.players[playerId].hand.push(this.deck.pop());
    }
    this.gameStarted = true;
  }

  createDeck() {
    // 最小限のカード（兵士1x5、僧侶x2、騎士x2、侍女x2、王子x2、王女x1）
    return [
      ...Array(5).fill({ id: 1, name: "兵士" }),
      ...Array(2).fill({ id: 2, name: "僧侶" }),
      ...Array(2).fill({ id: 3, name: "騎士" }),
      ...Array(2).fill({ id: 4, name: "侍女" }),
      ...Array(2).fill({ id: 5, name: "王子" }),
      { id: 8, name: "王女" },
    ];
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  getCurrentPlayerId() {
    return this.turnOrder[this.currentTurn % this.turnOrder.length];
  }

  drawCard(playerId) {
    if (this.deck.length === 0) return null;
    const card = this.deck.pop();
    this.players[playerId].hand.push(card);
    return card;
  }

  playCard(playerId, cardIndex) {
    const card = this.players[playerId].hand.splice(cardIndex, 1)[0];
    // 提示済みのcardの履歴に出したカードを追加する
    this.playedCards.push({
      player: this.players[playerId].name,
      card: card
    })
    // TODO: カードの効果を処理する（MVPではスキップでもOK）
    return card;
  }

  nextTurn() {
    this.currentTurn++;
  }
}

module.exports = GameManager;
