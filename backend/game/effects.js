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
      byElimination: true,
    });

    // 姫(眼鏡)所持ならここで即復活（残り手札の公開は行わない）
    if (this.checkPrincessGlassesRevival(playerId, io)) {
      return true;
    }

    // 脱落したままなら残りの手札も捨て札へ
    let gameEnded = false;
    while (player.hand.length) {
      const discarded = player.hand.pop();
      this.playedCards.push({ player: player.name, card: discarded });
      this.emitToRoom(io, "cardPlayed", {
        playerId: playerId,
        player: player.name,
        card: discarded,
        playedCards: this.playedCards,
        byElimination: true,
      });
      // 大臣による捨て札でも効果を評価（例: 姫(爆弾)で即時決着）
      if (this.applyDiscardEffectsOnEliminated(playerId, discarded, io)) {
        gameEnded = true;
        break;
      }
    }

    if (!gameEnded) {
      const alive = this.getAlivePlayers();
      if (alive.length === 1) {
        this.endGame(io, alive[0].name);
      }
    }

    return true;
  }
  return false;
}

function checkPrincessElimination(playerId, discardedCard, io) {
  const player = this.players[playerId];
  if (!player || player.isEliminated) return;

  if (!discardedCard) return;

  // 姫（通常）を捨てた場合は脱落（復活ドローなし）
  if (discardedCard.id === 8) {
    player.isEliminated = true;
    console.log(`${player.name} は姫を捨てたため脱落しました。`);
    this.emitToRoom(io, "playerEliminated", {
      playerId: playerId,
      name: player.name,
    });
    // 姫(眼鏡)を所持している場合はここで即時復活処理を試みる
    // 復活が成功した場合は残り手札の公開やゲーム終了判定を行わない
    const revived = this.checkPrincessGlassesRevival(playerId, io);
    if (revived) {
      return;
    }
    // 残り手札を公開（捨て札へ）
    const ended = this.discardRemainingHandOnElimination(playerId, io);
    if (ended) return;
    const alive = this.getAlivePlayers();
    if (alive.length === 1) {
      this.endGame(io, alive[0].name);
    }
    return;
  }

  // 姫（爆弾）を捨てた場合は即脱落し、ゲームを終了判定（復活は不可）
  if (discardedCard.id === 12) {
    player.isEliminated = true;
    console.log(`${player.name} は姫(爆弾)を捨てたため脱落しました。`);
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
  }
}

// 大臣の効果などで「脱落状態のプレイヤーの手札を捨てる」際にも
// 特定カードの捨て札効果（主に姫・爆弾）を反映させるための補助関数。
// ゲーム終了を発火した場合は true を返す。
function applyDiscardEffectsOnEliminated(playerId, discardedCard, io) {
  if (!discardedCard) return false;
  // 既に脱落しているため、通常の姫(8)は追加効果なし（復活は直前に処理済み）
  if (discardedCard.id === 12) {
    // 姫(爆弾)が捨て札になったら即時決着（プレイ時と同等の扱い）
    const alive = this.getAlivePlayers();
    if (alive.length <= 1) {
      const winner = alive.length === 1 ? alive[0].name : "引き分け";
      this.endGame(io, winner);
    } else {
      this.determineWinnerByHandCost(io);
    }
    return true;
  }
  return false;
}

// 脱落が確定したプレイヤーの残り手札を公開（捨て札へ移動）する
// 途中で姫(爆弾)などによりゲームが決着した場合は true を返す
function discardRemainingHandOnElimination(playerId, io) {
  const player = this.players[playerId];
  if (!player) return false;
  let ended = false;
  while (player.hand.length) {
    const discarded = player.hand.pop();
    this.playedCards.push({ player: player.name, card: discarded });
    this.emitToRoom(io, "cardPlayed", {
      playerId,
      player: player.name,
      card: discarded,
      playedCards: this.playedCards,
      byElimination: true,
    });
    if (this.applyDiscardEffectsOnEliminated(playerId, discarded, io)) {
      ended = true;
      break;
    }
  }
  return ended;
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
      this.emitToRoom(io, "playerEliminated", { playerId: pid, name: p.name });
      // 手札公開
      this.discardRemainingHandOnElimination(pid, io);
    }
  });
  const alive = this.getAlivePlayers();
  if (alive.length === 1) {
    this.endGame(io, alive[0].name);
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
    this.endGame(io, topPlayers[0].name);
  } else {
    this.endGame(io, "引き分け");
  }
}

module.exports = {
  checkMinisterElimination,
  checkPrincessElimination,
  checkPrincessGlassesRevival,
  handleCountessElimination,
  determineWinnerByHandCost,
  applyDiscardEffectsOnEliminated,
  discardRemainingHandOnElimination,
};
