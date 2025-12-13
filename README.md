# Running Chihuahua AI

**Running Chihuahua AI** is a 3D infinite runner game where you play as a brave Chihuahua running for its life! Escape from giant bosses, dodge obstacles, and compete for the highest score on the global leaderboard.

![Running Chihuahua](https://placehold.co/600x400/png?text=Running+Chihuahua)

## 🎮 How to Play

The Chihuahua runs automatically. Your goal is to survive as long as possible while avoiding hazards from both the front and behind.

### Controls

*   **DODGE!**: Tap the red button when an obstacle (Rock, Car, Animal) appears in front of you.
*   **DUCK!**: Tap the blue button when the Boss throws a projectile (Barrel, Bone, Fireball) from behind.

### Mechanics

1.  **Obstacles (Front)**:
    *   Avoid rocks, cars, and farm animals.
    *   **Counter Attack**: If you successfully **DODGE** an obstacle, it will tumble backward and hit the Boss!

2.  **Projectiles (Behind)**:
    *   The Boss chasing you will throw objects or spit fire.
    *   Use **DUCK** to spin or crouch under these attacks.

3.  **Boss Battles**:
    *   The Boss takes damage when you dodge obstacles successfully.
    *   **10 Hits** defeats the Boss, granting a score bonus and advancing the level.
    *   **Boss Evolution**:
        1.  **Gorilla**: Throws Barrels and Bananas.
        2.  **Cheetah**: Throws Bones and Rocks. Runs extremely fast.
        3.  **Dragon**: Flies and spits Fireballs.

4.  **Health & Game Over**:
    *   You have **3 Hearts**.
    *   Hitting an obstacle or getting hit by a projectile removes 1 heart.
    *   When hearts reach 0, the game ends.

## 🏆 Features

*   **Global Ranking**: Compete with players worldwide. Scores are saved automatically to Supabase.
*   **Farcaster Integration**: Play within a Farcaster Frame to see your profile picture and username on the leaderboard.
*   **Wallet Connection**: Connect your Ethereum wallet to link your score to your address.
*   **Dynamic World**: Day and night cycles change as you run.
*   **Combo System**: Chain successful dodges to increase your score multiplier.

## 🛠 Development

To run this project locally:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Set up Supabase**:
    *   Create a project on [Supabase](https://supabase.com).
    *   Run the SQL commands below in the Supabase SQL Editor.
    *   Create a `.env` file in the root directory (or set environment variables):
        ```
        VITE_SUPABASE_URL=your_supabase_project_url
        VITE_SUPABASE_KEY=your_supabase_anon_key
        ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

4.  **Build for production**:
    ```bash
    npm run build
    ```

## 📜 License

MIT License