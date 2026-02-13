"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsAPI = exports.TasksAPI = exports.RequirementsAPI = exports.ProjectsAPI = exports.AidosError = exports.AidosClient = void 0;
exports.createClient = createClient;
// Aidos SDK - Main Entry Point
const AidosClient_1 = require("./AidosClient");
const projects_1 = require("./projects");
const requirements_1 = require("./requirements");
const tasks_1 = require("./tasks");
const agents_1 = require("./agents");
var AidosClient_2 = require("./AidosClient");
Object.defineProperty(exports, "AidosClient", { enumerable: true, get: function () { return AidosClient_2.AidosClient; } });
var types_1 = require("./types");
Object.defineProperty(exports, "AidosError", { enumerable: true, get: function () { return types_1.AidosError; } });
var projects_2 = require("./projects");
Object.defineProperty(exports, "ProjectsAPI", { enumerable: true, get: function () { return projects_2.ProjectsAPI; } });
var requirements_2 = require("./requirements");
Object.defineProperty(exports, "RequirementsAPI", { enumerable: true, get: function () { return requirements_2.RequirementsAPI; } });
var tasks_2 = require("./tasks");
Object.defineProperty(exports, "TasksAPI", { enumerable: true, get: function () { return tasks_2.TasksAPI; } });
var agents_2 = require("./agents");
Object.defineProperty(exports, "AgentsAPI", { enumerable: true, get: function () { return agents_2.AgentsAPI; } });
__exportStar(require("./types"), exports);
/**
 * Create a new Aidos SDK client
 * @param config - Client configuration
 * @returns Object containing all SDK APIs
 */
function createClient(config) {
    const client = new AidosClient_1.AidosClient(config);
    return {
        client,
        projects: new projects_1.ProjectsAPI(client),
        requirements: new requirements_1.RequirementsAPI(client),
        tasks: new tasks_1.TasksAPI(client),
        agents: new agents_1.AgentsAPI(client),
    };
}
// Default export for convenience
exports.default = { createClient };
//# sourceMappingURL=index.js.map