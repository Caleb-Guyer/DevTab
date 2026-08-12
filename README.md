# DevTab

DevTab is a customizable, developer-focused new tab page being created as a
[Hack Club Stardance](https://stardance.hackclub.com/) project. Its goal is to
turn an empty browser tab into a useful home base for common development tasks
without becoming distracting or complicated.

> [!NOTE]
> DevTab is currently in its initial development phase. The repository contains
> the Vite foundation and a temporary setup screen; the features below are
> planned and have not been implemented yet.

## Purpose

Developers open new tabs constantly. DevTab will make that space useful by
putting frequently used links, project shortcuts, and lightweight productivity
tools in one fast, customizable interface. The project will use a custom UI and
browser-native technologies rather than a one-click website builder.

## Current features

- A live local clock and date display
- Live local weather using browser location and real API data
- Public GitHub profile statistics and recently updated repositories
- Web search and a starter set of developer quick links
- A scratchpad that automatically saves the note in the browser
- Keyboard shortcuts for search (`/`), notes (`N`), and theme switching (`T`)
- Locally saved appearance and dashboard visibility preferences
- A responsive custom interface for desktop and mobile screens

## Planned features

- A customizable dashboard for developer links and project shortcuts
- Fast search and keyboard-friendly navigation
- A command-style launcher for common destinations and actions
- Useful at-a-glance information, such as the current time and focus state
- Preferences saved locally in the browser
- Responsive layouts and accessible light and dark themes

The feature set may evolve as the project is designed and tested.

## Technologies

- HTML5 for structure
- Custom CSS for layout, styling, themes, and responsive behavior
- Vanilla JavaScript for interactivity and local persistence
- [Vite](https://vite.dev/) for the development server and production builds
- [Open-Meteo](https://open-meteo.com/) for current weather data
- [BigDataCloud](https://www.bigdatacloud.com/) for client-side location names
- [GitHub REST API](https://docs.github.com/en/rest) for public profile and repository data

## Local development

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer
- npm, which is included with Node.js

### Setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Caleb-Guyer/DevTab.git
   cd DevTab
   ```

2. Install the dependencies:

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

## AI usage

OpenAI Codex is being used as a development assistant for tasks such as project
scaffolding, documentation, brainstorming, debugging, and code review. The
project is directed and reviewed by the author, and its design and feature
decisions are made deliberately throughout development. DevTab is not being
created with an AI one-click website builder.

## Project status

DevTab is under active development. A public deployment link and usage guide
will be added once the first complete feature is ready.
