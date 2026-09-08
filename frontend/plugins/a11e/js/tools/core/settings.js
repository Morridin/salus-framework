// Central store for the active tool and its options.
//
// Previously the active tool id, brush radius, and tolerance lived as
// closure variables in tool-controller.js while validation lived in
// toolbar-bridge.js, so adding an option touched both files. All reads and
// writes now go through here: defaults and sanitizers derive from the
// registry, unknown tool ids are rejected, and invalid option values keep
// their current setting.
import {
    NO_TOOL,
    TOOL_OPTION_DEFS,
    getDefaultToolOptions,
    isKnownToolId,
} from "./registry.js";

/**
 * @typedef {object} ToolSelection
 * @property {string} [tool] active tool id (defaults to current)
 * @property {unknown} [brushRadius] raw value; invalid keeps current
 * @property {unknown} [brushTolerance] raw value; invalid keeps current
 */

/**
 * @typedef {object} ToolSettingsState
 * @property {string} tool
 * @property {number} brushRadius
 * @property {number} brushTolerance
 */

export const DEFAULT_TOOL_SETTINGS = {
    tool: NO_TOOL,
    ...getDefaultToolOptions(),
};

/**
 * @param {Record<string, unknown>} [initial]
 */
export function createToolSettings(initial = {}) {
    let state = {...DEFAULT_TOOL_SETTINGS};
    const listeners = new Set();

    function notify() {
        const snapshot = {...state};
        listeners.forEach(listener => listener(snapshot));
    }

    /**
     * @param {(state: ToolSettingsState) => void} listener
     * @returns {() => void} unsubscribe
     */
    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    /**
     * @returns {ToolSettingsState} defensive copy
     */
    function getState() {
        return {...state};
    }

    /**
     * @param {string} name option name from TOOL_OPTION_DEFS
     * @returns {number | undefined}
     */
    function getOption(name) {
        return state[name];
    }

    function applyRawOptions(base, rawOptions) {
        let next = base;
        for (const name of Object.keys(TOOL_OPTION_DEFS)) {
            if (!(name in rawOptions)) continue;
            const sanitized = TOOL_OPTION_DEFS[name].sanitize(rawOptions[name]);
            if (sanitized !== null) {
                next = {...next, [name]: sanitized};
            }
        }
        return next;
    }

    // Unknown tool ids are rejected defensively (the toolbar bridge already
    // filters them); invalid option values keep their current setting.
    /**
     * @param {ToolSelection} [selection]
     * @returns {ToolSettingsState}
     */
    function select(selection = {}) {
        const {tool = state.tool, ...rawOptions} = selection ?? {};
        if (!isKnownToolId(tool)) return getState();
        state = applyRawOptions({...state, tool}, rawOptions);
        notify();
        return getState();
    }

    if (initial && Object.keys(initial).length > 0) {
        const {tool = state.tool, ...rawOptions} = initial;
        if (isKnownToolId(tool)) {
            state = applyRawOptions({...state, tool}, rawOptions);
        }
    }

    return {getState, getOption, select, subscribe};
}
