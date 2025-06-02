const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const GameManager = require("./game/GameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const games = {}; // { roomId: GameManager }

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
// if room is not exist, create new room. else, enter existing room.
  socket.on("createRoom", async ({ roomId, name }) => {
    if (!games[roomId]) {
      games[roomId] = new GameManager(roomId);
      console.log("Room created:", roomId);
    }
    const success = games[roomId].addPlayer(socket.id, name);
    if (success) {
      socket.join(roomId);
      const roomSockets = await io.in(roomId).fetchSockets();
      const userList = roomSockets.map((s) => s.id);
      console.log(`Room ${roomId} に現在joinしているユーザー一覧:`, userList);
      io.to(roomId).emit("roomUpdate", {
        players: Object.values(games[roomId].players).map((p) => ({
          name: p.name,
          isEliminated: p.isEliminated,
        })),
      });
    }
  });

  socket.on("startGame", ({ roomId }) => {
    const game = games[roomId];
    if (game) {
      game.startGame();
      const currentPlayerId = game.getCurrentPlayerId();
      io.to(roomId).emit("gameStarted", {
        players: Object.values(game.players).map((p) => ({
          name: p.name,
          handCount: p.hand.length,
        })),
        currentPlayer: game.players[currentPlayerId].name,
      });
        console.log("Game Start:", game.players[currentPlayerId].name);
    }
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
      const drawnCard = game.drawCard(playerId);
      if (drawnCard) {
        socket.emit("cardDrawn", drawnCard);
      }
    }
  });

  socket.on("playCard", ({ roomId, cardIndex }) => {
    const game = games[roomId];
    if (game) {
      const playerId = socket.id;
      if (playerId !== game.getCurrentPlayerId()) {
      // プレイヤーが自分のターンじゃないときは拒否
      console.log("Not your turn, cannot play a card.");
      socket.emit("errorMessage", "今はあなたのターンではありません。");
      return;
      }
      const playedCard = game.playCard(playerId, cardIndex);
      io.to(roomId).emit("cardPlayed", {
        player: game.players[playerId].name,
        card: playedCard,
        playedCards: game.playedCards,
      });
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
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
