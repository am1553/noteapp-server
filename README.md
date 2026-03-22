# Notes App — Backend

REST API for the Notes App, built with Node.js, Express, and PostgreSQL. Handles authentication, note management, and tag filtering with a fully typed TypeScript codebase.

🔗 **[Live Demo](https://notesapp-react-akzo.onrender.com/)** · **[Frontend Repo](https://github.com/am1553/notesapp-react)**

---

## Features

- **JWT authentication** — bcrypt password hashing, JWT token issuance and verification
- **Notes CRUD** — full create, read, update, delete endpoints with user-scoped access control
- **Tag management** — associate and filter notes by tags via relational PostgreSQL schema
- **Search** — server-side note search by title and content
- **Request logging** — Morgan HTTP logger for request visibility
- **TypeScript throughout** — fully typed Express handlers, DB queries, and middleware

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 4 |
| Language | TypeScript |
| Database | PostgreSQL (via `pg`) |
| Auth | JWT + bcryptjs |
| Logging | Morgan |
| Build | tsc → dist/ |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Installation

```bash
git clone https://github.com/am1553/noteapp-server.git
cd noteapp-server
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/notesapp
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

### Development

```bash
npm run dev
```

Server runs at `http://localhost:5000`

### Build & Start

```bash
npm run build
npm start
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| POST | `/api/auth/logout` | Clear auth cookie |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes for authenticated user |
| POST | `/api/notes` | Create a new note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |

### Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | Get all tags for authenticated user |
| POST | `/api/tags` | Create a tag |
| DELETE | `/api/tags/:id` | Delete a tag |

## Database Schema

The schema is defined using PL/pgSQL migrations. Core tables:

- `users` — id, email, password_hash, created_at
- `notes` — id, user_id (FK), title, content, created_at, updated_at
- `tags` — id, user_id (FK), name
- `note_tags` — note_id (FK), tag_id (FK) — join table

## Deployment

Backend is deployed on **Render** as a web service. PostgreSQL is hosted on Render's managed database. CORS is configured to allow requests from the frontend origin only.
