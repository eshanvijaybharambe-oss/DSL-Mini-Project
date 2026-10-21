#include <iostream>
#include <vector>
#include <queue>
#include <string>
#include <algorithm>

using namespace std;

struct Node {
    string id;
    string title;
    string description;
};

struct RoadmapInfo {
    string id;
    string title;
    string description;
};

vector<Node> nodes;
vector<vector<int>> adj;

vector<RoadmapInfo> getRoadmapList() {
    return {
        {"cpp-dsa", "C++ and DSA",
         "Build your programming and problem-solving foundation."},

        {"web-dev", "Web Development",
         "Learn to create websites and connect them to a server."},

        {"python-ai", "Python and AI",
         "Move from Python basics to a first machine-learning project."},

        {"cybersecurity", "Cybersecurity",
         "Learn the foundations of networks, systems and security."}
    };
}

// Each arrow means prerequisite -> dependent skill.
bool loadRoadmap(const string& id) {
    nodes.clear();
    adj.clear();

    if (id == "cpp-dsa") {
        nodes = {
            {"cpp", "C++ Basics",
             "Learn variables, conditions, loops, functions and basic problem solving."},

            {"dsa", "DSA Foundations",
             "Understand how data structures and algorithms work."},

            {"arrays", "Arrays and Strings",
             "Practice indexing, traversal, searching and string operations."},

            {"linked", "Linked Lists",
             "Learn nodes, pointers and linked-list operations."},

            {"stacks", "Stacks and Queues",
             "Understand LIFO and FIFO data structures."},

            {"trees", "Trees",
             "Learn tree nodes, traversal and binary search trees."},

            {"graphs", "Graph Algorithms",
             "Learn graph traversal, dependencies, paths and cycle detection."},

            {"project", "DSA Practice Project",
             "Use your data structures and algorithms to solve a problem."}
        };

        adj = {
            {1},
            {2, 3, 4, 5},
            {},
            {},
            {7},
            {6},
            {7},
            {}
        };
    }
    else if (id == "web-dev") {
        nodes = {
            {"html", "HTML Basics",
             "Build a page using headings, links, forms and sections."},

            {"css", "CSS Basics",
             "Style pages with colours, spacing, layouts and responsive design."},

            {"js", "JavaScript Basics",
             "Add interaction using variables, functions and events."},

            {"responsive", "Responsive Design",
             "Make websites work on phones, tablets and desktops."},

            {"frontend", "Frontend Project",
             "Combine HTML, CSS and JavaScript into an interface."},

            {"node", "Node.js Basics",
             "Run JavaScript outside the browser and create a server."},

            {"api", "APIs and JSON",
             "Connect a frontend to a server and exchange JSON data."},

            {"webproject", "Full Web Project",
             "Build a small website with frontend and backend components."}
        };

        adj = {
            {1, 2},
            {3},
            {4},
            {4},
            {5},
            {6},
            {7},
            {}
        };
    }
    else if (id == "python-ai") {
        nodes = {
            {"python", "Python Basics",
             "Learn variables, conditions, loops, functions and collections."},

            {"numpy", "NumPy Basics",
             "Work with arrays and numerical operations."},

            {"pandas", "Pandas Basics",
             "Explore tabular data using data frames."},

            {"statistics", "Basic Statistics",
             "Understand averages, probability and data patterns."},

            {"cleaning", "Data Preparation",
             "Handle missing values and prepare datasets."},

            {"ml", "Machine Learning Basics",
             "Understand features, labels, training and model types."},

            {"evaluation", "Model Evaluation",
             "Use test data and metrics to evaluate a model."},

            {"aiproject", "First AI Project",
             "Build a beginner-friendly prediction project."}
        };

        adj = {
            {1, 2, 3},
            {4},
            {4},
            {5},
            {5},
            {6},
            {7},
            {}
        };
    }
    else if (id == "cybersecurity") {
        nodes = {
            {"network", "Networking Basics",
             "Learn IP addresses, ports, DNS, HTTP and network communication."},

            {"linux", "Linux Basics",
             "Learn terminal commands, files and permissions."},

            {"pythonsec", "Python for Security",
             "Use simple Python scripts for safe automation."},

            {"crypto", "Cryptography Basics",
             "Understand hashing, encryption and secure keys."},

            {"websec", "Web Security Basics",
             "Learn common web security risks and prevention."},

            {"tools", "Security Tools",
             "Understand diagnostic tools for authorized lab work."},

            {"practice", "Safe Lab Practice",
             "Practise only on systems you own or have permission to test."},

            {"secproject", "Security Awareness Project",
             "Create a project that teaches safe security practices."}
        };

        adj = {
            {4, 5},
            {5},
            {5},
            {6},
            {6},
            {6},
            {7},
            {}
        };
    }
    else {
        return false;
    }

    return true;
}

int findNode(const string& id) {
    for (int i = 0; i < (int)nodes.size(); i++) {
        if (nodes[i].id == id) {
            return i;
        }
    }

    return -1;
}

void printStringArray(const vector<int>& order) {
    cout << "[";

    for (int i = 0; i < (int)order.size(); i++) {
        if (i > 0) cout << ",";

        cout << "\"" << nodes[order[i]].id << "\"";
    }

    cout << "]";
}

// Breadth-First Search
vector<int> bfs(int start) {
    vector<int> order;
    vector<bool> visited(nodes.size(), false);
    queue<int> q;

    q.push(start);
    visited[start] = true;

    while (!q.empty()) {
        int current = q.front();
        q.pop();

        order.push_back(current);

        for (int next : adj[current]) {
            if (!visited[next]) {
                visited[next] = true;
                q.push(next);
            }
        }
    }

    return order;
}

// Depth-First Search
void dfsVisit(
    int current,
    vector<bool>& visited,
    vector<int>& order
) {
    visited[current] = true;
    order.push_back(current);

    for (int next : adj[current]) {
        if (!visited[next]) {
            dfsVisit(next, visited, order);
        }
    }
}

vector<int> dfs(int start) {
    vector<int> order;
    vector<bool> visited(nodes.size(), false);

    dfsVisit(start, visited, order);

    return order;
}

// Topological sorting
vector<int> topologicalSort() {
    vector<int> indegree(nodes.size(), 0);

    for (const auto& edges : adj) {
        for (int next : edges) {
            indegree[next]++;
        }
    }

    queue<int> q;

    for (int i = 0; i < (int)indegree.size(); i++) {
        if (indegree[i] == 0) {
            q.push(i);
        }
    }

    vector<int> order;

    while (!q.empty()) {
        int current = q.front();
        q.pop();

        order.push_back(current);

        for (int next : adj[current]) {
            indegree[next]--;

            if (indegree[next] == 0) {
                q.push(next);
            }
        }
    }

    return order;
}

// Detect a cycle in the directed graph
bool hasCycle() {
    vector<int> indegree(nodes.size(), 0);

    for (const auto& edges : adj) {
        for (int next : edges) {
            indegree[next]++;
        }
    }

    queue<int> q;

    for (int i = 0; i < (int)indegree.size(); i++) {
        if (indegree[i] == 0) {
            q.push(i);
        }
    }

    int count = 0;

    while (!q.empty()) {
        int current = q.front();
        q.pop();
        count++;

        for (int next : adj[current]) {
            indegree[next]--;

            if (indegree[next] == 0) {
                q.push(next);
            }
        }
    }

    return count != (int)nodes.size();
}

// Find all prerequisite skills for a selected skill
vector<int> prerequisites(int target) {
    vector<vector<int>> reverseAdj(nodes.size());

    for (int i = 0; i < (int)adj.size(); i++) {
        for (int next : adj[i]) {
            reverseAdj[next].push_back(i);
        }
    }

    vector<bool> visited(nodes.size(), false);
    queue<int> q;
    vector<int> found;

    q.push(target);
    visited[target] = true;

    while (!q.empty()) {
        int current = q.front();
        q.pop();

        for (int previous : reverseAdj[current]) {
            if (!visited[previous]) {
                visited[previous] = true;
                found.push_back(previous);
                q.push(previous);
            }
        }
    }

    sort(found.begin(), found.end());

    return found;
}

int main(int argc, char* argv[]) {
    string command = argc > 1 ? argv[1] : "graph";
    string roadmapId = argc > 2 ? argv[2] : "cpp-dsa";

    // Return the list of available roadmaps
    if (command == "roadmaps") {
        vector<RoadmapInfo> roads = getRoadmapList();

        cout << "{\"roadmaps\":[";

        for (int i = 0; i < (int)roads.size(); i++) {
            if (i > 0) cout << ",";

            cout << "{\"id\":\"" << roads[i].id
                 << "\",\"title\":\"" << roads[i].title
                 << "\",\"description\":\"" << roads[i].description
                 << "\"}";
        }

        cout << "]}";
        return 0;
    }

    if (!loadRoadmap(roadmapId)) {
        cout << "{\"error\":\"Unknown roadmap\"}";
        return 0;
    }

    // Return roadmap skills and graph connections
    if (command == "graph") {
        cout << "{\"roadmap\":\"" << roadmapId << "\",\"nodes\":[";

        for (int i = 0; i < (int)nodes.size(); i++) {
            if (i > 0) cout << ",";

            cout << "{\"id\":\"" << nodes[i].id
                 << "\",\"title\":\"" << nodes[i].title
                 << "\",\"description\":\"" << nodes[i].description
                 << "\"}";
        }

        cout << "],\"edges\":[";

        bool first = true;

        for (int i = 0; i < (int)adj.size(); i++) {
            for (int next : adj[i]) {
                if (!first) cout << ",";
                first = false;

                cout << "[\"" << nodes[i].id
                     << "\",\"" << nodes[next].id << "\"]";
            }
        }

        cout << "]}";
    }
    else if (command == "bfs" || command == "dfs") {
        int start = findNode(
            argc > 3 ? argv[3] : nodes[0].id
        );

        if (start < 0) {
            cout << "{\"error\":\"Unknown starting skill\"}";
            return 0;
        }

        vector<int> order =
            command == "bfs" ? bfs(start) : dfs(start);

        cout << "{\"algorithm\":\""
             << (command == "bfs" ? "BFS" : "DFS")
             << "\",\"order\":";

        printStringArray(order);

        cout << "}";
    }
    else if (command == "prereq") {
        int target = findNode(
            argc > 3 ? argv[3] : nodes.back().id
        );

        if (target < 0) {
            cout << "{\"error\":\"Unknown skill\"}";
            return 0;
        }

        cout << "{\"skill\":\"" << nodes[target].id
             << "\",\"prerequisites\":";

        printStringArray(prerequisites(target));

        cout << "}";
    }
    else if (command == "topo") {
        vector<int> order = topologicalSort();

        cout << "{\"order\":";

        printStringArray(order);

        cout << "}";
    }
    else if (command == "cycle") {
        cout << "{\"hasCycle\":"
             << (hasCycle() ? "true" : "false")
             << "}";
    }
    else {
        cout << "{\"error\":\"Unknown command\"}";
    }

    return 0;
}