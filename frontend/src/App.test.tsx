import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders lobby title", () => {
  render(<App />);
  const titleElement = screen.getByText(/Love Letter - ロビー/i);
  expect(titleElement).toBeInTheDocument();
});
