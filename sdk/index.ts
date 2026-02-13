// Aidos SDK - Main Entry Point
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
export function createClient(config: {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}) {
  const client = new AidosClient(config);
  
  return {
    client,
    projects: new ProjectsAPI(client),
    requirements: new RequirementsAPI(client),
    tasks: new TasksAPI(client),
    agents: new AgentsAPI(client),
  };
}

// Default export for convenience
export default { createClient };
