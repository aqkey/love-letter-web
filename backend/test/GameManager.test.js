const test = require('node:test');
const assert = require('node:assert/strict');
const GameManager = require('../game/GameManager');

class MockIO {
  constructor() { this.events = []; }
  to(roomId) {
    return {
      emit: (event, data) => {
        this.events.push({ roomId, event, data });
      }
    };
  }
}

function createCard(id, name, cost) {
  return { id, name, cost };
}

function setupTwoPlayers() {
  const gm = new GameManager('room');
  gm.addPlayer('p1', 'Alice');
  gm.addPlayer('p2', 'Bob');
  gm.gameStarted = true;
  gm.turnOrder = ['p1','p2'];
  return gm;
}

// Soldier eliminates target when guessed correctly
test('soldier effect eliminates target player', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(1, '兵士', 1)];
  gm.players['p2'].hand = [createCard(3, '騎士', 3)];
  gm.players['p1'].hasDrawnCard = true;
  const io = new MockIO();
  gm.playCard('p1', 0, 'p2', 3, io);
  assert.equal(gm.players['p2'].isEliminated, true);
});

// Clown reveals opponent hand to player
test('clown effect reveals hand', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(2, '道化', 2)];
  gm.players['p2'].hand = [createCard(1, '兵士', 1)];
  gm.players['p1'].hasDrawnCard = true;
  const io = new MockIO();
  gm.playCard('p1', 0, 'p2', undefined, io);
  const event = io.events.find(e => e.event === 'seeHand');
  assert.ok(event, 'seeHand event should be emitted');
  assert.equal(event.data.card.id, 1);
});

// Knight compares costs and eliminates lower card holder
test('knight effect compares costs', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(3, '騎士', 3), createCard(6, '将軍', 6)];
  gm.players['p2'].hand = [createCard(2, '道化', 2)];
  gm.players['p1'].hasDrawnCard = true;
  const io = new MockIO();
  gm.playCard('p1', 0, 'p2', undefined, io);
  assert.equal(gm.players['p2'].isEliminated, true);
});

// Monk grants protection
test('monk effect protects the player', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(4, '僧侶', 4)];
  gm.players['p1'].hasDrawnCard = true;
  gm.playCard('p1', 0, undefined, undefined, new MockIO());
  assert.equal(gm.players['p1'].isProtected, true);
});

// Sorcerer forces target to discard and draw
test('sorcerer effect replaces target hand', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(5, '魔術師', 5)];
  gm.players['p2'].hand = [createCard(1, '兵士', 1)];
  gm.deck = [createCard(2, '道化', 2)];
  gm.players['p1'].hasDrawnCard = true;
  const io = new MockIO();
  gm.playCard('p1', 0, 'p2', undefined, io);
  assert.equal(gm.players['p2'].hand[0].id, 2);
});

// General swaps hands
test('general effect swaps hands', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(6, '将軍', 6)];
  gm.players['p2'].hand = [createCard(1, '兵士', 1)];
  gm.players['p1'].hasDrawnCard = true;
  gm.playCard('p1', 0, 'p2', undefined, new MockIO());
  assert.equal(gm.players['p1'].hand[0].id, 1);
  assert.equal(gm.players['p2'].hand.length, 0);
});

// Minister causes elimination when total cost >=12 after draw
test('minister effect eliminates on high total', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(7, '大臣', 7)];
  gm.deck = [createCard(8, '姫', 8)];
  const card = gm.drawCard('p1');
  gm.checkMinisterElimination('p1');
  assert.equal(gm.players['p1'].isEliminated, true);
  assert.equal(gm.players['p1'].hand.length, 0);
});

// Princess causes elimination when discarded
test('princess elimination when played', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(8, '姫', 8)];
  gm.players['p1'].hasDrawnCard = true;
  gm.playCard('p1', 0, undefined, undefined, new MockIO());
  assert.equal(gm.players['p1'].isEliminated, true);
});

// Princess glasses revives eliminated player
test('princess glasses revives player', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [createCard(9, '姫(眼鏡)', 8)];
  gm.players['p2'].hand = [createCard(1, '兵士', 1)];
  gm.deck = [createCard(2, '道化', 2)];
  gm.players['p2'].hasDrawnCard = true;
  gm.playCard('p2', 0, 'p1', 9, new MockIO());
  assert.equal(gm.players['p1'].isEliminated, false);
  assert.equal(gm.players['p1'].hand.length, 1);
  assert.equal(gm.players['p1'].hand[0].id, 2);
});

// Princess glasses and minister trigger revival with new card
test('minister and glasses combination draws a card to revive', () => {
  const gm = setupTwoPlayers();
  gm.players['p1'].hand = [
    createCard(7, '大臣', 7),
    createCard(9, '姫(眼鏡)', 8)
  ];
  gm.deck = [createCard(3, '騎士', 3)];
  gm.checkMinisterElimination('p1', new MockIO());
  assert.equal(gm.players['p1'].isEliminated, false);
  assert.equal(gm.players['p1'].hand.length, 1);
  assert.equal(gm.players['p1'].hand[0].id, 3);
});
