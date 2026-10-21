
const graphEl = document.getElementById('graph');
const detailEl = document.getElementById('detail');
const outputEl = document.getElementById('output');
const searchEl = document.getElementById('search');
const roadmapTabsEl = document.getElementById('roadmap-tabs');

let graphData = { nodes: [], edges: [] };
let roadmaps = [];

let selectedRoadmap =
    localStorage.getItem('skillgraph-roadmap-v1') || 'cpp-dsa';

let selectedId = '';
let completed = new Set();

const NODE_WIDTH = 150;
const NODE_HEIGHT = 115;
const LEVEL_GAP = 155;
const NODE_GAP = 172;

async function api(path) {
    const response = await fetch(path);
    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

function nodeById(id) {
    return graphData.nodes.find(node => node.id === id);
}

function predecessors(id) {
    return graphData.edges
        .filter(edge => edge[1] === id)
        .map(edge => edge[0]);
}

function saveKey() {
    return `skillgraph-completed-${selectedRoadmap}`;
}

function loadCompleted() {
    try {
        completed = new Set(
            JSON.parse(localStorage.getItem(saveKey()) || '[]')
        );
    } catch {
        completed = new Set();
    }
}

/* ===========================
   ROADMAP SELECTOR
=========================== */

function renderRoadmapTabs() {
    roadmapTabsEl.innerHTML = '';

    roadmaps.forEach(roadmap => {
        const button = document.createElement('button');
        button.type = 'button';

        button.className =
            `roadmap-tab${roadmap.id === selectedRoadmap ? ' active' : ''}`;

        button.setAttribute(
            'aria-pressed',
            String(roadmap.id === selectedRoadmap)
        );

        const icon = document.createElement('span');
        icon.className = 'roadmap-tab-icon';
        icon.textContent = roadmap.title.charAt(0);

        const textBox = document.createElement('span');
        textBox.className = 'roadmap-tab-text';

        const title = document.createElement('strong');
        title.textContent = roadmap.title;

        const description = document.createElement('small');
        description.textContent = roadmap.description;

        textBox.append(title, description);

        const arrow = document.createElement('span');
        arrow.className = 'roadmap-arrow';
        arrow.textContent = '↗';

        button.append(icon, textBox, arrow);

        button.addEventListener('click', () => {
            switchRoadmap(roadmap.id);
        });

        roadmapTabsEl.appendChild(button);
    });
}

/* ===========================
   GRAPH LAYOUT
   Arrange prerequisite skills
   into top-to-bottom levels.
=========================== */

function calculateLevels() {
    const nodes = graphData.nodes;
    const edges = graphData.edges;

    const indegree = new Map();
    const depth = new Map();
    const children = new Map();

    nodes.forEach(node => {
        indegree.set(node.id, 0);
        depth.set(node.id, 0);
        children.set(node.id, []);
    });

    edges.forEach(([from, to]) => {
        if (!children.has(from) || !indegree.has(to)) return;

        children.get(from).push(to);
        indegree.set(to, indegree.get(to) + 1);
    });

    const queue = [];

    nodes.forEach(node => {
        if (indegree.get(node.id) === 0) {
            queue.push(node.id);
        }
    });

    let visitedCount = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        visitedCount++;

        children.get(current).forEach(next => {
            depth.set(
                next,
                Math.max(depth.get(next), depth.get(current) + 1)
            );

            indegree.set(next, indegree.get(next) - 1);

            if (indegree.get(next) === 0) {
                queue.push(next);
            }
        });
    }

    // Acyclic prerequisite graphs use their calculated levels.
    // If a cycle exists, place remaining nodes on a fallback level
    // so that the graph can still be displayed.
    if (visitedCount !== nodes.length) {
        const fallbackLevel = Math.max(0, ...depth.values()) + 1;

        nodes.forEach(node => {
            if (indegree.get(node.id) > 0) {
                depth.set(node.id, fallbackLevel);
            }
        });
    }

    return depth;
}

/* ===========================
   DRAW ACTUAL GRAPH
=========================== */

function renderGraph() {
    const nodes = graphData.nodes;
    const edges = graphData.edges;

    graphEl.innerHTML = '';

    // Turn the existing grid container into a scrollable graph canvas.
    graphEl.style.display = 'block';
    graphEl.style.position = 'relative';
    graphEl.style.overflowX = 'auto';
    graphEl.style.overflowY = 'hidden';
    graphEl.style.gap = '0';
    graphEl.style.marginTop = '22px';
    graphEl.style.padding = '0';

    if (nodes.length === 0) {
        graphEl.innerHTML =
            '<p class="loading">No skills are available in this roadmap.</p>';
        updateProgress();
        return;
    }

    const query = searchEl.value.trim().toLowerCase();
    const levels = calculateLevels();

    // Group nodes by their prerequisite depth.
    const layers = new Map();

    nodes.forEach(node => {
        const level = levels.get(node.id) || 0;

        if (!layers.has(level)) {
            layers.set(level, []);
        }

        layers.get(level).push(node);
    });

    const layerNumbers = [...layers.keys()].sort((a, b) => a - b);

    const maxLayerSize = Math.max(
        1,
        ...layerNumbers.map(level => layers.get(level).length)
    );

    const containerWidth = graphEl.clientWidth || 620;

    // Leave enough room for multiple nodes in the same level.
    const canvasWidth = Math.max(
        containerWidth,
        maxLayerSize * NODE_GAP
    );

    const maxLevel = Math.max(...layerNumbers);
    const canvasHeight = Math.max(
        245,
        30 + maxLevel * LEVEL_GAP + NODE_HEIGHT + 25
    );

    const canvas = document.createElement('div');
    canvas.className = 'graph-canvas';

    canvas.style.position = 'relative';
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    graphEl.appendChild(canvas);

    // Calculate the exact position of every skill node.
    const positions = new Map();

    layerNumbers.forEach(level => {
        const levelNodes = layers.get(level);
        const slotWidth = canvasWidth / levelNodes.length;
        const y = 25 + level * LEVEL_GAP;

        levelNodes.forEach((node, index) => {
            const x = slotWidth * (index + 0.5) - NODE_WIDTH / 2;

            positions.set(node.id, {
                x,
                y,
                centerX: x + NODE_WIDTH / 2,
                topY: y,
                bottomY: y + NODE_HEIGHT
            });
        });
    });

    // SVG layer sits behind the skill cards.
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    svg.setAttribute('width', canvasWidth);
    svg.setAttribute('height', canvasHeight);
    svg.setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);

    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = `${canvasWidth}px`;
    svg.style.height = `${canvasHeight}px`;
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';

    // Arrowheads indicate prerequisite -> dependent skill.
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');

    marker.setAttribute('id', 'skillgraph-arrow');
    marker.setAttribute('markerWidth', '9');
    marker.setAttribute('markerHeight', '9');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');

    const arrowHead = document.createElementNS(svgNS, 'path');
    arrowHead.setAttribute('d', 'M 0 0 L 8 4 L 0 8 Z');
    arrowHead.setAttribute('fill', '#8eae94');

    marker.appendChild(arrowHead);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Draw a curved line for every graph edge.
    edges.forEach(([from, to]) => {
        const source = positions.get(from);
        const target = positions.get(to);

        if (!source || !target) return;

        const x1 = source.centerX;
        const y1 = source.bottomY;
        const x2 = target.centerX;
        const y2 = target.topY;

        const curve = Math.max(22, (y2 - y1) * 0.45);

        const path = document.createElementNS(svgNS, 'path');

        path.setAttribute(
            'd',
            `M ${x1} ${y1} C ${x1} ${y1 + curve}, ` +
            `${x2} ${y2 - curve}, ${x2} ${y2}`
        );

        const highlighted =
            from === selectedId || to === selectedId;

        path.setAttribute(
            'stroke',
            highlighted ? '#328052' : '#b7cbb9'
        );

        path.setAttribute('stroke-width', highlighted ? '2.6' : '1.8');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('marker-end', 'url(#skillgraph-arrow)');

        svg.appendChild(path);
    });

    canvas.appendChild(svg);

    // Add interactive skill cards on top of the SVG edges.
    nodes.forEach(node => {
        const position = positions.get(node.id);
        const button = document.createElement('button');

        const isDone = completed.has(node.id);
        const isSelected = selectedId === node.id;

        button.type = 'button';
        button.className =
            `skill-card${isSelected ? ' selected' : ''}` +
            `${isDone ? ' done' : ''}`;

        button.setAttribute('aria-pressed', String(isSelected));
        button.setAttribute(
            'aria-label',
            `${node.title}${isDone ? ', completed' : ''}`
        );

        button.style.position = 'absolute';
        button.style.left = `${position.x}px`;
        button.style.top = `${position.y}px`;
        button.style.width = `${NODE_WIDTH}px`;
        button.style.minHeight = `${NODE_HEIGHT}px`;
        button.style.margin = '0';
        button.style.zIndex = '1';

        const matched =
            !query ||
            node.title.toLowerCase().includes(query) ||
            node.description.toLowerCase().includes(query);

        if (!matched) {
            button.style.opacity = '0.28';
        } else {
            button.style.opacity = '1';
        }

        const prerequisiteCount = predecessors(node.id).length;

        const top = document.createElement('div');
        top.className = 'skill-top';

        const symbol = document.createElement('span');
        symbol.className = 'skill-symbol';
        symbol.textContent = node.title.charAt(0);

        const status = document.createElement('span');
        status.className = 'skill-status';
        status.textContent = isDone
            ? '✓ Done'
            : `${prerequisiteCount} prereq.`;

        top.append(symbol, status);

        const title = document.createElement('strong');
        title.textContent = node.title;

        const caption = document.createElement('small');
        caption.textContent = isDone
            ? 'Completed'
            : 'View skill details';

        button.append(top, title, caption);

        button.addEventListener('click', () => {
            selectedId = node.id;
            renderGraph();
            renderDetails(node.id);
        });

        canvas.appendChild(button);
    });

    updateProgress();
}

/* ===========================
   SKILL DETAILS
=========================== */

async function renderDetails(id) {
    const node = nodeById(id);

    if (!node) return;

    const currentRoadmap = selectedRoadmap;

    detailEl.innerHTML = `
        <span class="detail-symbol">◎</span>
        <h3 id="detail-title"></h3>
        <p id="detail-description"></p>
        <p class="subhead">Prerequisites</p>
        <div class="prereq-list" id="prereq-list">
            <span class="skill-status">Loading...</span>
        </div>
        <p class="subhead">Learning status</p>
        <button id="complete-toggle" class="complete-toggle"></button>
    `;

    detailEl.querySelector('#detail-title').textContent = node.title;
    detailEl.querySelector('#detail-description').textContent =
        node.description;

    const completeButton = document.getElementById('complete-toggle');

    function updateCompleteButton() {
        completeButton.textContent = completed.has(id)
            ? '✓ Mark as not complete'
            : '＋ Mark as complete';
    }

    updateCompleteButton();

    completeButton.addEventListener('click', () => {
        if (completed.has(id)) {
            completed.delete(id);
        } else {
            completed.add(id);
        }

        localStorage.setItem(
            saveKey(),
            JSON.stringify([...completed])
        );

        renderGraph();
        renderDetails(id);
    });

    try {
        const result = await api(
            `/api/prereq?roadmap=${encodeURIComponent(currentRoadmap)}` +
            `&skill=${encodeURIComponent(id)}`
        );

        if (
            selectedRoadmap !== currentRoadmap ||
            selectedId !== id
        ) {
            return;
        }

        const list = document.getElementById('prereq-list');
        list.innerHTML = '';

        if (result.prerequisites.length === 0) {
            list.textContent = 'No prerequisites — start here!';
            return;
        }

        result.prerequisites.forEach(prerequisiteId => {
            const prerequisite = nodeById(prerequisiteId);

            if (!prerequisite) return;

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'prereq-pill';
            pill.textContent = prerequisite.title;

            pill.addEventListener('click', () => {
                selectedId = prerequisite.id;
                renderGraph();
                renderDetails(prerequisite.id);
            });

            list.appendChild(pill);
        });
    } catch (error) {
        const list = document.getElementById('prereq-list');

        if (list) {
            list.textContent = `Could not load prerequisites: ${error.message}`;
        }
    }
}

/* ===========================
   PROGRESS TRACKING
=========================== */

function updateProgress() {
    const count = graphData.nodes.filter(
        node => completed.has(node.id)
    ).length;

    document.getElementById('progress-text').textContent =
        `${count} / ${graphData.nodes.length}`;

    const percentage = graphData.nodes.length
        ? count / graphData.nodes.length * 100
        : 0;

    document.getElementById('progress-fill').style.width =
        `${percentage}%`;

    document.getElementById('skill-count').textContent =
        graphData.nodes.length;
}

/* ===========================
   C++ ALGORITHMS
=========================== */

function formatOrder(ids) {
    return ids
        .map(id => nodeById(id)?.title || id)
        .join(' → ');
}

async function runAlgorithm(name) {
    outputEl.textContent = 'Running C++ algorithm...';

    try {
        const roadmap = encodeURIComponent(selectedRoadmap);
        let result;

        if (name === 'bfs' || name === 'dfs') {
            const start = selectedId || graphData.nodes[0]?.id || '';

            result = await api(
                `/api/${name}?roadmap=${roadmap}` +
                `&start=${encodeURIComponent(start)}`
            );
        } else {
            result = await api(`/api/${name}?roadmap=${roadmap}`);
        }

        if (name === 'cycle') {
            outputEl.textContent = result.hasCycle
                ? 'Cycle detected: the prerequisite graph contains a cycle.'
                : 'No cycle detected: the prerequisite graph is a DAG.';
        } else {
            const labels = {
                bfs: 'Breadth-First Search',
                dfs: 'Depth-First Search',
                topo: 'Topological Sort'
            };

            outputEl.textContent =
                `${labels[name]}: ${formatOrder(result.order) || 'No skills found'}`;
        }
    } catch (error) {
        outputEl.textContent =
            `Error: ${error.message}. Check that the C++ server is running.`;
    }
}

/* ===========================
   ROADMAP SWITCHING
=========================== */

async function switchRoadmap(id) {
    if (id === selectedRoadmap) return;

    selectedRoadmap = id;

    localStorage.setItem('skillgraph-roadmap-v1', id);

    selectedId = '';
    graphData = { nodes: [], edges: [] };

    loadCompleted();
    renderRoadmapTabs();

    graphEl.innerHTML =
        '<p class="loading">Loading roadmap graph...</p>';

    detailEl.innerHTML = `
        <span class="detail-symbol">◎</span>
        <h3>Choose a skill</h3>
        <p>Select a graph node to view its details.</p>
    `;

    outputEl.textContent =
        'Choose an algorithm to explore this roadmap.';

    await loadSelectedRoadmap();
}

async function loadSelectedRoadmap() {
    const currentRoadmap = selectedRoadmap;

    try {
        const roadmap = roadmaps.find(
            item => item.id === currentRoadmap
        );

        const data = await api(
            `/api/graph?roadmap=${encodeURIComponent(currentRoadmap)}`
        );

        if (currentRoadmap !== selectedRoadmap) return;

        graphData = data;

        document.getElementById('map-title').textContent =
            roadmap ? `${roadmap.title} skills` : 'Skills overview';

        document.getElementById('map-description').textContent =
            roadmap
                ? roadmap.description
                : 'Select a node to explore its prerequisites.';

        selectedId = graphData.nodes[0]?.id || '';

        renderRoadmapTabs();
        renderGraph();

        if (selectedId) {
            renderDetails(selectedId);
        }
    } catch (error) {
        graphEl.innerHTML =
            `<p class="loading">Could not load graph: ${error.message}</p>`;
    }
}

/* ===========================
   START APPLICATION
=========================== */

searchEl.addEventListener('input', renderGraph);

document.querySelectorAll('[data-algo]').forEach(button => {
    button.addEventListener('click', () => {
        runAlgorithm(button.dataset.algo);
    });
});

let resizeTimer;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderGraph, 120);
});

async function init() {
    try {
        const data = await api('/api/roadmaps');
        roadmaps = data.roadmaps;

        if (!roadmaps.some(item => item.id === selectedRoadmap)) {
            selectedRoadmap = 'cpp-dsa';
        }

        loadCompleted();
        renderRoadmapTabs();

        await loadSelectedRoadmap();
    } catch (error) {
        roadmapTabsEl.innerHTML =
            '<p class="loading">Could not load roadmaps. Start run.bat.</p>';

        graphEl.innerHTML =
            '<p class="loading">Could not load the graph. Check the server.</p>';
    }
}

init();
