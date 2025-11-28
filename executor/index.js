require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const AGENT_KEY = process.env.AGENT_SECRET_KEY || 'secret';
const POLLING_INTERVAL = 2000; // 2 seconds

const pollJobs = async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/agent/jobs`, {
            headers: { 'x-agent-key': AGENT_KEY }
        });

        const { job } = response.data;

        if (job) {
            console.log(`Received job ${job.id}`);
            await processJob(job);
        }
    } catch (error) {
        console.error('Error polling jobs:', error.message);
    } finally {
        setTimeout(pollJobs, POLLING_INTERVAL);
    }
};

const processJob = async (job) => {
    const tempDir = path.join(__dirname, 'temp', job.id);
    await fs.ensureDir(tempDir);

    const scriptPath = path.join(tempDir, 'script.sci');
    await fs.writeFile(scriptPath, job.code);

    // Local Scilab Command
    // Assumes 'scilab-cli' is in the system PATH
    // -nwni: No window, no interaction
    // -f: Execute file
    // -nb: No banner
    const scilabCmd = `scilab-cli -nwni -nb -f "${scriptPath}"`;

    let output = '';
    let status = 'completed';
    let score = 0;

    try {
        const { stdout, stderr } = await execPromise(scilabCmd, { timeout: 10000 }); // 10s timeout
        output = stdout + stderr; // Scilab often prints to stdout even for errors, or mixed

        console.log(`Job ${job.id} completed`);
    } catch (error) {
        output = error.stdout + error.stderr;
        if (error.killed) {
            output += '\nExecution timed out.';
        }
        status = 'failed';
        console.error(`Job ${job.id} failed:`, error.message);
    }

    // Submit result
    try {
        await axios.post(`${BACKEND_URL}/agent/job-result`, {
            jobId: job.id,
            output,
            status,
            score
        }, {
            headers: { 'x-agent-key': AGENT_KEY }
        });
        console.log(`Result submitted for job ${job.id}`);
    } catch (error) {
        console.error('Error submitting result:', error.message);
    } finally {
        // Cleanup
        await fs.remove(tempDir);
    }
};

console.log('Executor Service Started');
console.log(`Backend URL: ${BACKEND_URL}`);
pollJobs();
