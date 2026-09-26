/**
 * Garment OS — Production Workspace Registry
 * 
 * Dynamic component registry that resolves and mounts specialized Stage Workspace controllers
 * based on the stage_code declared in the Work Order's immutable workflow version snapshot.
 */

class WorkspaceRegistry {
    constructor() {
        this.registry = new Map();
        this.aliases = new Map();
    }

    /**
     * Register a workspace controller for a given stage code
     */
    register(stageCode, workspaceController) {
        this.registry.set(String(stageCode).toLowerCase(), workspaceController);
    }

    /**
     * Register an alias for backward compatibility or alternate stage naming
     */
    registerAlias(aliasCode, targetStageCode) {
        this.aliases.set(String(aliasCode).toLowerCase(), String(targetStageCode).toLowerCase());
    }

    /**
     * Resolve the workspace controller for a stage code
     */
    resolve(stageCode) {
        if (!stageCode) return null;
        const normalized = String(stageCode).toLowerCase();
        
        if (this.registry.has(normalized)) {
            return this.registry.get(normalized);
        }

        if (this.aliases.has(normalized)) {
            const target = this.aliases.get(normalized);
            return this.registry.get(target) || null;
        }

        return null;
    }

    /**
     * Return all registered stage codes
     */
    getRegisteredStages() {
        return Array.from(this.registry.keys());
    }
}

export const workspaceRegistry = new WorkspaceRegistry();
