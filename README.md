# DevTab

DevTab is a keyboard-first project workspace for the browser's new-tab page. It keeps the context for each project—tasks, notes, links, repository activity, focus sessions, and saved browser tabs—together in a fast local-first dashboard.

**Live site:** [caleb-guyer.github.io/DevTab](https://caleb-guyer.github.io/DevTab/)

![DevTab project workspace demo](./public/demo.gif)

## DevTab 3.0: Project Workspaces

Create a workspace for every project and switch context without rebuilding your dashboard. Each workspace has its own:

- Name, command alias, identifying mark, purpose, and accent color
- Public GitHub repository connection
- Project queue and completion progress
- Focus timer, linked task, and completed-session count
- Saved browser-tab session
- Markdown notes, quick links, repository favorites, card layout, and visibility settings

Existing DevTab 2.0 data is migrated automatically into the first workspace.

### Pick up where you left off

The browser extension can capture the web tabs in the current window and restore them later. This makes one workspace a complete launch point for a project: repository, localhost, documentation, designs, and other tools.

The deployed website provides a manual URL list and can restore those pages when pop-ups are allowed. Window-wide capture is available only in the extension because regular websites cannot read the browser's tabs.

### Project context

Connect any public GitHub repository using `owner/repository` or its GitHub URL. DevTab shows:

- Repository language, update time, and star count
- Open issue and pull-request counts
- Recent commits
- Latest published release
- A cached snapshot when the network is unavailable

Requests use the public GitHub REST API without a personal access token.

### Tasks and focus

- Add, complete, filter, and clear project tasks
- See task progress in both the queue and workspace overview
- Run 15, 25, or 50-minute focus blocks, or choose a custom duration from a command
- Link a focus block to an open task
- Pause and resume timers across page reloads and workspace switches
- Track completed focus blocks per workspace

## Search and command launcher

Search with Google, DuckDuckGo, GitHub, or MDN, paste a URL, or open the command launcher with `Ctrl/Cmd + K`.

| Command | Example | Action |
| --- | --- | --- |
| `workspace <name>` | `workspace devtab` | Switch project context |
| `launch <name>` | `launch portfolio` | Switch and restore saved tabs |
| `task <text>` | `task test mobile layout` | Add a workspace task |
| `done <task>` | `done mobile layout` | Complete a matching task |
| `focus <minutes>` | `focus 25` | Start a 5–120 minute focus block |
| `focus <action>` | `focus reset` | Start, pause, or reset the timer |
| `gh <query>` | `gh DevTab` | Search GitHub |
| `mdn <query>` | `mdn grid` | Search MDN |
| `open <link>` | `open Vite` | Open a saved quick link |
| `note <text>` | `note document the release` | Append to a pinned note |
| `theme <value>` | `theme amber` | Change mode or workspace accent |
| `calc <expression>` | `calc (48 * 12) / 3` | Calculate and copy a result |

## Other dashboard features

### Notes and links

- Create, search, pin, delete, and download multiple Markdown notes
- Preview headings, bullets, code blocks, and interactive checklists
- Automatically save notes in the active workspace
- Add, edit, delete, and reorder quick links

### GitHub profile and weather

- View Caleb's public profile, repositories, favorites, and recent activity
- Use device geolocation or search for a weather location manually
- Choose automatic, Fahrenheit, or Celsius units
- Continue showing cached GitHub and weather data when offline

Weather and city search are provided by [Open-Meteo](https://open-meteo.com/). Automatic location names use [BigDataCloud](https://www.bigdatacloud.com/).

### Customization and portability

- Reorder cards by dragging their handles or using `Alt + Arrow`
- Show or hide cards independently in every workspace
- Choose a workspace accent and global dark, light, or system mode
- Adjust background intensity, contrast, motion, and search provider
- Duplicate a workspace as a reusable project template
- Export or import the complete versioned dashboard as JSON

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `N` | Show and focus notes |
| `T` | Toggle dark or light mode |
| `Ctrl/Cmd + K` | Open the command launcher |
| `Ctrl/Cmd + 1–9` | Switch to a workspace by position |
| `Alt + Arrow` | Move a dashboard card while its handle is focused |

Single-key shortcuts do not run while typing in an input, text area, or select.

## Technologies

- Semantic HTML5
- Custom responsive CSS
- Vanilla JavaScript modules
- Browser `localStorage`, Cache API, Service Worker API, and extension Tabs API
- [Vite](https://vite.dev/) for development and builds
- Manifest V3 browser extension
- Node's built-in test runner
- Lighthouse CI
- GitHub Actions and GitHub Pages

## Local development

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer
- npm, included with Node.js

### Setup

```bash
git clone https://github.com/Caleb-Guyer/DevTab.git
cd DevTab
npm install
npm run dev
```

Open the address printed in the terminal, normally `http://localhost:5173`.

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd` in place of `npm`.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run state migration, validation, command, URL, calculator, and Markdown tests |
| `npm run build` | Create the production website in `dist/` |
| `npm run build:extension` | Create the unpacked extension in `dist-extension/` |
| `npm run preview` | Preview the production website locally |
| `npm run audit` | Run Lighthouse CI checks |
| `npm run check` | Run tests and the production build |
| `npm run assets` | Regenerate icons, the social preview, and demo media |

## Install as a browser extension

1. Run `npm install` and `npm run build:extension`.
2. Open the browser's extension management page.
3. Enable developer mode.
4. Choose **Load unpacked** and select `dist-extension`.
5. Open a new tab and create or select a workspace.
6. Use **Capture window** in the Saved tab session card when you want to save the current web tabs.

Chrome and Edge use `chrome://extensions`. Firefox can temporarily load the generated `manifest.json` from `about:debugging`.

The extension requests:

- `geolocation` for automatic weather
- `tabs` to capture titles and URLs from the current browser window and restore them
- Host access limited to the public weather, reverse-geocoding, and GitHub APIs used by the dashboard

## Data and privacy

- Workspaces, tasks, notes, links, settings, focus history, and saved tab URLs remain in browser storage.
- Captured tab sessions are never sent to a server by DevTab.
- Exported backups are assembled locally and downloaded by the browser.
- Precise location is requested only when automatic weather is selected.
- GitHub integrations read only public information and require no authentication.
- No analytics or tracking scripts are included.

## Quality checks and deployment

The quality workflow runs automated tests, website and extension builds, and Lighthouse thresholds on pushes and pull requests. Pushes to `main` deploy the production `dist/` directory to GitHub Pages through `.github/workflows/deploy-pages.yml`.

## Project status

DevTab 3.0 is a complete local-first project workspace and new-tab extension. Its central idea is simple: select a project and recover the context needed to continue working.
