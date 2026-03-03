
import { appendOutput, escapeHtml, applyTheme } from './ui.js';
import { getUsername, getHostname, getCurrentPath, setCurrentPath, getCommandHistory, powerOff } from './main.js';

export const fileSystem = {
  '~': {
    'about.txt': { type: 'file', contentCmd: 'whoami' },
    'socials.json': { type: 'file', contentCmd: 'socials' },
    'skills.md': { type: 'file', contentCmd: 'skills' },
    'projects/': { type: 'directory' },
    'contact.info': { type: 'file', contentCmd: 'contact' },
    'README.md': { type: 'file', content: `欢迎来到 jovix@1step.dev!\n输入 'help' 查看命令，使用 'ls' 浏览目录。` }
  },
  '~/projects': {
    'this-portfolio.site': {
      type: 'file',
      content: '就是你正在浏览的这个交互式终端个人网站。\n使用 HTML、CSS 与原生 JavaScript 构建。',
      url: '#'
    },
    'project-alpha.link': {
      type: 'file',
      content: 'Project Alpha：一个前沿的 AI 研究与应用平台。',
      url: 'https://example.com/project-alpha'
    },
    'beta-suite.app': {
      type: 'file',
      content: 'Beta Suite：一组提升效率的生产力工具。',
      url: 'https://example.com/beta-suite'
    }
  }
};

export const commands = {
  help: () => `
可用命令:
  <span class="output-highlight">shutdown</span>      - 模拟终端关机
  <span class="output-highlight">reboot</span>        - 模拟终端重启
  <span class="output-highlight">whoami</span>        - 显示我的基本信息
  <span class="output-highlight">socials</span>       - 查看我的社交链接
  <span class="output-highlight">skills</span>        - 查看我的技术栈
  <span class="output-highlight">projects</span>      - 查看项目列表（也可用 <span class="output-highlight">ls ~/projects</span>）
  <span class="output-highlight">contact</span>       - 查看联系方式
  <span class="output-highlight">avatar</span>        - 显示头像
  <span class="output-highlight">banner</span>        - 再次显示欢迎横幅
  <span class="output-highlight">date</span>          - 显示当前日期时间
  <span class="output-highlight">echo [text]</span>   - 在终端输出文本
  <span class="output-highlight">clear</span>         - 清空终端屏幕
  <span class="output-highlight">history</span>       - 查看命令历史
  <span class="output-highlight">help</span>          - 显示本帮助信息（当前）
  <span class="output-highlight">github</span>        - 打开我的 GitHub
  <span class="output-highlight">coffee</span>        - 请我喝杯咖啡
  <span class="output-highlight">donate</span>        - <span class="output-highlight">coffee</span> 的别名
  <span class="output-highlight">theme [name]</span>  - 切换终端主题（仅输入 <span class="output-highlight">theme</span> 可查看可用主题）
  <span class="output-highlight">ls [path]</span>     - 列出目录内容
  <span class="output-highlight">cd [path]</span>     - 切换目录
  <span class="output-highlight">cat [file]</span>    - 查看文件内容
  <span class="output-highlight">open [url]</span>    - 在新标签页打开链接
  <span class="output-highlight">search [query]</span>- 使用 Google 搜索关键词
  <span class="output-highlight">sudo [cmd]</span>    - 嗯...你可以试试
  <span class="output-highlight">fortune</span>       - 输出一条随机语录
`,
  avatar: () => {
    const avatarUrl = './avatar.png';
    return `<div class="output-avatar"><img src="${avatarUrl}" alt="jovix 的头像"></div>已显示头像。`;
  },
  banner: () => {
    const bannerArt = `
    /\_/\  
   ( o.o ) 
    > ^ <  
   बादशाह
欢迎来到 ${getUsername()}@${getHostname()}!
输入 '<span class="output-highlight">help</span>' 查看可用命令。
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
      let output = `目录 <span class="output-path">${pathToLs}</span> 的内容:\n`;
      Object.keys(directory).forEach((item) => {
        const itemDetails = directory[item];
        const isDir = itemDetails.type === 'directory' || item.endsWith('/');
        output += `  <span class="${isDir ? 'output-path' : 'output-highlight'}">${item}${isDir && !item.endsWith('/') ? '/' : ''}</span>\n`;
      });
      return output.trim();
    }
    return `ls: 无法访问 '${args[0] || pathToLs}': 没有那个文件或目录`;
  },
  cd: (args) => {
    if (args.length === 0 || args[0] === '~' || args[0] === '') {
      setCurrentPath('~');
      return ``;
    }
    const targetDirArg = args[0];
    const newPathCandidate = resolvePath(targetDirArg);

    if (fileSystem[newPathCandidate] && typeof fileSystem[newPathCandidate] === 'object') {
      setCurrentPath(newPathCandidate);
      return ``;
    }
    return `cd: 没有那个文件或目录: ${targetDirArg}`;
  },
  cat: (args) => {
    if (args.length === 0) return 'cat: 缺少文件参数';
    const filePathArg = args[0];
    const resolvedFilePath = resolvePath(filePathArg);

    const pathParts = resolvedFilePath.split('/');
    const itemName = pathParts.pop() || '';
    const dirPath = pathParts.join('/') || (resolvedFilePath.startsWith('~') && pathParts.length === 0 ? '~' : null);

    if (dirPath === '~' && itemName === '') {
      return `cat: ${filePathArg}: 是一个目录`;
    }

    if (dirPath !== null && fileSystem[dirPath] && fileSystem[dirPath][itemName]) {
      const item = fileSystem[dirPath][itemName];
      if (item.type === 'file') {
        if (item.contentCmd && commands[item.contentCmd]) {
          return commands[item.contentCmd]();
        }
        let contentOutput = escapeHtml(item.content || '文件为空。');
        if (item.url) {
          contentOutput += `\n<span class="output-highlight">链接:</span> <a href="${item.url}" target="_blank" class="output-link">${item.url}</a>`;
        }
        return contentOutput;
      }
      return `cat: ${filePathArg}: 是一个目录`;
    }
    return `cat: ${filePathArg}: 没有那个文件或目录`;
  },
  projects: () => {
    let output =
      "项目列表（可用 <span class='output-highlight'>ls ~/projects</span> 与 <span class='output-highlight'>cat ~/projects/&lt;文件名&gt;</span> 深入查看）:\n";
    const projectsDir = fileSystem['~/projects'];
    if (projectsDir) {
      for (const projectName in projectsDir) {
        const project = projectsDir[projectName];
        output += `  - <span class="output-highlight">${projectName}</span>: ${escapeHtml(project.content.split('\n')[0])}`;
        if (project.url) {
          output += ` <a href="${project.url}" target="_blank" class="output-link">[链接]</a>`;
        }
        output += '\n';
      }
    } else {
      output += '  ~/projects 目录下暂无项目。\n';
    }
    return output.trim();
  },
  open: (args) => {
    if (args.length === 0) return '用法: open <url>';
    let url = args[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try {
      new URL(url);
      window.open(url, '_blank');
      return `正在打开 <a href="${url}" target="_blank" class="output-link">${escapeHtml(url)}</a>...`;
    } catch (_) {
      return `无效链接: ${escapeHtml(url)}`;
    }
  },
  search: (args) => {
    if (args.length === 0) return '用法: search <关键词>';
    const query = args.join(' ');
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
    return `正在 Google 搜索: "${escapeHtml(query)}"...`;
  },
  sudo: (args) => {
    const cmd = args.join(' ').trim();
    if (cmd === 'rm -rf /' || cmd === 'rm -rf ~') {
      return `你来真的？！\n权限拒绝。这只是网页终端模拟，幸好。`;
    }
    if (cmd.startsWith('apt') || cmd.startsWith('yum') || cmd.startsWith('pacman')) {
      return `当前模拟环境不支持包管理器操作。\n可以先试试 'skills' 看看都“安装”了什么。`;
    }
    if (cmd) {
      return `用户 <span class="output-highlight">${getUsername()}</span> 不在 sudoers 文件中，本次操作将被记录。\n...开玩笑的，但这里确实无法以 root 执行 '<span class="output-error">${escapeHtml(
        cmd
      )}</span>'。`;
    }
    return '系统管理员友情提示通常只有三条:\n\n    #1) 尊重他人隐私。\n    #2) 输入前先想清楚。\n    #3) 能力越大，责任越大。\n\nPassword: [*************]（其实不用输）';
  },
  fortune: () => {
    const fortunes = [
      '浏览器里可能正藏着一块属于你的 Cookie。',
      '迭代乃人之常情，递归近乎神性。',
      '今天的你，代码气场很强。',
      '咖啡、代码、睡觉，循环往复。',
      '好的程序员会在单行道上左右看。',
      '如果第一次没成功，就叫它 1.0。',
      '保持冷静，继续编码。',
      '最好的报错信息，是永远不会出现的那条。',
      '你试过先关机再开机吗？',
      '写代码和写作一样，删改比堆砌更重要。'
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
<span class="output-highlight">姓名:</span>         Jovix
<span class="output-highlight">定位:</span>         代码工匠 / 数字探索者
<span class="output-highlight">所在地:</span>       互联网
<span class="output-highlight">兴趣:</span>         优雅代码、新技术探索、以及一杯好咖啡
<span class="output-highlight">简介:</span>         热爱构建实用且有体验感的数字产品，持续学习，持续创造。
              “预测未来最好的方式，就是亲手创造它。” - Alan Kay
`,
  socials: () => `
<span class="output-highlight">GitHub:</span>       <a href="https://github.com/jovix0101" target="_blank" class="output-link">github.com/jovix0101</a>
<span class="output-highlight">个人网站:</span>     <a href="https://1step.dev" target="_blank" class="output-link">1step.dev</a>（你正在这里）
<span class="output-highlight">LinkedIn:</span>     <a href="https://linkedin.com/in/YOUR_LINKEDIN_PROFILE" target="_blank" class="output-link">linkedin.com/in/YOUR_LINKEDIN_PROFILE</a>
`,
  skills: () => `
<span class="output-highlight">编程语言:</span>     JavaScript (Node.js, Browser), Python, HTML5, CSS3, SQL
<span class="output-highlight">框架技术:</span>     React, Express.js, Svelte, FastAPI, TailwindCSS
<span class="output-highlight">数据库:</span>       PostgreSQL, MongoDB, Redis, ClickHouse
<span class="output-highlight">工具链:</span>       Git, Docker, Nginx, Neovim, Linux CLI
<span class="output-highlight">云平台:</span>       AWS (EC2, S3, Lambda), GCP, Vercel
<span class="output-highlight">工程概念:</span>     REST APIs, 微服务, CI/CD, 敏捷开发, Web 性能优化
`,
  contact: () => `
<span class="output-highlight">邮箱:</span>         <a href="mailto:jovix0101@gmail.com" class="output-link">jovix0101@gmail.com</a>（请替换为你的真实邮箱）
<span class="output-highlight">LinkedIn:</span>     输入 '<span class="output-highlight">socials</span>' 查看我的 LinkedIn。
欢迎联系，我一直愿意交流新想法与合作机会。
`,
  date: () => new Date().toLocaleString('zh-CN', { hour12: false }),
  echo: (args) => args.map(escapeHtml).join(' '),
  history: () => {
    const commandHistory = getCommandHistory();
    if (commandHistory.length === 0) return '还没有命令历史。';
    return (
      '命令历史:\n' +
      commandHistory
        .slice(0, 20)
        .map((cmd, i) => `  ${commandHistory.length - 1 - i}: ${escapeHtml(cmd)}`)
        .join('\n')
    );
  },
  github: () => {
    window.open('https://github.com/jovix0101', '_blank');
    return '正在打开 GitHub 主页...';
  },
  coffee: () => {
    const coffeeLink = 'https://www.buymeacoffee.com/YOUR_USERNAME';
    window.open(coffeeLink, '_blank');
    return `如果这个网站对你有帮助，欢迎请我喝杯咖啡：<a href="${coffeeLink}" target="_blank" class="output-link">${coffeeLink.replace(
      'https://www.',
      ''
    )}</a>，正在打开页面...`;
  },
  donate: () => commands.coffee()
};

export function resolvePath(targetPath) {
    if (!targetPath || targetPath === '~' || targetPath === '/') return '~';

    let newParts;
    const cwd = getCurrentPath();

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
      newParts = (cwd === '~' ? [] : cwd.substring(2).split('/')).concat(targetPath.split('/'));
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
