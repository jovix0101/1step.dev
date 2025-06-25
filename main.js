import { commands, fileSystem, resolvePath } from './commands.js';
import { themes, applyTheme, escapeHtml, appendOutput, scrollToBottom } from './ui.js';

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
let thresholdMetForPowerOn = false;

const username = 'jovix';
const hostname = '1step.dev';
let currentPath = '~';

export function getUsername() { return username; }
export function getHostname() { return hostname; }
export function getCurrentPath() { return currentPath; }
export function getCommandHistory() { return commandHistory; }
export function setCommandHistory(newHistory) { commandHistory = newHistory; }
export function getHistoryIndex() { return historyIndex; }
export function setHistoryIndex(newIndex) { historyIndex = newIndex; }

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
    const lightStripRadius = parseFloat(lightStripCircle.getAttribute('r'));
    const lightStripCircumference = 2 * Math.PI * lightStripRadius;
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
        triggerFullPowerOn();
      }
    }, 1000);
}

function handleInteractionEnd(event) {
    if (!isInteractionHeld) {
      return;
    }

    const wasHeldForPowerOn = thresholdMetForPowerOn;
    isInteractionHeld = false;
    powerOnButton.classList.remove('interaction-held');

    clearTimeout(powerOnTimeoutId);
    powerOnTimeoutId = null;

    if (!wasHeldForPowerOn) {
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
    if (event.button !== 0) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0 && terminalBody.contains(selection.anchorNode)) {
      try {
        await navigator.clipboard.writeText(selectedText);
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
    event.preventDefault();
    if (!commandInput || commandInput.disabled) return;

    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const start = commandInput.selectionStart;
        const end = commandInput.selectionEnd;
        const currentValue = commandInput.value;
        commandInput.value = currentValue.substring(0, start) + text + currentValue.substring(end);
        commandInput.selectionStart = commandInput.selectionEnd = start + text.length;
        focusInput();
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

export function updateTerminalTitle() {
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
    } else {
      appendOutput(`command not found: ${escapeHtml(commandName)}`, 'output-error');
      appendOutput(`Type '<span class="output-highlight">help</span>' for a list of available commands.`);
    }
}

export function powerOff(isRebooting = false) {
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
        setTimeout(() => triggerFullPowerOn(), 500); // Wait half a second before rebooting
      } else {
        isTransitioningState = false;
      }
    };
    terminalElement.addEventListener('animationend', handleAnimationEnd);
}

terminalBody.addEventListener('click', (event) => {
    focusInput();
});

document.addEventListener('DOMContentLoaded', initializePageOnLoad);
