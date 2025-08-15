function checkMinisterElimination(playerId, io) {
  const player = this.players[playerId];
  if (!player || player.isEliminated) return false;

  const ministerIndex = player.hand.findIndex((c) => c.id === 7);
  if (ministerIndex === -1) return false;

  const total = player.hand.reduce((sum, c) => sum + c.cost, 0);
  if (total >= 12) {
    player.isEliminated = true;
    player.hasDrawnCard = false;
    console.log(`${player.name} は大臣の効果で脱落しました。`);

    this.emitToRoom(io, "playerEliminated", {
      playerId: playerId,
      name: player.name,
    });

    // 大臣のカードを捨て札に移動
    const ministerCard = player.hand.splice(ministerIndex, 1)[0];
    this.playedCards.push({ player: player.name, card: ministerCard });
    this.emitToRoom(io, "cardPlayed", {
      playerId: playerId,
      player: player.name,
      card: ministerCard,
      playedCards: this.playedCards,
    });

    const revived = this.checkPrincessGlassesRevival(playerId, io);

    if (!revived) {
      // 脱落したままなら残りの手札も捨て札へ
      while (player.hand.length) {
        const discarded = player.hand.pop();
        this.playedCards.push({ player: player.name, card: discarded });
        this.emitToRoom(io, "cardPlayed", {
          playerId: playerId,
          player: player.name,
          card: discarded,
          playedCards: this.playedCards,
        });
      }

      const alive = this.getAlivePlayers();
      if (alive.length === 1) {
        this.emitToRoom(io, "gameEnded", { winner: alive[0].name });
      }
    }

    return true;
  }
  return false;
}

function checkPrincessElimination(playerId, discardedCard, io) {
  const player = this.players[playerId];
  if (!player || player.isEliminated) return;

  if (discardedCard && discardedCard.id === 8) {
    player.isEliminated = true;
    console.log(`${player.name} は姫を捨てたため脱落しました。`);
    const revived = this.checkPrincessGlassesRevival(playerId, io);
    if (!revived) {
      this.emitToRoom(io, "playerEliminated", {
        playerId: playerId,
        name: player.name,
      });
      const alive = this.getAlivePlayers();
      if (alive.length === 1) {
        this.emitToRoom(io, "gameEnded", { winner: alive[0].name });
      }
    }
  }
}

function checkPrincessGlassesRevival(playerId, io) {
  const player = this.players[playerId];
  if (!player || !player.isEliminated) return false;
  const cardIndex = player.hand.findIndex((c) => c.id === 9);
  if (cardIndex === -1) return false;
  if (!this.deck.length) return false;

  const discarded = player.hand.splice(cardIndex, 1)[0];
  this.playedCards.push({ player: player.name, card: discarded });
  this.emitToRoom(io, "cardPlayed", {
    playerId: playerId,
    player: player.name,
    card: discarded,
    playedCards: this.playedCards,
  });

  const newCard = this.deck.pop();

  player.hand.push(newCard);
  if (this.deck.length === 0) {
    this.handleCountessElimination(io);
  }
  player.isEliminated = false;

  console.log(`${player.name} は姫(眼鏡)の効果で復活しました。`);
  this.emitToPlayer(io, playerId, "cardDrawn", newCard);
  this.emitToRoom(io, "playerRevived", {
    playerId: playerId,
    name: player.name,
  });
  this.emitToRoom(io, "deckCount", { deckCount: this.deck.length });
  return true;
}

function handleCountessElimination(io) {
  Object.keys(this.players).forEach((pid) => {
    const p = this.players[pid];
    if (!p.isEliminated && p.hand.some((c) => c.id === 10)) {
      p.isEliminated = true;
      console.log(`${p.name} は伯爵夫人を持ったまま山札が尽きたため脱落しました。`);
      const revived = this.checkPrincessGlassesRevival(pid, io);
      if (!revived) {
        this.emitToRoom(io, "playerEliminated", { playerId: pid, name: p.name });
      }
    }
  });
  const alive = this.getAlivePlayers();
  if (alive.length === 1) {
    this.emitToRoom(io, "gameEnded", { winner: alive[0].name });
  } else {
    this.determineWinnerByHandCost(io);
  }
}

function determineWinnerByHandCost(io) {
  const alive = this.getAlivePlayers();
  if (alive.length === 0) return;

  const costs = alive.map((p) => {
    const maxCost = p.hand.reduce((max, c) => (c.cost > max ? c.cost : max), 0);
    return { name: p.name, cost: maxCost };
  });

  costs.sort((a, b) => b.cost - a.cost);
  const highest = costs[0].cost;
  const topPlayers = costs.filter((c) => c.cost === highest);
  if (topPlayers.length === 1) {
    this.emitToRoom(io, "gameEnded", { winner: topPlayers[0].name });
  } else {
    this.emitToRoom(io, "gameEnded", { winner: "引き分け" });
  }
}

module.exports = {
  checkMinisterElimination,
  checkPrincessElimination,
  checkPrincessGlassesRevival,
  handleCountessElimination,
  determineWinnerByHandCost,
};
