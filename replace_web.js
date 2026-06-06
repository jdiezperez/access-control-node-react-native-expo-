const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir('web/src', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('http://localhost:5000')) {
            // we should replace all 'http://localhost:5000' with \`${import.meta.env.VITE_API_URL}\` but we need to handle existing template literals
            // To make it simple, let's create a central config and use it.
            // Wait, Vite already has import.meta.env.VITE_API_URL.
            // Better to replace 'http://localhost:5000' with import.meta.env.VITE_API_URL. 
            // In template strings like \`http://localhost:5000/api...\`, it becomes \`${import.meta.env.VITE_API_URL}/api...\`.
            // In normal strings like 'http://localhost:5000/api...', it becomes \`${import.meta.env.VITE_API_URL}/api...\`.
            
            // Regex to match 'http://localhost:5000/...' or `http://localhost:5000/...`
            let newContent = content.replace(/['"`]http:\/\/localhost:5000([^'"`]*)['"`]/g, '`${import.meta.env.VITE_API_URL}$1`');
            
            // If there's an instance of `http://localhost:5000${...}` we need to be careful. 
            // The regex above will capture everything until the next quote or backtick.
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
});

// Also update vite.config.ts
let viteConfigPath = 'web/vite.config.ts';
if (fs.existsSync(viteConfigPath)) {
    let content = fs.readFileSync(viteConfigPath, 'utf8');
    content = content.replace(/'http:\/\/localhost:5000'/g, "process.env.VITE_API_URL || 'http://localhost:5000'");
    fs.writeFileSync(viteConfigPath, content, 'utf8');
    console.log(`Updated ${viteConfigPath}`);
}
