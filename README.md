# 🐳 GGSIPU Result & Syllabus Dashboard (Docker Deployment)

This directory is configured with **Docker** and **Docker Compose** for instant production-ready hosting.

## Prerequisite
Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.

---

## 🚀 How to Run the App

1. Open your terminal in this directory.
2. Build and start the container in the background (detached mode):
   ```bash
   docker compose up -d --build
   ```
3. Open `http://localhost:5000` in your web browser.

The app will start automatically, and it is configured to restart if the system reboots or the app crashes.

---

## 💾 Persistent Storage
Your syllabus data (`syllabus.json`) and leaderboard database (`leaderboard.json`) are mounted directly to your local folder. Any changes you make via the Admin panel are saved to your local files and will **not** be lost when the container is rebuilt or stopped.

---

## 🛠 Useful Commands

* **Stop the App:**
  ```bash
  docker compose down
  ```
* **View Logs:**
  ```bash
  docker compose logs -f
  ```
* **Restart the App:**
  ```bash
  docker compose restart
  ```
