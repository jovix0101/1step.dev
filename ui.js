
export const themes = {
  dracula: {
    '--background-color': '#282a36',
    '--window-bg-color': '#1e1f29',
    '--text-color': '#f8f8f2',
    '--prompt-user-color': '#50fa7b',
    '--prompt-path-color': '#bd93f9',
    '--prompt-symbol-color': '#f8f8f2',
    '--command-echo-color': '#f8f8f2',
    '--output-color': '#f8f8f2',
    '--error-color': '#ff5555',
    '--link-color': '#8be9fd',
    '--header-bg': '#1c1d26',
    '--highlight-color': '#f1fa8c',
    '--scrollbar-thumb-color': '#44475a',
    '--scrollbar-track-color': '#282a36',
    '--caret-color': '#f8f8f2',
    '--font-size': '1em',
    '--footer-text-color': '#7a7c8a',
    '--power-prompt-text-color': '#bd93f9'
  },
  gruvbox: {
    '--background-color': '#282828',
    '--window-bg-color': '#1d2021',
    '--text-color': '#ebdbb2',
    '--prompt-user-color': '#b8bb26',
    '--prompt-path-color': '#d3869b',
    '--prompt-symbol-color': '#ebdbb2',
    '--command-echo-color': '#ebdbb2',
    '--output-color': '#ebdbb2',
    '--error-color': '#fb4934',
    '--link-color': '#83a598',
    '--header-bg': '#32302f',
    '--highlight-color': '#fabd2f',
    '--scrollbar-thumb-color': '#504945',
    '--scrollbar-track-color': '#282828',
    '--caret-color': '#ebdbb2',
    '--font-size': '1em',
    '--footer-text-color': '#7c6f64',
    '--power-prompt-text-color': '#d3869b'
  },
  matrix: {
    '--background-color': '#000000',
    '--window-bg-color': '#050505',
    '--text-color': '#00ff00',
    '--prompt-user-color': '#33ff33',
    '--prompt-path-color': '#00cc00',
    '--prompt-symbol-color': '#00ff00',
    '--command-echo-color': '#33ff33',
    '--output-color': '#00ff00',
    '--error-color': '#cc0000',
    '--link-color': '#00dddd',
    '--header-bg': '#0a0a0a',
    '--highlight-color': '#55ff55',
    '--scrollbar-thumb-color': '#003300',
    '--scrollbar-track-color': '#000000',
    '--caret-color': '#00ff00',
    '--font-size': '1.05em',
    '--footer-text-color': '#005000',
    '--power-prompt-text-color': '#00cc00'
  },
  solarized: {
    '--background-color': '#fdf6e3',
    '--window-bg-color': '#fdf6e3',
    '--text-color': '#657b83',
    '--prompt-user-color': '#2aa198',
    '--prompt-path-color': '#b58900',
    '--prompt-symbol-color': '#657b83',
    '--command-echo-color': '#586e75',
    '--output-color': '#657b83',
    '--error-color': '#dc322f',
    '--link-color': '#268bd2',
    '--header-bg': '#fdf6e3',
    '--highlight-color': '#b58900',
    '--scrollbar-thumb-color': '#93a1a1',
    '--scrollbar-track-color': '#eee8d5',
    '--caret-color': '#657b83',
    '--font-size': '1em',
    '--footer-text-color': '#93a1a1',
    '--power-prompt-text-color': '#268bd2'
  }
};

export function applyTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
      for (const [variable, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(variable, value);
      }
      if (theme['--background-color']) {
        document.body.style.backgroundColor = theme['--background-color'];
      }
      localStorage.setItem('terminalTheme', themeName);
      return `Theme set to <span class="output-highlight">${themeName}</span>.`;
    }
    return `Theme '${themeName}' not found. Available: ${Object.keys(themes)
      .map((t) => `<span class="output-highlight">${t}</span>`)
      .join(', ')}.`;
}

export function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
}

export function appendOutput(htmlContent, type = 'output') {
    const terminalBody = document.getElementById('terminal-body');
    const outputLine = document.createElement('div');
    if (type === 'ascii-art' || type === 'output-avatar') {
      outputLine.className = type;
    } else {
      outputLine.className = 'output';
      if (type === 'output-error') outputLine.classList.add('output-error');
    }

    if (/<[a-z][\s\S]*>/i.test(htmlContent) || type === 'ascii-art' || type === 'output-avatar') {
      outputLine.innerHTML = htmlContent;
    } else {
        let i = 0;
        const speed = 15;
        function typeWriter() {
            if (i < htmlContent.length) {
                outputLine.textContent += htmlContent.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        typeWriter();
    }

    const currentInputLineDiv = document.getElementById('command-input-container');
    if (currentInputLineDiv && currentInputLineDiv.parentNode === terminalBody) {
      terminalBody.insertBefore(outputLine, currentInputLineDiv);
    } else {
      terminalBody.appendChild(outputLine);
    }
}

export function scrollToBottom() {
    const terminalBody = document.getElementById('terminal-body');
    terminalBody.scrollTop = terminalBody.scrollHeight;
}
