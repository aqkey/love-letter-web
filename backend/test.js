const assert = require('assert');
const GameManager = require('./game/GameManager');

function testCountessRule() {
  const gm = new GameManager('room1');
  gm.players = {
    A: { id: 'A', name: 'A', hand: [
      { id: 10, name: '伯爵夫人', enName: 'countess', cost: 7 },
      { id: 5, name: '魔術師', enName: 'sorcerer', cost: 5 }
    ], isEliminated: false, isProtected: false, hasDrawnCard: true },
    B: { id: 'B', name: 'B', hand: [
      { id: 1, name: '兵士', enName: 'soldier', cost: 1 }
    ], isEliminated: false, isProtected: false, hasDrawnCard: true }
  };
  gm.turnOrder = ['A', 'B'];

  let result = gm.playCard('A', 1, 'B', null, null);
  assert.strictEqual(result, null, 'Should not play sorcerer while holding Countess');
  assert.strictEqual(gm.players['A'].hand.length, 2, 'Hand should remain unchanged');

  result = gm.playCard('A', 0, 'B', null, null);
  assert(result && result.id === 10, 'Should play the Countess');
  assert.strictEqual(gm.players['A'].hand.length, 1, 'Countess should be discarded');
}

function testCountessInDeck() {
  const gm = new GameManager('room2');
  gm.createDeck();
  const countessCards = gm.deck.filter(c => c.id === 10);
  assert.strictEqual(countessCards.length, 1, 'Deck should contain one Countess');
}

testCountessRule();
testCountessInDeck();
console.log('All tests passed!');
