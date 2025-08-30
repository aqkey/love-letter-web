import { io } from "socket.io-client";

// Allow configuring the backend URL via environment variable for deployment
// React only exposes env variables prefixed with REACT_APP_
const backendUrl =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";

const socket = io(backendUrl);

export default socket;
