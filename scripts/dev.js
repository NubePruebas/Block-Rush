const { spawn } = require('child_process');
const path = require('path');

function run(cwd) {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', cwd),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
}

run('server');
run('client');
