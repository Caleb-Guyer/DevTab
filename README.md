# DevTab

DevTab is a customizable, developer-focused new tab dashboard built for
[Hack Club Stardance](https://stardance.hackclub.com/). It turns an empty browser
tab into a fast home base for search, project links, live information, and
lightweight productivity tools.

**Live site:** [caleb-guyer.github.io/DevTab](https://caleb-guyer.github.io/DevTab/)

## Features

- Live local clock and date
- Web search and developer quick links
- Current weather based on browser location, powered by real API data
- Public GitHub profile statistics and recently updated repositories
- Scratchpad notes that automatically persist between visits
- Keyboard shortcuts for search (`/`), notes (`N`), and theme switching (`T`)
- Customizable accent color, dark or light mode, background intensity, and card visibility
- Responsive, accessible interface for desktop and mobile screens

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the search field |
| `N` | Focus the notes field |
| `T` | Toggle dark or light mode |

Shortcuts are disabled while typing in an input or text area.

## Technologies

- Semantic HTML5
- Custom CSS with responsive layouts and themes
- Vanilla JavaScript
- [Vite](https://vite.dev/) for development and production builds
- Browser `localStorage` for notes and preferences
- [Open-Meteo](https://open-meteo.com/) for current weather data
- [BigDataCloud](https://www.bigdatacloud.com/) for location names
- [GitHub REST API](https://docs.github.com/en/rest) for public profile and repository data
- GitHub Actions and GitHub Pages for continuous deployment

## Local development

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer
- npm, included with Node.js

### Setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Caleb-Guyer/DevTab.git
   cd DevTab
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the local address printed in the terminal, normally
   `http://localhost:5173`.

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd install` and
`npm.cmd run dev` instead.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server with hot reload |
| `npm run build` | Create an optimized production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Data and privacy

- Notes and dashboard preferences remain in the browser's local storage.
- Weather requests use the browser's location only after permission is granted.
- GitHub information comes from the public API and does not require an access token.

## Deployment

Pushes to `main` automatically build and deploy DevTab to GitHub Pages through
`.github/workflows/deploy-pages.yml`. The workflow installs locked dependencies,
creates the production build, uploads `dist/`, and publishes it to the live site.

## Project status

DevTab 1.0 is feature-complete and publicly deployed. Future improvements may
include editable quick links, a command launcher, and additional optional
dashboard cards.
