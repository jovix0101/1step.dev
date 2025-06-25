

import { appendOutput, escapeHtml, applyTheme } from './ui.js';
import { getUsername, getHostname, getCurrentPath, updateTerminalTitle, getCommandHistory, setCommandHistory, getHistoryIndex, setHistoryIndex, powerOff } from './main.js';

export const fileSystem = {
  '~': {
    'about.txt': { type: 'file', contentCmd: 'whoami' },
    'socials.json': { type: 'file', contentCmd: 'socials' },
    'skills.md': { type: 'file', contentCmd: 'skills' },
    'projects/': { type: 'directory' },
    'contact.info': { type: 'file', contentCmd: 'contact' },
    'README.md': { type: 'file', content: `Welcome to jovix@1step.dev!\nType 'help' for commands. Use 'ls' to explore.` }
  },
  '~/projects': {
    'this-portfolio.site': {
      type: 'file',
      content: "You're looking at it! An interactive terminal-style personal website.\nBuilt with HTML, CSS, and Vanilla JavaScript.",
      url: '#'
    },
    'project-alpha.link': {
      type: 'file',
      content: 'Project Alpha: A cutting-edge AI research platform.',
      url: 'https://example.com/project-alpha'
    },
    'beta-suite.app': {
      type: 'file',
      content: 'Beta Suite: A collection of productivity tools.',
      url: 'https://example.com/beta-suite'
    }
  }
};

export const commands = {
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
    return `<div class="output-avatar"><img src="${avatarUrl}" alt="jovix's Avatar"></div>Displaying avatar...`;
  },
  banner: () => {
    const bannerArt = `
    /\_/\  
   ( o.o ) 
    > ^ <  
   बादशाह
Welcome to ${getUsername()}@${getHostname()}!
Type '<span class="output-highlight">help</span>' to see available commands.
`;
    appendOutput(bannerArt, 'ascii-art');
    return '';
  },
  clear: () => {
    const terminalBody = document.getElementById('terminal-body');
    terminalBody.innerHTML = '';
    return '';
  },
  theme: (args) => {
    return applyTheme(args.length > 0 ? args[0].toLowerCase() : '');
  },
  ls: (args) => {
    const pathToLs = args[0] ? resolvePath(args[0]) : getCurrentPath();
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
      return `User <span class="output-highlight">${getUsername()}</span> is not in the sudoers file. This incident will be reported. \n...Just kidding! But I can't execute '<span class="output-error">${escapeHtml(
        cmd
      )}</span>' with root privileges here.`;
    }
    return 'We trust you have received the usual lecture from the local System Administrator. It usually boils down to these three things:\n\n    #1) Respect the privacy of others.\n    #2) Think before you type.\n    #3) With great power comes great responsibility.\n\nPassword: [*************] (Nah, not really)';
  },
  fortune: () => {
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
        'Have you tried turning it off and on again?'
      ];
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
    const commandHistory = getCommandHistory();
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
  donate: () => commands.coffee()
};

export function resolvePath(targetPath) {
    if (!targetPath || targetPath === '~' || targetPath === '/') return '~';

    let newParts;
    const currentPath = getCurrentPath();

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

