const terminalElement = document.getElementById('terminal');
const terminalBody = document.getElementById('terminal-body');
const terminalTitleElement = document.querySelector('#terminal-header .title');
const developerInfoFooter = document.getElementById('developer-info');

const powerButtonArea = document.getElementById('power-button-area');
const powerOnButton = document.getElementById('power-on-btn');
const lightStripCircle = document.getElementById('power-button-light-strip-circle');
const powerOnPrompt = document.getElementById('power-on-prompt');

let commandInput;
let currentInputLineDiv;
let commandHistory = [];
let historyIndex = -1;
let isTransitioningState = false;
let isInteractionHeld = false;
let powerOnTimeoutId = null;
let thresholdMetForPowerOn = false; // True if 1s passed, ready for power on if released or timeout fires while held

const username = 'jovix';
const hostname = '1step.dev';
let currentPath = '~';

const fileSystem = {
  '~': {
    'about.txt': { type: 'file', contentCmd: 'whoami' },
    'socials.json': { type: 'file', contentCmd: 'socials' },
    'skills.md': { type: 'file', contentCmd: 'skills' },
    'projects/': { type: 'directory' }, // Keep as directory
    'contact.info': { type: 'file', contentCmd: 'contact' },
    'README.md': { type: 'file', content: `Welcome to ${username}@${hostname}!\nType 'help' for commands. Use 'ls' to explore.` },
  },
  '~/projects': {
    'this-portfolio.site': {
      type: 'file',
      content: "You're looking at it! An interactive terminal-style personal website.\nBuilt with HTML, CSS, and Vanilla JavaScript.",
      url: '#', // Link to current page or a specific section
    },
    'project-alpha.link': {
      type: 'file',
      content: 'Project Alpha: A cutting-edge AI research platform.',
      url: 'https://example.com/project-alpha',
    },
    'beta-suite.app': {
      type: 'file',
      content: 'Beta Suite: A collection of productivity tools.',
      url: 'https://example.com/beta-suite',
    },
    // Add more projects here
  },
};

const themes = {
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
    '--power-prompt-text-color': '#bd93f9',
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
    '--power-prompt-text-color': '#d3869b',
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
    '--power-prompt-text-color': '#00cc00',
  },
};
const fortunes = [
  'Your web browser is hiding a cookie for you.',
  'To iterate is human, to recurse divine.',
  'The code is strong with this one.',
  'Coffee. Code. Sleep. Repeat.',
  "There are 10 types of people in the world: those who understand binary, and those who don't.",
  'A good programmer looks both ways before crossing a one-way street.',
  "If at first you don't succeed, call it version 1.0.",
  'Keep calm and code on.',
  'The best error message is the one that never shows up.',
  'Have you tried turning it off and on again?',
];

const lightStripRadius = parseFloat(lightStripCircle.getAttribute('r'));
const lightStripCircumference = 2 * Math.PI * lightStripRadius;

function initializePageOnLoad() {
  const savedTheme = localStorage.getItem('terminalTheme');
  applyTheme(savedTheme && themes[savedTheme] ? savedTheme : 'dracula');

  terminalElement.style.display = 'none';
  terminalElement.classList.remove('powering-on', 'shutting-down');

  powerButtonArea.style.display = 'flex';
  powerButtonArea.classList.add('visible');
  powerOnButton.classList.remove('interaction-held', 'threshold-met');
  developerInfoFooter.style.opacity = '0.7';

  resetLightStrip();

  powerOnButton.addEventListener('mousedown', handleInteractionStart);
  document.addEventListener('mouseup', handleInteractionEnd);

  document.addEventListener('keydown', handleGlobalKeyDown);
  document.addEventListener('keyup', handleGlobalKeyUp);

  terminalBody.addEventListener('mouseup', handleTerminalSelectionCopy);
  terminalBody.addEventListener('contextmenu', handleTerminalPaste);
}

function resetLightStrip() {
  lightStripCircle.classList.remove('retracting', 'threshold-met', 'active');
  lightStripCircle.style.transition = 'none';
  lightStripCircle.style.stroke = 'var(--power-light-strip-color)';
  lightStripCircle.style.strokeDasharray = lightStripCircumference;
  lightStripCircle.style.strokeDashoffset = lightStripCircumference;
  void lightStripCircle.offsetWidth;
  lightStripCircle.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.35, 0, 0.25, 1)';
}

function handleInteractionStart(event) {
  if (isInteractionHeld || isTransitioningState || terminalElement.style.display !== 'none') {
    return;
  }
  if (!powerButtonArea.classList.contains('visible')) return;

  isInteractionHeld = true;
  thresholdMetForPowerOn = false;
  powerOnButton.classList.add('interaction-held');
  powerOnButton.classList.remove('threshold-met');

  lightStripCircle.classList.remove('retracting');
  lightStripCircle.classList.add('active');
  lightStripCircle.style.strokeDashoffset = 0;

  powerOnTimeoutId = setTimeout(() => {
    if (isInteractionHeld) {
      thresholdMetForPowerOn = true;
      powerOnButton.classList.add('threshold-met');
      triggerFullPowerOn(); // Power on directly when threshold is met, even if held
    }
  }, 1000);
}

function handleInteractionEnd(event) {
  if (!isInteractionHeld) {
    return;
  }

  const wasHeldForPowerOn = thresholdMetForPowerOn; // Capture before reset
  isInteractionHeld = false;
  powerOnButton.classList.remove('interaction-held');

  clearTimeout(powerOnTimeoutId);
  powerOnTimeoutId = null;

  if (wasHeldForPowerOn) {
    // triggerFullPowerOn was already called by the timeout or will be if this is a quick release after timeout
    // The visual flash will play out.
  } else {
    // Retract light strip if threshold wasn't met
    lightStripCircle.classList.add('retracting');
    lightStripCircle.classList.remove('active');
    lightStripCircle.style.strokeDashoffset = lightStripCircumference;
    setTimeout(() => {
      if (!isInteractionHeld && !thresholdMetForPowerOn) {
        lightStripCircle.style.stroke = 'var(--power-light-strip-color)';
        powerOnButton.classList.remove('threshold-met');
      }
    }, 300);
  }
  thresholdMetForPowerOn = false;
}

function handleGlobalKeyDown(event) {
  if (event.code === 'Space' && powerButtonArea.classList.contains('visible') && !isInteractionHeld && !isTransitioningState) {
    event.preventDefault();
    handleInteractionStart(event);
  }
}
function handleGlobalKeyUp(event) {
  if (event.code === 'Space' && isInteractionHeld) {
    handleInteractionEnd(event);
  }
}

async function handleTerminalSelectionCopy(event) {
  if (event.button !== 0) return; // Only for left-click mouseup

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText.length > 0 && terminalBody.contains(selection.anchorNode)) {
    try {
      await navigator.clipboard.writeText(selectedText);
      // console.log('Text copied to clipboard:', selectedText);
      // Optional: Add a brief visual feedback for copy
      const tempMsg = document.createElement('div');
      tempMsg.textContent = 'Copied!';
      tempMsg.style.position = 'fixed';
      tempMsg.style.bottom = '20px';
      tempMsg.style.left = '50%';
      tempMsg.style.transform = 'translateX(-50%)';
      tempMsg.style.padding = '5px 10px';
      tempMsg.style.backgroundColor = 'var(--prompt-user-color)';
      tempMsg.style.color = 'var(--window-bg-color)';
      tempMsg.style.borderRadius = '4px';
      tempMsg.style.opacity = '0';
      tempMsg.style.transition = 'opacity 0.3s';
      document.body.appendChild(tempMsg);
      setTimeout(() => (tempMsg.style.opacity = '1'), 10);
      setTimeout(() => {
        tempMsg.style.opacity = '0';
        setTimeout(() => tempMsg.remove(), 300);
      }, 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
}

async function handleTerminalPaste(event) {
  event.preventDefault(); // Prevent default context menu
  if (!commandInput || commandInput.disabled) return;

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      const start = commandInput.selectionStart;
      const end = commandInput.selectionEnd;
      const currentValue = commandInput.value;
      commandInput.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      commandInput.selectionStart = commandInput.selectionEnd = start + text.length;
      focusInput(); // Re-focus and move cursor
    }
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
    appendOutput('Clipboard paste failed. Browser permission might be needed or clipboard is empty.', 'output-error');
  }
}

function triggerFullPowerOn() {
  if (isTransitioningState && terminalElement.style.display !== 'none') return;

  isTransitioningState = true;
  powerOnButton.classList.remove('threshold-met');
  lightStripCircle.classList.remove('active');

  powerButtonArea.classList.remove('visible');
  const indicatorFadeOutDuration = 250;

  setTimeout(() => {
    powerButtonArea.style.display = 'none';

    terminalElement.style.maxHeight = '';
    terminalElement.style.display = 'flex';
    terminalElement.classList.remove('shutting-down');
    terminalElement.classList.add('powering-on');
    developerInfoFooter.style.opacity = '0.3';

    const handleTerminalAnimationEnd = () => {
      terminalElement.classList.remove('powering-on');
      initializeTerminalContent();
      isTransitioningState = false;
      isInteractionHeld = false;
      thresholdMetForPowerOn = false;
      terminalElement.removeEventListener('animationend', handleTerminalAnimationEnd);
    };
    terminalElement.addEventListener('animationend', handleTerminalAnimationEnd);
  }, indicatorFadeOutDuration);
}

function createPromptHtml() {
  return `<span class="prompt"><span class="prompt-user">${username}@${hostname}</span>:<span class="prompt-path">${currentPath}</span><span class="prompt-symbol">$</span></span>`;
}
function updateTerminalTitle() {
  if (terminalTitleElement) {
    terminalTitleElement.textContent = `${username}@${hostname}: ${currentPath} (web-shell)`;
  }
}
function focusInput() {
  if (commandInput && document.activeElement !== commandInput) {
    commandInput.focus();
  }
}

function createInputLine() {
  currentInputLineDiv = document.createElement('div');
  currentInputLineDiv.className = 'terminal-line';
  currentInputLineDiv.id = 'command-input-container';
  currentInputLineDiv.innerHTML = `
            ${createPromptHtml()}
            <input type="text" id="command-input" spellcheck="false" autocomplete="off">
        `;
  terminalBody.appendChild(currentInputLineDiv);
  commandInput = currentInputLineDiv.querySelector('#command-input');
  commandInput.addEventListener('keydown', handleKeydown);
  updateTerminalTitle();
  focusInput();
}

function handleKeydown(event) {
  if (isTransitioningState) {
    event.preventDefault();
    return;
  }

  if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
    event.preventDefault();
    if (commandInput && !commandInput.disabled) {
      const currentPrompt = createPromptHtml();
      const currentCommand = commandInput.value;

      const interruptLine = document.createElement('div');
      interruptLine.className = 'terminal-line';
      interruptLine.innerHTML = `${currentPrompt}<span class="command-echo">${escapeHtml(currentCommand)}^C</span>`;

      if (currentInputLineDiv && currentInputLineDiv.parentNode === terminalBody) {
        terminalBody.replaceChild(interruptLine, currentInputLineDiv);
      } else {
        appendOutput(interruptLine.innerHTML);
      }

      createInputLine();
      scrollToBottom();
    }
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const commandStr = commandInput.value.trim();

    commandInput.removeEventListener('keydown', handleKeydown);
    commandInput.disabled = true;

    const commandEchoLine = document.createElement('div');
    commandEchoLine.className = 'terminal-line';
    commandEchoLine.innerHTML = `${createPromptHtml()}<span class="command-echo">${escapeHtml(commandStr)}</span>`;
    terminalBody.replaceChild(commandEchoLine, currentInputLineDiv);

    if (commandStr) {
      if (commandHistory.length === 0 || commandHistory[0] !== commandStr) {
        commandHistory.unshift(commandStr);
      }
      historyIndex = -1;
      processCommand(commandStr);
    }

    const lowerCmd = commandStr.toLowerCase();
    if (lowerCmd !== 'shutdown' && lowerCmd !== 'reboot' && !isTransitioningState) {
      createInputLine();
    }
    scrollToBottom();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
      historyIndex++;
      commandInput.value = commandHistory[historyIndex];
      commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      commandInput.value = commandHistory[historyIndex];
      commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
    } else if (historyIndex <= 0) {
      historyIndex = -1;
      commandInput.value = '';
    }
  } else if (event.key === 'Tab') {
    event.preventDefault();
    const currentText = commandInput.value;
    const [cmdPart, ...restArgs] = currentText.split(' ');
    const currentArg = restArgs.length > 0 ? restArgs[restArgs.length - 1] : '';

    if (restArgs.length === 0 && !currentText.includes(' ')) {
      const possibleCompletions = Object.keys(commands).filter((cmd) => cmd.startsWith(cmdPart.toLowerCase()));
      if (possibleCompletions.length === 1) {
        commandInput.value = possibleCompletions[0] + ' ';
        commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
      } else if (possibleCompletions.length > 1) {
        appendOutput('Possible commands: \n' + possibleCompletions.map((c) => `<span class="output-highlight">${c}</span>`).join('  '));
        scrollToBottom();
      }
    } else if (['cd', 'ls', 'cat'].includes(cmdPart.toLowerCase()) && (currentText.endsWith(' ') || currentArg)) {
      const pathPrefix = currentArg;
      const parentPath = resolvePath(
        pathPrefix.substring(0, pathPrefix.lastIndexOf('/') + 1) || (cmdPart.toLowerCase() === 'cd' || cmdPart.toLowerCase() === 'ls' ? currentPath : '.')
      );
      const baseName = pathPrefix.substring(pathPrefix.lastIndexOf('/') + 1);
      const dirToList = fileSystem[parentPath];

      if (dirToList) {
        const possibleFiles = Object.keys(dirToList).filter((item) => item.startsWith(baseName));
        if (possibleFiles.length === 1) {
          const completion = possibleFiles[0];
          const fullPathPrefix = pathPrefix.substring(0, pathPrefix.lastIndexOf('/') + 1);
          commandInput.value = `${cmdPart} ${fullPathPrefix}${completion}${dirToList[completion].type === 'directory' ? '' : ' '}`;
          commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
        } else if (possibleFiles.length > 1) {
          appendOutput(
            `Possible completions in ${parentPath}:\n` +
              possibleFiles.map((f) => `<span class="${dirToList[f].type === 'directory' ? 'output-path' : 'output-highlight'}">${f}</span>`).join('  ')
          );
          scrollToBottom();
        }
      }
    }
  }
}
function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
}
function appendOutput(htmlContent, type = 'output') {
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
    outputLine.textContent = htmlContent;
  }

  if (currentInputLineDiv && currentInputLineDiv.parentNode === terminalBody) {
    terminalBody.insertBefore(outputLine, currentInputLineDiv);
  } else {
    terminalBody.appendChild(outputLine);
  }
}
function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (theme) {
    for (const [variable, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(variable, value);
    }
    if (theme['--background-color']) {
      document.body.style.backgroundColor = theme['--background-color'];
    }
    localStorage.setItem('terminalTheme', themeName); // Save theme
    return `Theme set to <span class="output-highlight">${themeName}</span>.`;
  }
  return `Theme '${themeName}' not found. Available: ${Object.keys(themes)
    .map((t) => `<span class="output-highlight">${t}</span>`)
    .join(', ')}.`;
}

function powerOff(isRebooting = false) {
  if (isTransitioningState && !isRebooting) return;
  isTransitioningState = true;

  clearTimeout(powerOnTimeoutId);
  powerOnTimeoutId = null;
  isInteractionHeld = false;
  thresholdMetForPowerOn = false;
  powerOnButton.classList.remove('interaction-held', 'threshold-met');

  developerInfoFooter.style.opacity = '0.7';

  if (commandInput) commandInput.disabled = true;
  appendOutput(`System ${isRebooting ? 'rebooting' : 'shutting down'}...`, 'output-highlight');
  scrollToBottom();

  terminalElement.classList.remove('powering-on');
  terminalElement.classList.add('shutting-down');

  const handleAnimationEnd = () => {
    terminalElement.style.display = 'none';

    powerButtonArea.style.display = 'flex';
    powerButtonArea.classList.add('visible');
    resetLightStrip();

    terminalElement.removeEventListener('animationend', handleAnimationEnd);

    if (isRebooting) {
      isTransitioningState = false;
    } else {
      isTransitioningState = false;
    }
  };
  terminalElement.addEventListener('animationend', handleAnimationEnd);
}

function initializeTerminalContent() {
  terminalBody.innerHTML = '';
  commandHistory = [];
  historyIndex = -1;
  currentPath = '~';

  commands.banner();
  createInputLine();
  scrollToBottom();
  updateTerminalTitle();
}

const commands = {
  help: () => `
Available commands:
  <span class="output-highlight">shutdown</span>      - Simulate shutting down the terminal
  <span class="output-highlight">reboot</span>        - Simulate rebooting the terminal
  <span class="output-highlight">whoami</span>        - Display my basic information
  <span class="output-highlight">socials</span>       - Show my social media links
  <span class="output-highlight">skills</span>        - List my technical skills
  <span class="output-highlight">projects</span>      - Show some of my projects (see also: <span class="output-highlight">ls ~/projects</span>)
  <span class="output-highlight">contact</span>       - How to reach me
  <span class="output-highlight">avatar</span>        - Display my avatar
  <span class="output-highlight">banner</span>        - Display the welcome banner again
  <span class="output-highlight">date</span>          - Display the current date and time
  <span class="output-highlight">echo [text]</span>   - Print text to the terminal
  <span class="output-highlight">clear</span>         - Clear the terminal screen
  <span class="output-highlight">history</span>       - Show command history
  <span class="output-highlight">help</span>          - Show this help message (you are here!)
  <span class="output-highlight">github</span>        - Open my GitHub profile
  <span class="output-highlight">coffee</span>        - Support me with a coffee!
  <span class="output-highlight">donate</span>        - Alias for 'coffee'
  <span class="output-highlight">theme [name]</span>  - Change terminal theme. Use 'theme' to list.
  <span class="output-highlight">ls [path]</span>     - List directory contents
  <span class="output-highlight">cd [path]</span>     - Change directory
  <span class="output-highlight">cat [file]</span>    - Display file contents
  <span class="output-highlight">open [url]</span>    - Open a URL in a new tab
  <span class="output-highlight">search [query]</span>- Search Google for the query
  <span class="output-highlight">sudo [cmd]</span>    - Heh. Try it.
  <span class="output-highlight">fortune</span>       - Display a random insightful (or not) message
`,
  avatar: () => {
    const avatarUrl = './avatar.png';
    return `<div class="output-avatar"><img src="${avatarUrl}" alt="${username}'s Avatar"></div>Displaying avatar...`;
  },
  banner: () => {
    const bannerArt = `
    /\_/\  
   ( o.o ) 
    > ^ <  
   बादशाह
Welcome to ${username}@${hostname}!
Type '<span class="output-highlight">help</span>' to see available commands.
`;
    appendOutput(bannerArt, 'ascii-art');
    return '';
  },
  clear: () => {
    terminalBody.innerHTML = '';
    return '';
  },
  theme: (args) => {
    if (args.length === 0) {
      let currentThemeName = 'dracula';
      const currentBgColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim();
      for (const name in themes) {
        if (themes[name]['--background-color'] === currentBgColor) {
          currentThemeName = name;
          break;
        }
      }
      return `Current theme: <span class="output-highlight">${currentThemeName}</span>. Available: ${Object.keys(themes)
        .map((t) => `<span class="output-highlight">${t}</span>`)
        .join(', ')}. \nUsage: theme <themename>`;
    }
    return applyTheme(args[0].toLowerCase());
  },
  ls: (args) => {
    const pathToLs = args[0] ? resolvePath(args[0]) : currentPath;
    const directory = fileSystem[pathToLs];
    if (directory && typeof directory === 'object') {
      let output = `Contents of <span class="output-path">${pathToLs}</span>:\n`;
      Object.keys(directory).forEach((item) => {
        const itemDetails = directory[item];
        const isDir = itemDetails.type === 'directory' || item.endsWith('/');
        output += `  <span class="${isDir ? 'output-path' : 'output-highlight'}">${item}${isDir && !item.endsWith('/') ? '/' : ''}</span>\n`;
      });
      return output.trim();
    }
    return `ls: cannot access '${args[0] || pathToLs}': No such file or directory`;
  },
  cd: (args) => {
    if (args.length === 0 || args[0] === '~' || args[0] === '') {
      currentPath = '~';
      updateTerminalTitle();
      return ``;
    }
    const targetDirArg = args[0];
    let newPathCandidate = resolvePath(targetDirArg);

    if (fileSystem[newPathCandidate] && typeof fileSystem[newPathCandidate] === 'object') {
      currentPath = newPathCandidate;
      updateTerminalTitle();
      return ``;
    }
    return `cd: no such file or directory: ${targetDirArg}`;
  },
  cat: (args) => {
    if (args.length === 0) return 'cat: missing operand';
    const filePathArg = args[0];
    const resolvedFilePath = resolvePath(filePathArg);

    const pathParts = resolvedFilePath.split('/');
    const itemName = pathParts.pop() || '';
    const dirPath = pathParts.join('/') || (resolvedFilePath.startsWith('~') && pathParts.length === 0 ? '~' : null);

    if (dirPath === '~' && itemName === '') {
      return `cat: ${filePathArg}: Is a directory`;
    }

    if (dirPath !== null && fileSystem[dirPath] && fileSystem[dirPath][itemName]) {
      const item = fileSystem[dirPath][itemName];
      if (item.type === 'file') {
        if (item.contentCmd && commands[item.contentCmd]) {
          return commands[item.contentCmd]();
        }
        let contentOutput = escapeHtml(item.content || 'File is empty.');
        if (item.url) {
          contentOutput += `\n<span class="output-highlight">Link:</span> <a href="${item.url}" target="_blank" class="output-link">${item.url}</a>`;
        }
        return contentOutput;
      }
      return `cat: ${filePathArg}: Is a directory`;
    }
    return `cat: ${filePathArg}: No such file or directory`;
  },
  projects: () => {
    let output =
      "Projects (explore with <span class='output-highlight'>ls ~/projects</span> and <span class='output-highlight'>cat ~/projects/<filename></span>):\n";
    const projectsDir = fileSystem['~/projects'];
    if (projectsDir) {
      for (const projectName in projectsDir) {
        const project = projectsDir[projectName];
        output += `  - <span class="output-highlight">${projectName}</span>: ${escapeHtml(project.content.split('\n')[0])}`;
        if (project.url) {
          output += ` <a href="${project.url}" target="_blank" class="output-link">[link]</a>`;
        }
        output += '\n';
      }
    } else {
      output += '  No projects found in ~/projects.\n';
    }
    return output.trim();
  },
  open: (args) => {
    if (args.length === 0) return 'Usage: open <url>';
    let url = args[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      new URL(url);
      window.open(url, '_blank');
      return `Opening <a href="${url}" target="_blank" class="output-link">${escapeHtml(url)}</a>...`;
    } catch (_) {
      return `Invalid URL: ${escapeHtml(url)}`;
    }
  },
  search: (args) => {
    if (args.length === 0) return 'Usage: search <query>';
    const query = args.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
    return `Searching Google for "${escapeHtml(query)}"...`;
  },
  sudo: (args) => {
    const cmd = args.join(' ').trim();
    if (cmd === 'rm -rf /' || cmd === 'rm -rf ~') {
      return `ARE YOU SERIOUS?! \nPermission denied. This is a web simulation, thankfully.`;
    }
    if (cmd.startsWith('apt') || cmd.startsWith('yum') || cmd.startsWith('pacman')) {
      return `Package manager operations are not available in this simulation.\nTry 'skills' to see what's "installed".`;
    }
    if (cmd) {
      return `User <span class="output-highlight">${username}</span> is not in the sudoers file. This incident will be reported. \n...Just kidding! But I can't execute '<span class="output-error">${escapeHtml(
        cmd
      )}</span>' with root privileges here.`;
    }
    return 'We trust you have received the usual lecture from the local System Administrator. It usually boils down to these three things:\n\n    #1) Respect the privacy of others.\n    #2) Think before you type.\n    #3) With great power comes great responsibility.\n\nPassword: [*************] (Nah, not really)';
  },
  fortune: () => {
    const randomIndex = Math.floor(Math.random() * fortunes.length);
    return `🥠 ${fortunes[randomIndex]}`;
  },
  shutdown: () => {
    powerOff(false);
    return '';
  },
  reboot: () => {
    powerOff(true);
    return '';
  },
  whoami: () => `
<span class="output-highlight">Name:</span>         Jovix
<span class="output-highlight">Title:</span>        Code Artisan & Digital Explorer
<span class="output-highlight">Location:</span>     The Internet
<span class="output-highlight">Interests:</span>    Crafting elegant code, exploring new technologies, and a good cup of coffee.
<span class="output-highlight">Bio:</span>          Passionate about building useful and delightful digital experiences. Always learning, always creating.
              "The best way to predict the future is to invent it." - Alan Kay
`,
  socials: () => `
<span class="output-highlight">GitHub:</span>       <a href="https://github.com/jovix0101" target="_blank" class="output-link">github.com/jovix0101</a>
<span class="output-highlight">Portfolio:</span>    <a href="https://1step.dev" target="_blank" class="output-link">1step.dev</a> (You are here!)
<span class="output-highlight">LinkedIn:</span>     <a href="https://linkedin.com/in/YOUR_LINKEDIN_PROFILE" target="_blank" class="output-link">linkedin.com/in/YOUR_LINKEDIN_PROFILE</a>
`,
  skills: () => `
<span class="output-highlight">Languages:</span>    JavaScript (Node.js, Browser), Python, HTML5, CSS3, SQL
<span class="output-highlight">Frameworks:</span>   React, Express.js, Svelte, FastAPI, TailwindCSS
<span class="output-highlight">Databases:</span>    PostgreSQL, MongoDB, Redis, ClickHouse
<span class="output-highlight">Tools:</span>        Git, Docker, Nginx, Neovim, Linux CLI
<span class="output-highlight">Cloud:</span>       AWS (EC2, S3, Lambda), GCP, Vercel
<span class="output-highlight">Concepts:</span>     REST APIs, Microservices, CI/CD, Agile, Web Performance
`,
  contact: () => `
<span class="output-highlight">Email:</span>        <a href="mailto:jovix@example.com" class="output-link">jovix@example.com</a> (Replace with your actual email)
<span class="output-highlight">LinkedIn:</span>     Type '<span class="output-highlight">socials</span>' for my LinkedIn profile.
Feel free to reach out! I'm always open to new ideas and collaborations.
`,
  date: () => new Date().toString(),
  echo: (args) => args.map(escapeHtml).join(' '),
  history: () => {
    if (commandHistory.length === 0) return 'No commands in history yet.';
    return (
      'Command History:\n' +
      commandHistory
        .slice(0, 20)
        .map((cmd, i) => `  ${commandHistory.length - 1 - i}: ${escapeHtml(cmd)}`)
        .join('\n')
    );
  },
  github: () => {
    window.open('https://github.com/jovix0101', '_blank');
    return 'Opening GitHub profile...';
  },
  coffee: () => {
    const coffeeLink = 'https://www.buymeacoffee.com/YOUR_USERNAME';
    window.open(coffeeLink, '_blank');
    return `If you like this, consider buying me a coffee at <a href="${coffeeLink}" target="_blank" class="output-link">${coffeeLink.replace(
      'https://www.',
      ''
    )}</a>! Opening page...`;
  },
  donate: () => commands.coffee(),
};

function resolvePath(targetPath) {
  if (!targetPath || targetPath === '~' || targetPath === '/') return '~';

  let newParts;
  if (targetPath.startsWith('~/')) {
    newParts = targetPath
      .substring(2)
      .split('/')
      .filter((p) => p && p !== '.');
  } else if (targetPath.startsWith('/')) {
    newParts = targetPath
      .substring(1)
      .split('/')
      .filter((p) => p && p !== '.');
  } else {
    newParts = (currentPath === '~' ? [] : currentPath.substring(2).split('/')).concat(targetPath.split('/'));
  }

  const resolvedParts = [];
  for (const part of newParts) {
    if (part === '..') {
      if (resolvedParts.length > 0) {
        resolvedParts.pop();
      }
    } else if (part && part !== '.') {
      resolvedParts.push(part);
    }
  }
  return resolvedParts.length === 0 ? '~' : '~/' + resolvedParts.join('/');
}

function processCommand(commandStr) {
  const [commandNameInput, ...args] = commandStr.split(/\s+/).filter((s) => s.length > 0);
  if (!commandNameInput) return;

  const commandName = commandNameInput.toLowerCase();
  if (commands[commandName]) {
    try {
      const output = commands[commandName](args);
      if (output || output === '') {
        if (output !== '') appendOutput(output);
      }
    } catch (error) {
      console.error('Error executing command:', commandName, args, error);
      appendOutput(`Error executing command ${escapeHtml(commandName)}: ${escapeHtml(error.message)}`, 'output-error');
    }
  }
  else {
    appendOutput(`command not found: ${escapeHtml(commandName)}`, 'output-error');
    appendOutput(`Type '<span class="output-highlight">help</span>' for a list of available commands.`);
  }
}

terminalBody.addEventListener('click', (event) => {
  if (commandInput && event.target === terminalBody) {
    focusInput();
  }
});

document.addEventListener('DOMContentLoaded', initializePageOnLoad);