import { VyosManager, VyosRouter } from './vyos-manager.js';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface VyosAction {
    id: string;                    // Unique action ID
    offset_minutes: number;        // Offset within the cycle (0 to cycle_duration)
    router_id: string;             // Target router ID
    interface: string;             // Target interface
    command: string;               // e.g., 'interface-down', 'set-impairment'
    parameters?: {                 // Command parameters
        latency?: number;            // ms
        loss?: number;               // percent
        corrupt?: number;            // percent
        reorder?: number;            // percent
        rate?: string;               // rate limit, e.g., '10mbit'
        interface?: string;          // fallback for older scripts
    };
}

export interface VyosSequence {
    id: string;
    name: string;
    enabled: boolean;
    cycle_duration: number; // Cycle duration in minutes (replaces cycleMinutes)
    actions: VyosAction[];
    lastRun?: number;
    lastResult?: 'success' | 'failed';
}

export interface VyosExecutionLog {
    timestamp: number;
    sequenceId: string;
    sequenceName: string;
    results: {
        action: string;
        router: string;
        status: 'success' | 'failed';
        error?: string;
        duration: number;
    }[];
    overallStatus: 'success' | 'failed';
}

export class VyosScheduler extends EventEmitter {
    private sequencesFile: string;
    private logFile: string;
    private sequences: Map<string, VyosSequence> = new Map();
    private activeTimers: Map<string, NodeJS.Timeout[]> = new Map();

    constructor(private manager: VyosManager, configDir: string, logDir: string) {
        super();
        this.sequencesFile = path.join(configDir, 'vyos-sequences.json');
        this.logFile = path.join(logDir, 'vyos-history.jsonl');

        this.loadSequences();
        this.startAllScheduled();
    }

    private loadSequences() {
        if (fs.existsSync(this.sequencesFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.sequencesFile, 'utf8'));
                if (data.sequences && Array.isArray(data.sequences)) {
                    data.sequences.forEach((s: any) => {
                        // Migration: handle old cycleMinutes if present
                        if (s.cycleMinutes !== undefined && s.cycle_duration === undefined) {
                            s.cycle_duration = s.cycleMinutes;
                        }
                        this.sequences.set(s.id, s);
                    });
                }
            } catch (e) {
                console.error('[VYOS-SCHED] Failed to load sequences:', e);
            }
        }
    }

    private saveSequences() {
        try {
            const data = { sequences: Array.from(this.sequences.values()) };
            fs.writeFileSync(this.sequencesFile, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('[VYOS-SCHED] Failed to save sequences:', e);
        }
    }

    getSequences(): VyosSequence[] {
        return Array.from(this.sequences.values());
    }

    saveSequence(sequence: VyosSequence) {
        this.sequences.set(sequence.id, sequence);
        this.saveSequences();
        this.restartScheduled(sequence.id);
    }

    deleteSequence(id: string) {
        this.stopScheduled(id);
        this.sequences.delete(id);
        this.saveSequences();
    }

    private startAllScheduled() {
        for (const seq of this.sequences.values()) {
            if (seq.enabled && seq.cycle_duration > 0) {
                this.startScheduled(seq);
            }
        }
    }

    private startScheduled(seq: VyosSequence) {
        this.stopScheduled(seq.id);

        const cycleDurationMs = seq.cycle_duration * 60 * 1000;
        const timers: NodeJS.Timeout[] = [];

        console.log(`[VYOS-SCHED] Starting cyclic sequence "${seq.name}" (${seq.cycle_duration}min cycle)`);

        for (const action of seq.actions) {
            const offsetMs = action.offset_minutes * 60 * 1000;

            const executeAction = async () => {
                const startTime = Date.now();
                console.log(`[VYOS-SCHED] Executing action ${action.id} (offset=${action.offset_minutes}m)`);

                try {
                    this.emit('sequence:step', { sequenceId: seq.id, step: action.command, status: 'running' });

                    // Adapt to Manager's executeAction signature
                    await this.manager.executeAction(action.router_id, {
                        id: action.id,
                        offset_minutes: action.offset_minutes,
                        router_id: action.router_id,
                        command: action.command,
                        params: { ...action.parameters, interface: action.interface }
                    });

                    this.logActionExecution(seq.id, action, 'success');
                    this.emit('sequence:step', { sequenceId: seq.id, step: action.command, status: 'success' });
                } catch (error: any) {
                    console.error(`[VYOS-SCHED] Action ${action.id} failed:`, error.message);
                    this.logActionExecution(seq.id, action, 'failed', error.message);
                    this.emit('sequence:step', { sequenceId: seq.id, step: action.command, status: 'failed', error: error.message });
                }
            };

            // Initial execution
            if (offsetMs === 0) {
                executeAction();
            } else {
                timers.push(setTimeout(executeAction, offsetMs));
            }

            // Cyclic execution
            const cycleTimer = setInterval(() => {
                setTimeout(executeAction, offsetMs);
            }, cycleDurationMs);

            timers.push(cycleTimer);
        }

        this.activeTimers.set(seq.id, timers);
    }

    private stopScheduled(id: string) {
        const timers = this.activeTimers.get(id);
        if (timers && Array.isArray(timers)) {
            timers.forEach(timer => {
                // Clear both timeouts and intervals
                clearTimeout(timer);
                clearInterval(timer);
            });
            this.activeTimers.delete(id);
            console.log(`[VYOS-SCHED] Stopped timers for sequence ${id}`);
        }
    }

    private restartScheduled(id: string) {
        const seq = this.sequences.get(id);
        if (seq && seq.enabled && seq.cycle_duration > 0) {
            this.startScheduled(seq);
        } else {
            this.stopScheduled(id);
        }
    }

    private logActionExecution(
        sequenceId: string,
        action: VyosAction,
        status: 'success' | 'failed',
        error?: string
    ) {
        const seq = this.sequences.get(sequenceId);
        const log = {
            timestamp: Date.now(),
            sequence_id: sequenceId,
            sequence_name: seq?.name || 'Unknown',
            action_id: action.id,
            router_id: action.router_id,
            interface: action.interface,
            command: action.command,
            parameters: action.parameters,
            status,
            error
        };

        try {
            fs.appendFileSync(this.logFile, JSON.stringify(log) + '\n');
        } catch (e) {
            console.error('[VYOS-SCHED] Failed to log action:', e);
        }
    }

    async runSequenceManually(id: string): Promise<void> {
        const seq = this.sequences.get(id);
        if (!seq) throw new Error('Sequence not found');

        console.log(`[VYOS-SCHED] Manual execution: ${seq.name}`);

        // Execute all actions immediately (ignore offsets)
        for (const action of seq.actions) {
            try {
                await this.manager.executeAction(action.router_id, {
                    id: action.id,
                    offset_minutes: action.offset_minutes,
                    router_id: action.router_id,
                    command: action.command,
                    params: { ...action.parameters, interface: action.interface }
                });
                this.logActionExecution(seq.id, action, 'success');
            } catch (error: any) {
                this.logActionExecution(seq.id, action, 'failed', error.message);
            }
        }

        seq.lastRun = Date.now();
        this.saveSequences();
    }

    getHistory(limit: number = 50): any[] {
        if (!fs.existsSync(this.logFile)) return [];
        try {
            const lines = fs.readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
            return lines.slice(-limit).map(l => JSON.parse(l)).reverse();
        } catch (e) {
            console.error('[VYOS-SCHED] Failed to read history:', e);
            return [];
        }
    }
}
