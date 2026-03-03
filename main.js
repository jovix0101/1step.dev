import { commands, fileSystem, resolvePath } from './commands.js';
import { themes, applyTheme, escapeHtml, appendOutput, scrollToBottom } from './ui.js';

const terminalElement = document.getElementById('terminal');
const terminalBody = document.getElementById('terminal-body');
const terminalTitleElement = document.querySelector('#terminal-header .title');
const developerInfoFooter = document.getElementById('developer-info');

const powerButtonArea = document.getElementById('power-button-area');
const powerOnButton = document.getElementById('power-on-btn');
const lightStripCircle = document.getElementById('power-button-light-strip-circle');

let commandInput;
let currentInputLineDiv;
let commandHistory = [];
let historyIndex = -1;
let isTransitioningState = false;
let isInteractionHeld = false;
let powerOnTimeoutId = null;
let thresholdMetForPowerOn = false;
let lightStripCircumference = 0;

const username = 'jovix';
const hostname = '1step.dev';
const terminalState = { currentPath: '~' };
const STORAGE_KEYS = {
    history: 'terminalHistory',
    currentPath: 'terminalCurrentPath',
    draft: 'terminalInputDraft'
};
const COMPLETABLE_PATH_COMMANDS = ['cd', 'ls', 'cat'];
const MAX_PERSISTED_HISTORY = 200;

let commandInlineSuggestion;
let completionSession = {
    type: null,
    entries: [],
    index: -1,
    originalValue: '',
    lastAppliedValue: ''
};
let initialInputDraft = '';
let shouldApplyDraftOnNextInput = true;

export function getUsername() { return username; }
export function getHostname() { return hostname; }
export function getCurrentPath() { return terminalState.currentPath; }
export function getCommandHistory() { return commandHistory; }
export function setCommandHistory(newHistory) {
    commandHistory = Array.isArray(newHistory) ? newHistory : [];
    persistCommandHistory();
}
export function getHistoryIndex() { return historyIndex; }
export function setHistoryIndex(newIndex) { historyIndex = newIndex; }
export function setCurrentPath(newPath, options = {}) {
    terminalState.currentPath = newPath;
    updateTerminalTitle();
    if (!options.skipPersist) {
      persistCurrentPath();
    }
}

function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
}

function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
}

function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
}

function persistCommandHistory() {
    safeStorageSet(STORAGE_KEYS.history, JSON.stringify(commandHistory.slice(0, MAX_PERSISTED_HISTORY)));
}

function persistCurrentPath() {
    safeStorageSet(STORAGE_KEYS.currentPath, terminalState.currentPath);
}

function persistCommandDraft(value) {
    if (!value) {
      safeStorageRemove(STORAGE_KEYS.draft);
      return;
    }
    safeStorageSet(STORAGE_KEYS.draft, value);
}

function clearPersistedDraft() {
    initialInputDraft = '';
    shouldApplyDraftOnNextInput = false;
    safeStorageRemove(STORAGE_KEYS.draft);
}

function hydrateSessionState() {
    const savedHistory = safeStorageGet(STORAGE_KEYS.history);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          commandHistory = parsed.filter((entry) => typeof entry === 'string').slice(0, MAX_PERSISTED_HISTORY);
        }
      } catch (_) {}
    }

    const savedPath = safeStorageGet(STORAGE_KEYS.currentPath);
    if (savedPath && fileSystem[savedPath] && typeof fileSystem[savedPath] === 'object') {
      terminalState.currentPath = savedPath;
    }

    const savedDraft = safeStorageGet(STORAGE_KEYS.draft);
    if (typeof savedDraft === 'string' && savedDraft.length > 0) {
      initialInputDraft = savedDraft;
      shouldApplyDraftOnNextInput = true;
    }
}

function resetCompletionSession() {
    completionSession = {
      type: null,
      entries: [],
      index: -1,
      originalValue: '',
      lastAppliedValue: ''
    };
}

function initializePageOnLoad() {
    const savedTheme = safeStorageGet('terminalTheme');
    applyTheme(savedTheme && themes[savedTheme] ? savedTheme : 'dracula');
    hydrateSessionState();

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
    lightStripCircumference = 2 * Math.PI * lightStripRadius;
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
    return `<span class="prompt"><span class="prompt-user">${username}@${hostname}</span>:<span class="prompt-path">${getCurrentPath()}</span><span class="prompt-symbol">$</span></span>`;
}

export function updateTerminalTitle() {
    if (terminalTitleElement) {
      terminalTitleElement.textContent = `${username}@${hostname}: ${getCurrentPath()} (web-shell)`;
    }
}

function focusInput() {
    if (commandInput && document.activeElement !== commandInput) {
      commandInput.focus();
    }
}

function rankMatches(items, query, getText) {
    const normalizedQuery = query.toLowerCase();
    return items
      .filter((item) => {
        const text = getText(item).toLowerCase();
        return normalizedQuery ? text.startsWith(normalizedQuery) : true;
      })
      .sort((a, b) => getText(a).localeCompare(getText(b)));
}

function buildCommandCompletionSession(currentText) {
    if (currentText.includes(' ')) return null;

    const allCommands = Object.keys(commands).map((name) => ({ name }));
    const entries = rankMatches(allCommands, currentText, (entry) => entry.name);
    if (entries.length === 0) return null;

    return {
      type: 'command',
      entries,
      index: -1,
      originalValue: currentText,
      lastAppliedValue: currentText,
      apply: (entry) => `${entry.name} `
    };
}

function buildPathCompletionSession(currentText) {
    const [rawCommand, ...restArgs] = currentText.split(' ');
    const commandName = rawCommand.toLowerCase();

    if (!COMPLETABLE_PATH_COMMANDS.includes(commandName)) return null;

    const currentArg = restArgs.length > 0 ? restArgs[restArgs.length - 1] : '';
    if (!(currentText.endsWith(' ') || currentArg)) return null;

    const pathPrefix = currentArg;
    const fallbackBase = commandName === 'cat' ? '.' : getCurrentPath();
    const parentPath = resolvePath(pathPrefix.substring(0, pathPrefix.lastIndexOf('/') + 1) || fallbackBase);
    const directory = fileSystem[parentPath];
    if (!directory) return null;

    const baseName = pathPrefix.substring(pathPrefix.lastIndexOf('/') + 1);
    const fullPathPrefix = pathPrefix.substring(0, pathPrefix.lastIndexOf('/') + 1);
    const allEntries = Object.keys(directory).map((name) => ({
      name,
      isDirectory: directory[name].type === 'directory' || name.endsWith('/')
    }));
    const entries = rankMatches(allEntries, baseName, (entry) => entry.name);
    if (entries.length === 0) return null;

    return {
      type: 'path',
      entries,
      index: -1,
      originalValue: currentText,
      lastAppliedValue: currentText,
      parentPath,
      apply: (entry) => `${rawCommand} ${fullPathPrefix}${entry.name}${entry.isDirectory ? '' : ' '}`
    };
}

function buildCompletionSession(currentText) {
    return buildPathCompletionSession(currentText) || buildCommandCompletionSession(currentText);
}

function renderCompletionHint(session) {
    if (!session || session.entries.length <= 1) return;

    const preview = session.entries
      .slice(0, 8)
      .map((entry) => {
        if (session.type === 'path') {
          return `<span class="${entry.isDirectory ? 'output-path' : 'output-highlight'}">${entry.name}</span>`;
        }
        return `<span class="output-highlight">${entry.name}</span>`;
      })
      .join('  ');

    const title = session.type === 'path' ? `Completions in ${session.parentPath}:` : 'Command matches:';
    appendOutput(`${title}\n${preview}`);
    scrollToBottom();
}

function updateInlineSuggestion() {
    if (!commandInput || !commandInlineSuggestion) return;

    const rawValue = commandInput.value;
    const lowerValue = rawValue.toLowerCase();

    if (!rawValue || rawValue.includes(' ')) {
      commandInlineSuggestion.textContent = '';
      return;
    }

    const suggestion = Object.keys(commands).find((name) => name.startsWith(lowerValue) && name !== lowerValue);
    if (!suggestion) {
      commandInlineSuggestion.textContent = '';
      return;
    }

    commandInlineSuggestion.textContent = suggestion.slice(rawValue.length);
    commandInlineSuggestion.style.setProperty('--suggestion-offset', `${rawValue.length}ch`);
}

function handleInputChange() {
    resetCompletionSession();
    persistCommandDraft(commandInput.value);
    updateInlineSuggestion();
}

function createInputLine() {
    currentInputLineDiv = document.createElement('div');
    currentInputLineDiv.className = 'terminal-line';
    currentInputLineDiv.id = 'command-input-container';
    currentInputLineDiv.innerHTML = `
              ${createPromptHtml()}
              <div class="command-input-wrapper">
                <input type="text" id="command-input" spellcheck="false" autocomplete="off">
                <span class="command-inline-suggestion" aria-hidden="true"></span>
              </div>
          `;
    terminalBody.appendChild(currentInputLineDiv);
    commandInput = currentInputLineDiv.querySelector('#command-input');
    commandInlineSuggestion = currentInputLineDiv.querySelector('.command-inline-suggestion');
    commandInput.addEventListener('keydown', handleKeydown);
    commandInput.addEventListener('input', handleInputChange);

    if (shouldApplyDraftOnNextInput && initialInputDraft) {
      commandInput.value = initialInputDraft;
      commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
      shouldApplyDraftOnNextInput = false;
      updateInlineSuggestion();
    } else {
      commandInlineSuggestion.textContent = '';
    }

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

        clearPersistedDraft();
        resetCompletionSession();
        createInputLine();
        scrollToBottom();
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const commandStr = commandInput.value.trim();

      commandInput.removeEventListener('keydown', handleKeydown);
      commandInput.removeEventListener('input', handleInputChange);
      commandInput.disabled = true;
      clearPersistedDraft();
      resetCompletionSession();

      const commandEchoLine = document.createElement('div');
      commandEchoLine.className = 'terminal-line';
      commandEchoLine.innerHTML = `${createPromptHtml()}<span class="command-echo">${escapeHtml(commandStr)}</span>`;
      terminalBody.replaceChild(commandEchoLine, currentInputLineDiv);

      if (commandStr) {
        if (commandHistory.length === 0 || commandHistory[0] !== commandStr) {
          commandHistory.unshift(commandStr);
          persistCommandHistory();
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
        persistCommandDraft(commandInput.value);
        updateInlineSuggestion();
        resetCompletionSession();
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        commandInput.value = commandHistory[historyIndex];
        commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
        persistCommandDraft(commandInput.value);
      } else if (historyIndex <= 0) {
        historyIndex = -1;
        commandInput.value = '';
        persistCommandDraft('');
      }
      updateInlineSuggestion();
      resetCompletionSession();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const currentText = commandInput.value;
      const canCycleExisting = completionSession.entries.length > 0 && currentText === completionSession.lastAppliedValue;

      if (!canCycleExisting) {
        const newSession = buildCompletionSession(currentText);
        if (!newSession) return;
        completionSession = newSession;
        renderCompletionHint(completionSession);
      }

      completionSession.index = (completionSession.index + 1) % completionSession.entries.length;
      const nextEntry = completionSession.entries[completionSession.index];
      commandInput.value = completionSession.apply(nextEntry);
      completionSession.lastAppliedValue = commandInput.value;
      commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
      persistCommandDraft(commandInput.value);
      updateInlineSuggestion();
    }
}

function initializeTerminalContent() {
    terminalBody.innerHTML = '';
    historyIndex = -1;
    if (!fileSystem[getCurrentPath()] || typeof fileSystem[getCurrentPath()] !== 'object') {
      setCurrentPath('~');
    } else {
      updateTerminalTitle();
    }
    resetCompletionSession();

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
