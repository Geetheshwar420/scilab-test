require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const AGENT_KEY = process.env.AGENT_SECRET_KEY || 'secret';
const FILTER_USER_ID = process.env.FILTER_USER_ID; // Optional: Only run jobs for this user
const EXECUTION_MODE = process.env.EXECUTION_MODE || 'server'; // 'server' or 'local'
const POLLING_INTERVAL = 2000; // 2 seconds

const pollJobs = async () => {
    try {
        const headers = {
            'x-agent-key': AGENT_KEY,
            'x-execution-mode': EXECUTION_MODE
        };
        if (FILTER_USER_ID) {
            headers['x-filter-user-id'] = FILTER_USER_ID;
            console.log(`Polling for user: ${FILTER_USER_ID} (Mode: ${EXECUTION_MODE})`);
        } else {
            console.log(`Polling for jobs (Mode: ${EXECUTION_MODE})`);
        }

        const response = await axios.get(`${BACKEND_URL}/agent/jobs`, { headers });

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
    const scilabPath = 'C:\\Program Files\\scilab-2026.0.0\\bin\\WScilex-cli.exe';

    let scilabCmd;
    if (job.input) {
        const inputPath = path.join(tempDir, 'input.txt');
        await fs.writeFile(inputPath, job.input);
        // Pipe input.txt to Scilab
        // Note: Windows cmd piping
        scilabCmd = `type "${inputPath}" | "${scilabPath}" -nb -f "${scriptPath}"`;
    } else {
        scilabCmd = `"${scilabPath}" -nb -f "${scriptPath}"`;
    }

    let output = '';
    let status = 'completed';
    let score = 0;

    let imageData = null;

    try {
        const { stdout, stderr } = await execPromise(scilabCmd, { timeout: 10000 }); // 10s timeout
        output = stdout + stderr; // Scilab often prints to stdout even for errors, or mixed

        console.log(`Job ${job.id} completed`);

        // Check for generated images (e.g., *.png)
        const files = await fs.readdir(tempDir);
        const imageFile = files.find(f => f.endsWith('.png'));
        if (imageFile) {
            const imagePath = path.join(tempDir, imageFile);
            const imageBuffer = await fs.readFile(imagePath);
            imageData = imageBuffer.toString('base64');
            console.log(`Captured image: ${imageFile}`);
        }
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
            image: imageData,
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
