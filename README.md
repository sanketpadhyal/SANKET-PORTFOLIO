# Sanket Padhyal Portfolio

Open-source full-stack portfolio for Sanket Padhyal — built as a polished personal website with project showcases, AI chat, contact tickets, coffee support, admin tools, and a public leaderboard.

The app includes a React frontend and an Express backend, with Firebase, Cloudinary, JWT authentication, WebAuthn passkeys, Groq AI, and protected API routes. Private keys, deployment credentials, and payment configuration are intentionally kept outside the repository.

## Features

- ✨ **Portfolio experience** — responsive home page, skills, project highlights, loading screen, smooth desktop scrolling, and low-performance mode for lighter devices.
- 🧩 **Projects showcase** — GitHub-inspired project cards, share/copy actions, and custom repository detail pages.
- 💬 **Sanket AI** — floating assistant interface with saved chat history, suggested prompts, streamed responses, quick actions, and Groq-powered backend replies.
- 📮 **Contact tickets** — Google sign-in flow, profile preferences, private ticket creation, reply tracking, and support-style conversation screens.
- ☕ **Support flow** — fixed/custom INR support amounts, payout page, payment proof attachment, Cloudinary uploads, and payment status records.
- 🏅 **Leaderboard** — public Top 100 contribution ranking with refresh support, local caching, and podium-style ranking.
- 🛠️ **Admin workspace** — dashboard for tickets, payments, leaderboard entries, passkey setup, search, filters, replies, and session handling.
- 🔑 **Passkey security** — WebAuthn registration, authentication, device listing, and device removal for secure admin access.
- 🛡️ **Protected backend** — CORS allow-listing, JWT verification, Firebase Admin checks, input validation, and route-level rate limits.

## Tech Stack

- **Frontend:** React, Create React App, Firebase Auth, Lenis, Lucide React, SimpleWebAuthn browser tools, React Easy Crop
- **Backend:** Node.js, Express, Firebase Admin, Firestore, JWT, Cloudinary, Multer, Nodemailer, SimpleWebAuthn server tools
- **AI:** Groq chat completions
- **Database:** Firestore collections for users, tickets, payments, passkeys, and leaderboard records

## Project Structure

```text
backend/    Express API, auth, tickets, AI, admin, passkeys, leaderboard
public/     Static frontend assets
src/        React pages, components, styling, and client logic
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   npm install --prefix backend
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

3. Add the required Firebase, Cloudinary, Groq, admin, JWT, passkey, payment, and resume settings to the `.env` files.

4. Start the backend and frontend:

   ```bash
   npm start --prefix backend
   npm start
   ```

Set `REACT_APP_API_BASE` if your backend API is not running on the default URL.

## Environment Examples

Safe example environment files are included for setup:

- `.env.example` — frontend public configuration template
- `backend/.env.example` — backend configuration template

These files contain placeholder values only. Real Firebase, Cloudinary, Groq, JWT, passkey, payment, and deployment secrets should stay in local `.env` files and must not be committed.

## Scripts

```bash
npm start
npm run build
npm test
npm start --prefix backend
npm run dev --prefix backend
```

## Security Notes

- Do not commit `.env`, private credentials, payment details, service account files, QR codes, or personal documents.
- Keep `.env.example` as the public template with safe placeholder values only.
- Rotate any secret that was ever committed before publishing the repository.

## Author

Made by **Sanket Padhyal**.

- **Email:** sanketpadhyal3@gmail.com
- **GitHub:** [@sanketpadhyal](https://github.com/sanketpadhyal)

## License

This project is released under the MIT License. See `LICENSE` for details.
