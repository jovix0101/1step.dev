# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interactive terminal-style personal website for Jovix (1step.dev). It's a static HTML/CSS/JS site that simulates a Linux terminal in the browser with a unique "power button" startup experience.

### Key Features
- **Power-on animation**: Users hold a power button for 1 second to "boot" the terminal
- **Interactive terminal**: Full command-line interface with history, tab completion, and themes
- **Dual versions**: V2 (`index.html`) is the current default with a control room layout; V1 (`index-v2.html`) is the simpler original
- **Theme system**: 4 built-in themes (dracula, gruvbox, matrix, solarized)
- **Virtual filesystem**: `cd`, `ls`, `cat` commands work with a simulated directory structure

## File Structure

```
├── index.html          # Default entry point (V2 - control room layout)
├── index-v2.html       # V1 - simpler single-page terminal
├── main.js             # Core terminal logic: boot sequence, input handling, command history
├── commands.js         # Command definitions and virtual filesystem
├── ui.js               # Theme system and output rendering utilities
├── style-v2.css        # Styles for V2 (control room layout)
├── style.css           # Styles for V1 (original terminal-only layout)
├── avatar.png          # User avatar displayed by `avatar` command
└── podcast.wav         # Audio asset (unused)
```

## Architecture

### Module Responsibilities

**main.js**
- Power button hold-to-boot interaction (1s threshold with RGB light strip animation)
- Terminal state management (command history, current directory, input draft persistence)
- Tab completion engine (commands and file paths)
- Inline command suggestions (ghost text completion)
- Keyboard shortcuts: Ctrl+C (interrupt), ArrowUp/Down (history), Tab (completion)
- Clipboard integration (copy on select, paste on right-click)
- Session persistence: history, current path, and draft input saved to localStorage

**commands.js**
- `commands` object: maps command names to handler functions
- `fileSystem` object: virtual directory structure (`~` and `~/projects`)
- `resolvePath()`: path normalization handling `.`, `..`, `~`, and relative paths
- Commands: help, whoami, socials, skills, projects, contact, theme, ls, cd, cat, sudo, fortune, etc.

**ui.js**
- `themes` object: CSS custom property definitions for each theme
- `applyTheme()`: applies theme and persists to localStorage
- `appendOutput()`: renders command output with typewriter effect for plain text
- `escapeHtml()`: sanitizes user input for safe HTML output

### Key State Variables (main.js)

```javascript
terminalState.currentPath    // Current directory (~ or ~/projects)
commandHistory               // Array of executed commands (persisted)
historyIndex                 // Navigation position in history
completionSession            // Tab completion state (type, entries, index)
isTransitioningState         // Power/boot animation in progress
```

### Virtual Filessystem Structure

```
~/
  ├── about.txt      -> maps to `whoami` command
  ├── socials.json   -> maps to `socials` command
  ├── skills.md      -> maps to `skills` command
  ├── contact.info   -> maps to `contact` command
  ├── README.md      -> static content
  └── projects/      -> directory containing project entries
```

## Development Workflow

### Local Development

This is a static site with no build step. Serve with any static file server:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (if npx serve is available)
npx serve .

# PHP
php -S localhost:8080
```

Then open `http://localhost:8080` (serves `index.html` by default).

### Testing Changes

1. Edit files directly
2. Hard refresh browser (Cmd+Shift+R on macOS, Ctrl+Shift+R on Windows/Linux)
3. May need to clear localStorage if testing theme/path persistence issues

### Version Switching

To switch default versions, edit the HTML files or update server configuration:
- V2 (current default): `index.html` = control room layout
- V1 (original): `index-v2.html` = terminal-only minimalist

## Common Tasks

### Adding a New Command

Edit `commands.js`:

```javascript
export const commands = {
  // ... existing commands
  mynewcmd: (args) => {
    return 'Output here';
  }
};
```

For filesystem integration, add entries to `fileSystem` object.

### Adding a New Theme

Edit `ui.js` - add to `themes` object with CSS custom properties:

```javascript
export const themes = {
  // ... existing themes
  mytheme: {
    '--background-color': '#...',
    '--window-bg-color': '#...',
    // ... all 21 required properties
  }
};
```

### Modifying Terminal Behavior

- Boot/power animation: `main.js` - `handleInteractionStart()`, `triggerFullPowerOn()`
- Prompt format: `main.js` - `createPromptHtml()`
- Command processing: `main.js` - `processCommand()`
- Tab completion logic: `main.js` - `buildCommandCompletionSession()`, `buildPathCompletionSession()`

### Session Persistence Keys

All stored in localStorage:
- `terminalTheme`: current theme name
- `terminalHistory`: JSON array of command strings
- `terminalCurrentPath`: current directory path
- `terminalInputDraft`: unsaved input text

Max history entries: 200 (`MAX_PERSISTED_HISTORY`)
