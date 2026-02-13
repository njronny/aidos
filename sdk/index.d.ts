import { AidosClient } from './AidosClient';
import { ProjectsAPI } from './projects';
import { RequirementsAPI } from './requirements';
import { TasksAPI } from './tasks';
import { AgentsAPI } from './agents';
export { AidosClient } from './AidosClient';
export { AidosError } from './types';
export { ProjectsAPI } from './projects';
export { RequirementsAPI } from './requirements';
export { TasksAPI } from './tasks';
export { AgentsAPI } from './agents';
export * from './types';
/**
 * Create a new Aidos SDK client
 * @param config - Client configuration
 * @returns Object containing all SDK APIs
 */
export declare function createClient(config: {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}): {
    client: AidosClient;
    projects: ProjectsAPI;
    requirements: RequirementsAPI;
    tasks: TasksAPI;
    agents: AgentsAPI;
};
declare const _default: {
    createClient: typeof createClient;
};
export default _default;
//# sourceMappingURL=index.d.ts.map