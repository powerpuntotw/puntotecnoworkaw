const { execSync } = require('child_process');
const fs = require('fs');
try {
    execSync('npx vite build', { stdio: 'pipe' });
    console.log("Build success");
} catch (e) {
    const errText = (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : '');
    fs.writeFileSync('vite_err3.log', errText);
    console.log("Build failed. Wrote to vite_err3.log");
}
