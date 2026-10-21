const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = 3000;
const publicFolder = path.join(__dirname, 'public');

const cppFile = path.join(
    __dirname,
    'cpp',
    process.platform === 'win32' ? 'skillgraph.exe' : 'skillgraph'
);

function runCpp(args, res) {
    execFile(cppFile, args, { timeout: 4000 }, (error, stdout) => {
        if (error) {
            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Could not run C++. Compile the program using run.bat.'
            }));
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(stdout);
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
    );

    if (url.pathname.startsWith('/api/')) {
        const roadmap = url.searchParams.get('roadmap') || 'cpp-dsa';

        if (url.pathname === '/api/roadmaps') {
            return runCpp(['roadmaps'], res);
        }

        if (url.pathname === '/api/graph') {
            return runCpp(['graph', roadmap], res);
        }

        if (url.pathname === '/api/bfs') {
            return runCpp([
                'bfs',
                roadmap,
                url.searchParams.get('start') || ''
            ], res);
        }

        if (url.pathname === '/api/dfs') {
            return runCpp([
                'dfs',
                roadmap,
                url.searchParams.get('start') || ''
            ], res);
        }

        if (url.pathname === '/api/prereq') {
            return runCpp([
                'prereq',
                roadmap,
                url.searchParams.get('skill') || ''
            ], res);
        }

        if (url.pathname === '/api/topo') {
            return runCpp(['topo', roadmap], res);
        }

        if (url.pathname === '/api/cycle') {
            return runCpp(['cycle', roadmap], res);
        }

        res.writeHead(404, {
            'Content-Type': 'application/json'
        });

        return res.end(JSON.stringify({
            error: 'API route not found'
        }));
    }

    const requestedFile = url.pathname === '/'
        ? 'index.html'
        : decodeURIComponent(url.pathname.slice(1));

    const filePath = path.resolve(publicFolder, requestedFile);
    const rootPath = path.resolve(publicFolder);

    if (!filePath.startsWith(rootPath + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404);
            return res.end('File not found');
        }

        const extension = path.extname(filePath).toLowerCase();

        const contentTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8'
        };

        res.writeHead(200, {
            'Content-Type':
                contentTypes[extension] || 'application/octet-stream'
        });

        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`SkillGraph is running at http://localhost:${PORT}`);
});