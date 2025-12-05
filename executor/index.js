require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const AGENT_KEY = process.env.AGENT_SECRET_KEY || 'secret';
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '10', 10);
let activeJobs = 0;

const pollJobs = async () => {
    // If we are at capacity, wait and retry
    if (activeJobs >= MAX_CONCURRENT_JOBS) {
        setTimeout(pollJobs, 1000);
        return;
    }

    try {
        const headers = {
            'x-agent-key': AGENT_KEY,
            'x-execution-mode': 'server' // Always server mode
        };



        const response = await axios.get(`${BACKEND_URL}/agent/jobs`, { headers });
        const { job } = response.data;

        if (job) {
            console.log(`Received job ${job.id}. Active jobs: ${activeJobs + 1}`);
            activeJobs++;

            // Process asynchronously (do not await)
            processJob(job).finally(() => {
                activeJobs--;
                console.log(`Job ${job.id} finished. Active jobs: ${activeJobs}`);
            });

            // Immediately poll for next job if we have capacity
            if (activeJobs < MAX_CONCURRENT_JOBS) {
                setImmediate(pollJobs);
                return;
            }
        }
    } catch (error) {
        console.error('Error polling jobs:', error.message);
    }

    // Wait before next poll if no job found or error
    setTimeout(pollJobs, POLLING_INTERVAL);
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
        scilabCmd = `type "${inputPath}" | "${scilabPath}" -nb -f "${scriptPath}"`;
    } else {
        scilabCmd = `"${scilabPath}" -nb -f "${scriptPath}"`;
    }

    let output = '';
    let status = 'completed';
    let score = 0;
    let imageData = null;

    try {
        const { stdout, stderr } = await execPromise(scilabCmd, { timeout: 15000 }); // Increased timeout to 15s
        output = stdout + stderr;

        // Check for generated images (e.g., *.png)
        const files = await fs.readdir(tempDir);
        const imageFile = files.find(f => f.endsWith('.png'));
        if (imageFile) {
            const imagePath = path.join(tempDir, imageFile);
            const imageBuffer = await fs.readFile(imagePath);
            imageData = imageBuffer.toString('base64');
        }
    } catch (error) {
        output = (error.stdout || '') + (error.stderr || '');
        if (error.killed) {
            output += '\nExecution timed out.';
        } else if (!output) {
            output = error.message;
        }
        status = 'failed';
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
    } catch (error) {
        console.error(`Error submitting result for job ${job.id}:`, error.message);
    } finally {
        // Cleanup
        await fs.remove(tempDir).catch(err => console.error(`Failed to cleanup ${tempDir}:`, err.message));
    }
};

console.log('Executor Service Started (Concurrent Mode)');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Max Concurrent Jobs: ${MAX_CONCURRENT_JOBS}`);
pollJobs();
