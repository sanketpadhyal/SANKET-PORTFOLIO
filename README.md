# Sanket Padhyal Portfolio Frontend

Open-source React frontend for Sanket Padhyal’s portfolio — built as a polished personal website with project showcases, AI chat, contact tickets, coffee support, admin views, and a public leaderboard.

This repository contains only the client-side application. Backend services, API keys, Firebase credentials, payment configuration, and private deployment details must be configured separately through environment variables.

## Features

- ✨ **Portfolio experience** — responsive home page, skills, project highlights, loading screen, smooth desktop scrolling, and low-performance mode for lighter devices.
- 🧩 **Projects showcase** — GitHub-inspired project cards, share/copy actions, and custom repository detail pages.
- 💬 **Sanket AI UI** — floating assistant interface with saved chat history, suggested prompts, streamed responses, and quick actions.
- 📮 **Contact tickets** — Google sign-in flow, profile preferences, private ticket creation, reply tracking, and support-style conversation screens.
- ☕ **Support flow** — fixed/custom INR support amounts, payout page, payment proof attachment, and user-friendly status screens.
- 🏅 **Leaderboard** — public Top 100 contribution ranking with refresh support, local caching, and podium-style ranking.
- 🛠️ **Admin views** — dashboard screens for tickets, payments, leaderboard entries, passkey setup, search, filters, and session handling.
- 🔑 **Passkey-ready UI** — WebAuthn registration/login screens for secure admin access.

## Tech Stack

- React
- Create React App
- Firebase Auth
- Lenis
- Lucide React
- SimpleWebAuthn browser tools
- React Easy Crop

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Add the required Firebase, API, payment, and resume settings to `.env`.

4. Start the development server:

   ```bash
   npm start
   ```

Set `REACT_APP_API_BASE` if your backend API is not running on the default URL.

## Scripts

```bash
npm start
npm run build
npm test
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
