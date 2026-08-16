# LifeOS 

A local-first personal operating system designed to help you manage your daily life, from habits and goals to health and finances, all while keeping your data private and secure on your own machine.

## Project Description

LifeOS is a robust desktop application built with TypeScript, Node.js, and Electron, leveraging React and Next.js for a dynamic user interface. It focuses on a local-first approach, storing all user data in plain JSON files within the application's directory, which can be version-controlled with Git. The application aims to provide a comprehensive suite of tools for personal organization, including:

- **Daily Logging:** Track sleep, energy, mood, productivity, and journal entries.
- **Habit Tracking:** Monitor daily, weekly, or custom habits with streak tracking and consistency metrics.
- **Task Management:** Organize tasks with priorities, due dates, and project linking.
- **Goal Setting:** Define and track progress towards personal goals.
- **Project Management:** Outline projects, track progress, and link related tasks.
- **Health Tracking:** Log workouts, track weight, and manage exercise history.
- **Nutrition Logging:** Record meals, calories, and macronutrient intake.
- **Financial Management:** Track income, expenses, and spending by category.
- **Knowledge Management:** Organize books and media items, tracking reading/watching progress and ratings.
- **Analytics:** Visualize trends and correlations in your data.
- **Customization:** Personalize themes, font sizes, and UI layouts.

All data is managed locally, ensuring privacy and control over your personal information.

## Table of Contents

- [Project Title & Badges](#lifeos-)
- [Project Description](#project-description)
- [Table of Contents](#table-of-contents)
- [Features](#features-)
- [Tech Stack](#tech-stack-)
- [Installation](#installation--requirements-)
- [Usage](#usage--how-to-use-)
- [Project Structure](#project-structure-)
- [Contributing](#contributing-)
- [License](#license-)
- [Important Links](#important-links-)
- [Footer](#footer-)

## Features 

- **Local-First Data Storage:** All your personal data is stored locally in JSON files, ensuring privacy and security. 
- **Comprehensive Personal OS:** Manage daily logs, habits, goals, projects, health, nutrition, finance, and knowledge in one place.
- **Data Visualization:** Gain insights into your progress with charts and analytics for various aspects of your life.
- **Task Management:** Organize and track tasks, link them to projects, and set priorities and due dates.
- **Habit Tracking:** Monitor daily, weekly, and custom habits with streak tracking and consistency metrics.
- **Goal Setting & Progress:** Define SMART goals and track your progress, optionally linking them to tasks.
- **Health & Fitness:** Log workouts, track weight, and record detailed exercise set data.
- **Financial Overview:** Visualize spending trends by category and track income vs. expenses.
- **Knowledge Base:** Organize books and media, track progress, and link to notes files.
- **Customizable UI:** Adjust theme, font size, display mode, and window controls for a personalized experience.
- **Keyboard Shortcuts:** Efficiently navigate the application using keyboard shortcuts.
- **Data Import/Export:** Easily back up or migrate your data with import and export functionalities.
- **Electron-Based Desktop App:** A cross-platform desktop application.

## Tech Stack 

- **Languages:** TypeScript, JavaScript, HTML, CSS, Markdown
- **Frameworks & Libraries:**
  - **Frontend:** React, React Router DOM, Recharts, Zod, Lucide React, clsx, react-window
  - **Backend/Desktop:** Node.js, Electron, Electron Builder
  - **Build Tools:** Vite, Webpack (implied by Electron Builder)
  - **Styling:** Tailwind CSS, PostCSS, Autoprefixer
  - **Utilities:** date-fns, concurrently, wait-on

## Installation & Requirements 

**Prerequisites:**

- Node.js (version 18+ recommended)

**Steps:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Idriss-Chefai/Lock-in.git
   cd Lock-in
   ```

2. **Navigate to the `app` directory:**
   ```bash
   cd app
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage / How to Use 

**Development Mode:**

To run the application in development mode, which includes hot-reloading and developer tools:

```bash
npm run dev
```

This command will start the Vite development server and launch the Electron application. The Electron app will wait for the Vite server to be available on `tcp:1420` before launching.

**Building for Distribution:**

To create a distributable installer for your operating system:

```bash
npm run dist
```

This command will first build the application (`tsc && vite build`) and then use `electron-builder` to package it into an installer (`nsis` for Windows, `AppImage` for Linux, `dmg` for macOS).

**Running the Packaged Application:**

After building, you can start the application directly:

```bash
npm start
```

## Project Structure 

The project follows a common structure for Electron applications with a React frontend:

```
Lock-in/
├── app/
│   ├── dist/          # Production build output
│   ├── electron/        # Electron main process and preload scripts
│   │   ├── main.js
│   │   └── preload.js
│   ├── public/          # Static assets (if any)
│   ├── src/             # Frontend React application source code
│   │   ├── App.tsx      # Main application component
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components for different routes
│   │   ├── services/    # Data fetching, state management, utility functions
│   │   ├── hooks/       # Custom React hooks
│   │   ├── theme.css    # Global CSS styles
│   │   └── main.tsx     # Application entry point
│   ├── index.html       # Main HTML file
│   ├── package.json     # Project dependencies and scripts
│   ├── tsconfig.json    # TypeScript configuration
│   ├── vite.config.ts   # Vite build configuration
│   └── postcss.config.cjs
│   └── tailwind.config.cjs
├── data/              # Local data storage (JSON files)
│   ├── daily/
│   ├── finance/
│   ├── goals/
│   ├── habits/
│   ├── health/
│   ├── knowledge/
│   ├── projects/
│   ├── reviews/
│   └── settings/
├── exports/           # Backups and exported data
├── ARCHITECTURE.md
├── DATA_MODEL.md
├── DEVELOPMENT.md
├── README.md          # This file
├── Start LifeOS.bat   # Windows start script
└── Start LifeOS.command # macOS/Linux start script
```

## Features from Code Analysis 

- **IPC Communication:** The `electron/main.js` and `electron/preload.js` files establish robust Inter-Process Communication (IPC) for secure file system operations and window management, exposing a `window.lifeos` API to the renderer process.
- **Local Data Persistence:** The `services/datastore/JsonDataStore.ts` module handles all data persistence using JSON files, with validation performed by Zod schemas (`services/validation/schemas.ts`).
- **Component-Based UI:** The application utilizes a component-based architecture with React, evident in files like `components/Sidebar.tsx`, `components/CalendarPanel.tsx`, and various UI components in `components/ui.tsx`.
- **State Management:** React Context (`services/datastore/context.tsx`) is used for managing application state, particularly the data store.
- **Routing:** `react-router-dom` is used for client-side routing within the Electron app.
- **UI Libraries:** `lucide-react` is used for icons, and `clsx` for conditional CSS class merging.
- **Developer Experience:** Hot-reloading and development tools are integrated via Vite (`vite.config.ts`).
- **Build & Packaging:** `electron-builder` is configured for creating distributable application packages.

## Contributing 

Contributions are welcome! Please feel free to:

- Fork the repository.
- Create a new branch (`git checkout -b feature/YourFeature`).
- Make your changes.
- Commit your changes (`git commit -m 'Add YourFeature'`).
- Push to the branch (`git push origin feature/YourFeature`).
- Open a Pull Request.

## License 

This project does not specify a license. Please refer to the repository owner for licensing details.

## Important Links 🔗

- **Repository:** [https://github.com/Idriss-Chefai/Lock-in](https://github.com/Idriss-Chefai/Lock-in)

## Footer 

This README was generated based on the analysis of the **Lock-in** repository. 

Repository URL: [https://github.com/Idriss-Chefai/Lock-in](https://github.com/Idriss-Chefai/Lock-in)
Author: Idriss-Chefai

If you found this project helpful, consider giving it a star , forking it, or opening an issue if you encounter any problems!
