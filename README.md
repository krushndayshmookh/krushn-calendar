# Krushn Calendar

A custom, multi-user calendar application built on top of Google Calendar.

## Features
-   **Google Sign-In**: Secure OAuth 2.0 authentication.
-   **Custom Views**: Interactive Month and Weekly views.
-   **Categories**: Color-code and filter events by custom categories.
-   **Event Enrichment**: Add private tags and notes to any event.
-   **RSVP**: Accept, Decline, or Suggest Time directly from the UI.
-   **Smart Layouts**: Overlapping event handling and current time markers.

## Development

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create `backend/.env`:
    ```env
    MONGODB_URI=mongodb+srv://...
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    COOKIE_KEY=some_random_string
    ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```
    Frontend: `http://localhost:5173`
    Backend: `http://localhost:3000`

    *Note: Add `http://localhost:3000/api/auth/google/callback` to your Google Cloud Console Redirect URIs.*

## Deployment (Vercel)

This project is configured for a single-deployment on Vercel (Backend serving Frontend).

1.  **Deploy**
    ```bash
    vercel
    ```

2.  **Configuration**
    Add the following Environment Variables in Vercel:
    -   `MONGODB_URI`
    -   `GOOGLE_CLIENT_ID`
    -   `GOOGLE_CLIENT_SECRET`
    -   `COOKIE_KEY`

3.  **Post-Deploy**
    Update your Google Cloud Console Key to include the production callback URI:
    `https://<your-vercel-domain>/api/auth/google/callback`
