
export const themes = {
  void: {
    '--background-color': '#0a0a0f',
    '--window-bg-color': '#0a0a0f',
    '--text-color': '#f0f0f5',
    '--prompt-user-color': '#00f0ff',
    '--prompt-path-color': '#8b5cf6',
    '--prompt-symbol-color': '#f0f0f5',
    '--command-echo-color': '#f0f0f5',
    '--output-color': '#f0f0f5',
    '--error-color': '#ff5555',
    '--link-color': '#00f0ff',
    '--header-bg': 'rgba(10, 10, 15, 0.6)',
    '--highlight-color': '#fbbf24',
    '--scrollbar-thumb-color': 'rgba(136, 136, 160, 0.3)',
    '--scrollbar-track-color': 'transparent',
    '--caret-color': '#00f0ff',
    '--font-size': '0.875em',
    '--footer-text-color': '#55556a',
    '--power-prompt-text-color': '#8b5cf6'
  },
  amber: {
    '--background-color': '#0f0a05',
    '--window-bg-color': '#0f0a05',
    '--text-color': '#f5efe0',
    '--prompt-user-color': '#fbbf24',
    '--prompt-path-color': '#f97316',
    '--prompt-symbol-color': '#f5efe0',
    '--command-echo-color': '#f5efe0',
    '--output-color': '#f5efe0',
    '--error-color': '#ef4444',
    '--link-color': '#fbbf24',
    '--header-bg': 'rgba(15, 10, 5, 0.6)',
    '--highlight-color': '#f472b6',
    '--scrollbar-thumb-color': 'rgba(251, 191, 36, 0.2)',
    '--scrollbar-track-color': 'transparent',
    '--caret-color': '#fbbf24',
    '--font-size': '0.875em',
    '--footer-text-color': '#8a7a5a',
    '--power-prompt-text-color': '#f97316'
  },
  ice: {
    '--background-color': '#f0f4f8',
    '--window-bg-color': '#f0f4f8',
    '--text-color': '#1a202c',
    '--prompt-user-color': '#0077b6',
    '--prompt-path-color': '#6366f1',
    '--prompt-symbol-color': '#1a202c',
    '--command-echo-color': '#1a202c',
    '--output-color': '#1a202c',
    '--error-color': '#dc2626',
    '--link-color': '#0077b6',
    '--header-bg': 'rgba(240, 244, 248, 0.8)',
    '--highlight-color': '#d97706',
    '--scrollbar-thumb-color': 'rgba(26, 32, 44, 0.15)',
    '--scrollbar-track-color': 'transparent',
    '--caret-color': '#0077b6',
    '--font-size': '0.875em',
    '--footer-text-color': '#94a3b8',
    '--power-prompt-text-color': '#6366f1'
  },
  mono: {
    '--background-color': '#0a0a0a',
    '--window-bg-color': '#0a0a0a',
    '--text-color': '#e0e0e0',
    '--prompt-user-color': '#ffffff',
    '--prompt-path-color': '#b0b0b0',
    '--prompt-symbol-color': '#e0e0e0',
    '--command-echo-color': '#e0e0e0',
    '--output-color': '#e0e0e0',
    '--error-color': '#ff4444',
    '--link-color': '#ffffff',
    '--header-bg': 'rgba(10, 10, 10, 0.6)',
    '--highlight-color': '#ffffff',
    '--scrollbar-thumb-color': 'rgba(224, 224, 224, 0.15)',
    '--scrollbar-track-color': 'transparent',
    '--caret-color': '#ffffff',
    '--font-size': '0.875em',
    '--footer-text-color': '#666666',
    '--power-prompt-text-color': '#b0b0b0'
  }
};

export function applyTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
      for (const [variable, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(variable, value);
      }
      localStorage.setItem('terminalTheme', themeName);
      return `Theme switched to <span class="output-highlight">${themeName}</span>.`;
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
    if (terminalBody) {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }
}
