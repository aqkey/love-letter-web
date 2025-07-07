const assert = require('assert');
const GameManager = require('./game/GameManager');

function testCountessUnplayable() {
  const gm = new GameManager('r1');
  gm.players = {
    A: { id: 'A', name: 'A', hand: [ { id: 10, name: '伯爵夫人', enName: 'countess', cost: 8 } ], isEliminated: false, isProtected: false, hasDrawnCard: true }
  };
  gm.turnOrder = ['A'];

  const result = gm.playCard('A', 0, null, null, null);
  assert.strictEqual(result, null, 'Countess should not be playable');
  assert.strictEqual(gm.players['A'].hand.length, 1, 'Countess remains in hand');
}

function testCountessEliminatedWhenDeckEmpty() {
  const gm = new GameManager('r2');
  gm.players = {
    A: { id: 'A', name: 'A', hand: [ { id: 10, name: '伯爵夫人', enName: 'countess', cost: 8 } ], isEliminated: false, isProtected: false, hasDrawnCard: false },
    B: { id: 'B', name: 'B', hand: [ { id: 1, name: '兵士', enName: 'soldier', cost: 1 } ], isEliminated: false, isProtected: false, hasDrawnCard: false }
  };
  gm.turnOrder = ['A','B'];
  gm.deck = [];

  gm.drawCard('A');
  assert.strictEqual(gm.players['A'].isEliminated, true, 'Player holding Countess should be eliminated when deck is empty');
}

function testCountessEliminatedAfterLastDraw() {
  const gm = new GameManager('r2b');
  gm.players = {
    A: { id: 'A', name: 'A', hand: [ { id: 10, name: '伯爵夫人', enName: 'countess', cost: 8 } ], isEliminated: false, isProtected: false, hasDrawnCard: false },
    B: { id: 'B', name: 'B', hand: [ { id: 1, name: '兵士', enName: 'soldier', cost: 1 } ], isEliminated: false, isProtected: false, hasDrawnCard: false }
  };
  gm.turnOrder = ['A','B'];
  gm.deck = [{ id: 1, name: '兵士', enName: 'soldier', cost: 1 }];

  gm.drawCard('A'); // draws the last card
  assert.strictEqual(gm.deck.length, 0, 'Deck should now be empty');
  assert.strictEqual(gm.players['A'].isEliminated, true, 'Player holding Countess should be eliminated after last card is drawn');
}

function testCountessInDeck() {
  const gm = new GameManager('r3');
  gm.createDeck();
  const countessCards = gm.deck.filter(c => c.id === 10);
  assert.strictEqual(countessCards.length, 1, 'Deck should contain one Countess');
}

testCountessUnplayable();
testCountessEliminatedWhenDeckEmpty();
testCountessEliminatedAfterLastDraw();
testCountessInDeck();
console.log('All tests passed!');
