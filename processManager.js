/**
 * Process Manager Module
 * 
 * Manages spawned video playback and recording processes to prevent orphaned processes.
 * 
 * @module processManager
 */

import { logError } from './errorHandling.js';

/**
 * @typedef {Object} ProcessInfo
 * @property {number} pid - Process ID
 * @property {string} type - Process type ('playback' or 'recording')
 * @property {ChildProcess} process - Child process instance
 * @property {string} url - Video URL
 * @property {string} [filename] - Output filename (for recordings)
 * @property {Date} startedAt - When the process was started
 */

/**
 * Map of active video processes
 * @type {Map<number, ProcessInfo>}
 */
export const videoProcesses = new Map();

/**
 * Registers a new video process
 * @param {ChildProcess} process - Child process instance
 * @param {string} type - Process type ('playback' or 'recording')
 * @param {string} url - Video URL
 * @param {string} [filename] - Output filename (for recordings)
 * @returns {number} Process ID
 */
export function registerProcess(process, type, url, filename = null) {
  const processInfo = {
    pid: process.pid,
    type,
    process,
    url,
    filename,
    startedAt: new Date()
  };
  
  videoProcesses.set(process.pid, processInfo);
  
  // Set up automatic cleanup when process exits
  process.on('exit', (code) => {
    console.error(`[Process ${process.pid}] ${type} process exited with code ${code}`);
    videoProcesses.delete(process.pid);
  });
  
  process.on('error', (error) => {
    logError('system', `process-${process.pid}`, error);
    videoProcesses.delete(process.pid);
  });
  
  return process.pid;
}

/**
 * Stops a video process
 * @param {number} pid - Process ID to stop
 * @param {boolean} graceful - Use SIGTERM instead of SIGKILL (default: true)
 * @returns {boolean} True if process was found and stopped
 */
export function stopProcess(pid, graceful = true) {
  const processInfo = videoProcesses.get(pid);
  
  if (!processInfo) {
    return false;
  }
  
  try {
    const signal = graceful ? 'SIGTERM' : 'SIGKILL';
    processInfo.process.kill(signal);
    
    // Give it a moment, then force kill if still running
    if (graceful) {
      setTimeout(() => {
        if (videoProcesses.has(pid)) {
          try {
            processInfo.process.kill('SIGKILL');
          } catch (err) {
            // Process already dead, ignore
          }
        }
      }, 2000);
    }
    
    return true;
  } catch (error) {
    logError('system', `stop-process-${pid}`, error);
    videoProcesses.delete(pid);
    return false;
  }
}

/**
 * Gets information about a specific process
 * @param {number} pid - Process ID
 * @returns {ProcessInfo|null} Process information or null if not found
 */
export function getProcessInfo(pid) {
  return videoProcesses.get(pid) || null;
}

/**
 * Gets all active processes
 * @param {string} [type] - Filter by type ('playback' or 'recording')
 * @returns {Array<ProcessInfo>} Array of process information
 */
export function getAllProcesses(type = null) {
  const processes = Array.from(videoProcesses.values());
  
  if (type) {
    return processes.filter(p => p.type === type);
  }
  
  return processes;
}

/**
 * Stops all active video processes
 * @param {boolean} graceful - Use SIGTERM instead of SIGKILL (default: true)
 * @returns {number} Number of processes stopped
 */
export function stopAllProcesses(graceful = true) {
  const pids = Array.from(videoProcesses.keys());
  let stoppedCount = 0;
  
  for (const pid of pids) {
    if (stopProcess(pid, graceful)) {
      stoppedCount++;
    }
  }
  
  return stoppedCount;
}

/**
 * Checks if a process is still running
 * @param {number} pid - Process ID
 * @returns {boolean} True if process is active
 */
export function isProcessActive(pid) {
  return videoProcesses.has(pid);
}

/**
 * Gets process statistics
 * @returns {Object} Statistics about active processes
 */
export function getProcessStats() {
  const processes = Array.from(videoProcesses.values());
  
  return {
    total: processes.length,
    playback: processes.filter(p => p.type === 'playback').length,
    recording: processes.filter(p => p.type === 'recording').length,
    oldestStartedAt: processes.length > 0 
      ? new Date(Math.min(...processes.map(p => p.startedAt.getTime())))
      : null
  };
}
