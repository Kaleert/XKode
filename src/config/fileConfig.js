// src/config/fileConfig.js

export const fileConfig = {
    // Расширения -> { icon: 'имя-в-material-icons', color: '#hex' }
    associations: {
        '.js':   { icon: 'language-javascript', color: '#f1e05a' },
        '.jsx':  { icon: 'react',               color: '#61dafb' },
        '.ts':   { icon: 'language-typescript', color: '#2b7489' },
        '.tsx':  { icon: 'react',               color: '#2b7489' },
        '.html': { icon: 'language-html5',      color: '#e34c26' },
        '.css':  { icon: 'language-css3',       color: '#563d7c' },
        '.scss': { icon: 'sass',                color: '#c6538c' },
        '.json': { icon: 'code-json',           color: '#cbcb41' },
        '.java': { icon: 'language-java',       color: '#b07219' },
        '.py':   { icon: 'language-python',     color: '#3572a5' },
        '.cpp':  { icon: 'language-cpp',        color: '#f34b7d' },
        '.c':    { icon: 'language-c',          color: '#555555' },
        '.xml':  { icon: 'xml',                 color: '#0060ac' },
        '.md':   { icon: 'language-markdown',   color: '#083fa1' },
        '.php':  { icon: 'language-php',        color: '#777bb4' },
        '.go':   { icon: 'language-go',         color: '#00add8' },
        '.sql':  { icon: 'database',            color: '#e38c00' },
        '.zip':  { icon: 'zip-box',             color: '#d9d9d9' },
        '.png':  { icon: 'image',               color: '#b83df2' },
        '.jpg':  { icon: 'image',               color: '#b83df2' },
        '.svg':  { icon: 'svg',                 color: '#ffb13b' },
        'default': { icon: 'file-document-outline', color: '#cccccc' }
    },

    // Точные имена файлов
    specificNames: {
        'package.json':      { icon: 'nodejs',      color: '#4caf50' },
        'package-lock.json': { icon: 'nodejs',      color: '#4caf50' },
        'tsconfig.json':     { icon: 'language-typescript', color: '#2b7489' },
        'readme.md':         { icon: 'information-outline', color: '#083fa1' },
        '.gitignore':        { icon: 'git',         color: '#f44d27' },
        '.env':              { icon: 'cog',         color: '#ecd53f' },
        'dockerfile':        { icon: 'docker',      color: '#384d54' },
    },

    // Папки
    folderIcons: {
        'src':           { icon: 'folder',       color: '#4caf50' }, // Зеленая
        'dist':          { icon: 'folder',       color: '#ff9800' }, // Оранжевая
        'node_modules':  { icon: 'folder-remove',color: '#cb3837' }, // Красная
        'assets':        { icon: 'folder-image', color: '#ffc107' },
        '.git':          { icon: 'git',          color: '#f44d27' },
        'android':       { icon: 'android',      color: '#3ddc84' },
        'ios':           { icon: 'apple',        color: '#999999' },
        'components':    { icon: 'shape',        color: '#00bcd4' },
        'default':       { icon: 'folder',       color: '#dcb67a' },
        'open':          { icon: 'folder-open',  color: '#dcb67a' }
    },

    getFileSettings: (filename) => {
        const lowerName = filename.toLowerCase();
        if (fileConfig.specificNames[lowerName]) return fileConfig.specificNames[lowerName];
        
        const parts = lowerName.split('.');
        if (parts.length > 1) {
            const ext = '.' + parts.pop();
            if (fileConfig.associations[ext]) return fileConfig.associations[ext];
        }
        return fileConfig.associations['default'];
    }
};