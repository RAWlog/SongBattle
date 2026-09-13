# Music Tournament

Music Tournament is a web application for hosting interactive music tournaments. It allows users to import playlists from Spotify, automatically pairs tracks with their corresponding YouTube music videos, and pits them against each other in a 1-on-1 Single Elimination Bracket.

The ultimate goal of the app is to help users determine a definitive, objective ranking of their favorite songs.

---

## 1. Tech Stack

*   **Framework:** Next.js (App Router, Server Components)
*   **Data Layer:** React Server Actions
*   **Styling:** Tailwind CSS (v4), Shadcn-like UI components
*   **Database:** SQLite (local storage)
*   **ORM:** Prisma
*   **Integrations:** Spotify HTML Embed scraping, `yt-search` library (YouTube scraping)

---

## 2. Key Architecture Decisions

Throughout development, the system underwent significant architectural changes to bypass various third-party platform limitations.

### 2.1. Dropping the Official Spotify API
Initially, the project used the official Spotify API, which required OAuth setup, a `Client ID`, and a `Client Secret`. However, the API imposes strict restrictions on apps in Developer Mode, locking out any users not manually added to a whitelist.

**Solution:** A custom `spotify.service.ts` was implemented to extract data directly from public Spotify HTML Embed widgets. The script parses JSON data from the `<script id="__NEXT_DATA__">` tag, gathering full track metadata (titles, artists, album art, duration). This made the application completely autonomous, free to use, and eliminated the need for API keys.

### 2.2. Just-In-Time (JIT) YouTube Loading & Dropping the Google API
The official YouTube Data API imposes a strict quota limit of 10,000 units per day (one search request costs 100 units). This meant the app could only process 100 tracks per day. Furthermore, official music videos are often subjected to regional geoblocking.

**Solution:**
1.  **API Replacement:** We transitioned to the `yt-search` library, which scrapes YouTube search results. Since the request is sent from the server, you can use a VPN on the host machine to bypass regional blocks.
2.  **JIT (Just-In-Time) Architecture:** Bulk-searching hundreds of videos during playlist import led to timeouts and temporary IP bans from YouTube for suspicious activity. The search logic was moved to the server-rendering phase of the match page (`MatchView`). A music video is searched **only** at the exact moment the two tracks are ready to appear on screen. Since a user takes roughly 10-30 seconds to vote, YouTube requests are naturally spaced out, mimicking human behavior and completely avoiding bans.

### 2.3. Bracket Math Algorithm
The tournament uses a classic Single-Elimination Olympic system. The mathematical requirement for such a bracket is that the number of slots must always be a power of two (2, 4, 8, 16, ..., 512, 1024).

**Solution:**
Because user playlists have arbitrary sizes (e.g., 522 tracks), the `bracket.service.ts` algorithm automatically calculates the next highest power of two (1024) and generates the bracket.
The slots missing from 1024 are filled with "ghosts." A track paired against a ghost receives a "BYE" and instantly advances to the next round without fighting. Due to this, the number of actual matches in the first round can be significantly smaller than the number of slots. The match-counting logic in the UI was modified to hide these ghost "BYE" matches and only display real battles to the user.

### 2.4. Global Elo Rating
In addition to advancing the winner through the bracket, after every match, `elo.service.ts` recalculates the global rating for both tracks using the Elo mathematical system (originally designed for chess) with a `K-factor of 32`. This generates a global leaderboard (Ranking) for all tracks, even if they were eliminated from the main tournament early on.

---

## 3. User Guide

### 3.1. Creating a Tournament
The application provides two ways to import tracks on the homepage:

1.  **Fast Import (Spotify URL):** Suitable for smaller playlists (max 100 tracks — hardware limit of the Spotify widget). Copy the link to a public playlist and paste it into the input field.
2.  **Unlimited Tracks Import (CSV):** For massive playlists (e.g., 500+ tracks).
    *   Go to the [Exportify](https://exportify.net/) service.
    *   Export your playlist in `.csv` format.
    *   Upload the file into the app. The local parser will automatically read the structure and load any number of tracks.

### 3.2. Playing the Tournament
*   Immediately after importing, the bracket is generated, and you are sent to the arena.
*   Click the "CHOOSE" button under the track you prefer.
*   Matches are automatically saved to the local SQLite database after every click.

### 3.3. Saving Progress
The system has no user accounts; progress is tied to the local database.
If you accidentally close the tab, simply return to the homepage (`/`). You will see a **"Recent Tournaments"** section. Click the **"Continue"** button next to your playlist, and the tournament will resume exactly where you left off.

---

## 4. Deployment and Local Setup

**Requirements:**
*   Node.js (v18+)
*   NPM or Yarn

**Setup Steps:**

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Initialize the local SQLite database:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:3000` in your browser.

*(Optional)* To bypass potential regional restrictions on YouTube search, it is recommended to run the server on a machine with an active VPN connection. No extra API keys are required in the `.env` file.
