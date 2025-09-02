const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const GameManager = require("./game/GameManager");
const { CARD_LIST } = GameManager;

const app = express();
app.use(express.json());
const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : "*"; // サーバ配置時は同一オリジン想定のため許可を緩める

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const games = {}; // { roomId: GameManager }

app.post("/test/setup", (req, res) => {
  const { roomId, deck, hands } = req.body;
  const game = games[roomId];
  if (!game) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (Array.isArray(deck)) {
    game.deck = deck.map((id) => {
      const cardInfo = CARD_LIST.find((c) => c.id === id);
      return cardInfo ? { ...cardInfo } : { id };
    });
  }

  if (hands && typeof hands === "object") {
    Object.entries(hands).forEach(([playerId, cardIds]) => {
      if (!game.players[playerId] || !Array.isArray(cardIds)) return;
      game.players[playerId].hand = cardIds.map((id) => {
        const cardInfo = CARD_LIST.find((c) => c.id === id);
        return cardInfo ? { ...cardInfo } : { id };
      });
      game.players[playerId].isEliminated = false;
      game.players[playerId].isProtected = false;
      game.players[playerId].hasDrawnCard = false;
      io.to(playerId).emit("initialHand", game.players[playerId].hand);
    });
  }

  io.to(roomId).emit("deckCount", { deckCount: game.deck.length });
  res.json({ success: true });
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
// if room is not exist, create new room. else, enter existing room.
  socket.on("createRoom", async ({ roomId, name, playerId }) => {
    if (!games[roomId]) {
      games[roomId] = new GameManager(roomId);
      console.log("Room created:", roomId);
    }
    const game = games[roomId];

    // Reconnect if playerId exists
    if (playerId && game.players[playerId]) {
      const oldPlayer = game.players[playerId];
      delete game.players[playerId];
      const idx = game.turnOrder.indexOf(playerId);
      if (idx !== -1) {
        game.turnOrder[idx] = socket.id;
      }
      oldPlayer.id = socket.id;
      game.players[socket.id] = oldPlayer;
      socket.join(roomId);
      socket.emit("playerId", socket.id);
      socket.emit("rejoinSuccess");
      io.to(roomId).emit("roomUpdate", {
        players: Object.values(game.players).map((p) => ({
          id: p.id,
          name: p.name,
          isEliminated: p.isEliminated,
          isProtected: p.isProtected,
          ishasDrawnCard: p.ishasDrawnCard,
        })),
      });
      return;
    }

    const success = game.addPlayer(socket.id, name);
    if (success) {
      game.gameMasterId = socket.id;
      socket.join(roomId);
      const tmp = socket.id; //後で消す
      const roomSockets = await io.in(roomId).fetchSockets();
      const userList = roomSockets.map((s) => s.id);
      console.log(`Room ${roomId} に現在joinしているユーザー一覧:`, userList);
      console.log(`追加したプレイヤーは:`, game.players[tmp].id);
      socket.emit("playerId", socket.id);
      io.to(roomId).emit("roomUpdate", {
        players: Object.values(game.players).map((p) => ({
          id: p.id,
          name: p.name,
          isEliminated: p.isEliminated,
          isProtected: p.isProtected,
          ishasDrawnCard: p.ishasDrawnCard,
        })),
        gameMasterId: game.gameMasterId,
      });
    }
  });

  socket.on("joinRoom", async ({ roomId, name, playerId }) => {
    const game = games[roomId];
    if (!game) {
      socket.emit("errorMessage", "Room not found");
      return;
    }

    // Reconnect if playerId exists
    if (playerId && game.players[playerId]) {
      const oldPlayer = game.players[playerId];
      delete game.players[playerId];
      const idx = game.turnOrder.indexOf(playerId);
      if (idx !== -1) {
        game.turnOrder[idx] = socket.id;
      }
      oldPlayer.id = socket.id;
      game.players[socket.id] = oldPlayer;
      if (game.gameMasterId === playerId) {
        game.gameMasterId = socket.id;
      }
      socket.join(roomId);
      socket.emit("playerId", socket.id);
      socket.emit("rejoinSuccess");
      io.to(roomId).emit("roomUpdate", {
        players: Object.values(game.players).map((p) => ({
          id: p.id,
          name: p.name,
          isEliminated: p.isEliminated,
          isProtected: p.isProtected,
          ishasDrawnCard: p.ishasDrawnCard,
        })),
        gameMasterId: game.gameMasterId,
      });
      return;
    }

    const success = game.addPlayer(socket.id, name);
    if (success) {
      socket.join(roomId);
      const tmp = socket.id; //後で消す
      const roomSockets = await io.in(roomId).fetchSockets();
      const userList = roomSockets.map((s) => s.id);
      console.log(`Room ${roomId} に現在joinしているユーザー一覧:`, userList);
      console.log(`追加したプレイヤーは:`, game.players[tmp].id);
      socket.emit("playerId", socket.id);
      io.to(roomId).emit("roomUpdate", {
        players: Object.values(game.players).map((p) => ({
          id: p.id,
          name: p.name,
          isEliminated: p.isEliminated,
          isProtected: p.isProtected,
          ishasDrawnCard: p.ishasDrawnCard,
        })),
        gameMasterId: game.gameMasterId,
      });
    }
  });

  socket.on("startGame", ({ roomId, orderMode, firstPlayerId }) => {
    const game = games[roomId];
    if (!game || socket.id !== game.gameMasterId) return;
    logPlayerHands(game);
    game.startGame({ orderMode, firstPlayerId });
    // 各プレイヤーに自分の手札を送信
    Object.keys(game.players).forEach(playerId => {
      const player = game.players[playerId];
      io.to(playerId).emit("initialHand", player.hand);
    });

    // 全員にゲーム開始通知
    const currentPlayerId = game.getCurrentPlayerId();
    io.to(roomId).emit("gameStarted", {
      players: Object.values(game.players).map((p) => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
      })),
      currentPlayer: game.players[currentPlayerId].name,
      deckCount: game.deck.length,
    });
    console.log("Game Start:", game.players[currentPlayerId].name);
  });

  socket.on("drawCard", ({ roomId }) => {
    const game = games[roomId];
    
    if (game) {
      const playerId = socket.id;
      if (playerId !== game.getCurrentPlayerId()) {
      // プレイヤーが自分のターンじゃないときは拒否
      console.log("Not your turn, cannot draw a card.");
      socket.emit("errorMessage", "今はあなたのターンではありません。");
      return;
      }
      const drawnCard = game.drawCard(playerId, io);
      if (drawnCard) {
        logPlayerHands(game);
        socket.emit("cardDrawn", drawnCard);
        io.to(roomId).emit("deckCount", { deckCount: game.deck.length });
        const eliminated = game.checkMinisterElimination(playerId, io);
        if (eliminated) {
          const alive = Object.values(game.players).filter((p) => !p.isEliminated);
          if (alive.length > 1) {
            game.nextTurn();
            const currentPlayerId = game.getCurrentPlayerId();
            io.to(roomId).emit("nextTurn", {
              currentPlayer: game.players[currentPlayerId].name,
            });
          }
        }
      }
    }
  });

  socket.on("playCard", ({ roomId, cardIndex,targetPlayerId, guessCardId, }) => {
    const game = games[roomId];
    if (game) {
      const playerId = socket.id;
      if (playerId !== game.getCurrentPlayerId()) {
      // プレイヤーが自分のターンじゃないときは拒否
      console.log("Not your turn, cannot play a card.");
      socket.emit("errorMessage", "今はあなたのターンではありません。");
      return;
      }
      const playedCard = game.playCard(playerId, cardIndex, targetPlayerId, guessCardId, io);
      logPlayerHands(game,roomId);
      io.to(roomId).emit("cardPlayed", {
        playerId: playerId,
        player: game.players[playerId].name,
        card: playedCard,
        playedCards: game.playedCards,
      });
      io.to(roomId).emit("deckCount", { deckCount: game.deck.length });
      if (!playedCard) {
        // カードが出せなかった（drawCardしてない、脱落済みなど）
        socket.emit("errorMessage", "カードを出せません。カードを引いてから出してください。");
        return;
      }
      game.nextTurn();
      const currentPlayerId = game.getCurrentPlayerId();
      io.to(roomId).emit("nextTurn", {
        currentPlayer: game.players[currentPlayerId].name,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    // TODO: プレイヤー削除処理
  });
  
  socket.on("requestSync", ({ roomId }) => {
    const game = games[roomId];
    if (!game) return;
    const player = game.players[socket.id];
    if (!player) return;
    const currentPlayerId = game.getCurrentPlayerId();
    socket.emit("syncState", {
      hand: player.hand,
      players: Object.values(game.players).map((p) => ({
        id: p.id,
        name: p.name,
        isEliminated: p.isEliminated,
      })),
      currentPlayer: game.players[currentPlayerId].name,
      deckCount: game.deck.length,
      playedCards: game.playedCards,
    });
  });
});

function logPlayerHands(game) {
  if (!game) {
    console.log(`GAMEが存在しません。`);
    return;
  }
  console.log(`=== Room ${game.roomId} のプレイヤー手札一覧 ===`);
  Object.keys(game.players).forEach(playerId => {
      const player = game.players[playerId];
      if (player.hand && player.hand.length > 0){
        const handSummary = player.hand.map(card => card.name).join(", ");
        console.log(`  ${player.name} (${player.id}): [${handSummary}]`);
      }else{
        console.log(`${player.name} (${player.id}): カードがありません。`)
      }
  });
  console.log("=========================================");
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// フロントエンドのビルド成果物を配信（存在する場合）
const buildPath = path.join(__dirname, "../frontend/build");
try {
  const fs = require("fs");
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    // Express v5 では正規表現でのキャッチオールを使用
    app.get(/.*/, (req, res) => {
      // E2EやAPI系は先にマッチしている想定。残りはSPAへフォールバック
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }
} catch (e) {
  console.warn("Static build serving disabled:", e?.message || e);
}
