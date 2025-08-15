import React from "react";
import { render, screen } from "@testing-library/react";
import Game from "./Game";

jest.mock("./socket", () => ({
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
}));

test("renders return to lobby button", () => {
  render(
    <Game
      setScreen={() => {}}
      roomId="room"
      playerName="alice"
      setWinner={() => {}}
      setRoomId={() => {}}
      setPlayerName={() => {}}
    />
  );
  expect(screen.getByText("ロビーに戻る")).toBeInTheDocument();
});
