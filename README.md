📖 Comic Vibe Tracker

A sleek, real-time web app built with React and Firebase for tracking your manga, manhwa, and comics.

This project is a fully functional, single-page application that allows users to find and track their reading progress for comics and manga. It connects to the Jikan (MyAnimeList) API to pull in official titles and cover art, and it uses Firebase Firestore for instantaneous, real-time database updates.



🚀 Core Features

Search & Add: Instantly search a massive online database (via Jikan API) to find and add new titles to your list.

Real-time Tracking: Track your reading status (Reading, Completed, Plan to Read, Dropped) and your current chapter progress.

Dynamic Editing: Click on any card to open an edit modal where you can:

Update your status and chapters.

Give the series a 1-10 star rating.

Write personal notes.

Instant Updates: Built with Firebase onSnapshot listeners, your list updates in real-time across all sessions.

Organize Your List: Instantly filter your list by reading status or use the search bar to find a specific title in your collection.

Dynamic Sorting: Sort your entire list by "Last Updated", "Rating", or "Title (A-Z)" in ascending or descending order.

🛠️ Tech Stack

Frontend: React.js (with Hooks & useMemo)

Database: Google Firebase (Firestore) for real-time data storage.

Authentication: Firebase Auth (Anonymous login).

Styling: Tailwind CSS for a modern, responsive design.

API: Jikan API (v4) for fetching manga data and images.

Icons: Lucide React

Build Tool: Vite

🏁 How to Run Locally

To get a local copy up and running, follow these simple steps.

Clone the repository:

git clone [https://github.com/Vinit-vibhandik22/my-manga-tracker.git](https://github.com/Vinit-vibhandik22/my-manga-tracker.git)


Navigate to the project directory:

cd my-manga-tracker


Install NPM packages:

npm install


Set up your environment variables:

Create a new file in the root of the project named .env.local

Go to your Firebase Project Console and get your project's configuration object.

Add your config to the .env.local file like this:

VITE_FIREBASE_CONFIG='{ "apiKey": "...", "authDomain": "...", "projectId": "...", ... }'


Run the app:

npm run dev


🙏 Acknowledgements

A big thanks to the Jikan API for providing the free manga data.
