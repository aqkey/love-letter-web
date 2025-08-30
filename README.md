## Deployment

This project contains a Node.js backend (`/backend`) and a React frontend
(`/frontend`).

When deploying to an online server, configure the following environment
variables so that the frontend can reach the backend and the backend accepts
requests from your deployment domain.

### Backend

- `PORT`: Port number the server should listen on. Defaults to `4000`.
- `CLIENT_ORIGIN`: URL of the frontend that is allowed to access the backend.

### Frontend

- `REACT_APP_BACKEND_URL`: URL of the backend server. Defaults to
  `http://localhost:4000` for local development.

Example:

```bash
# Backend
CLIENT_ORIGIN=https://your-frontend.example.com PORT=80 node backend/index.js

# Frontend
REACT_APP_BACKEND_URL=https://your-backend.example.com npm run build
```

These variables make the application configurable and ready for deployment on
remote servers.
