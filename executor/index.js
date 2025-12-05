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
const POLLING_INTERVAL = 2000;
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
    // Add 'exit' command at the end to ensure Scilab terminates properly
    const scilabCode = job.code + '\nexit;';
    await fs.writeFile(scriptPath, scilabCode);

    // Find Scilab Path dynamically
    const findScilab = async () => {
        const programFiles = [
            process.env['ProgramFiles'],
            process.env['ProgramFiles(x86)']
        ].filter(Boolean);

        for (const root of programFiles) {
            try {
                const dirs = await fs.readdir(root);
                const scilabDir = dirs.find(d => d.toLowerCase().startsWith('scilab'));
                if (scilabDir) {
                    // Use WScilex-cli.exe for command line execution
                    const candidate = path.join(root, scilabDir, 'bin', 'WScilex-cli.exe');
                    if (await fs.pathExists(candidate)) return candidate;
                }
            } catch (e) {
                // Ignore access errors
            }
        }
        return null;
    };

    const scilabPath = await findScilab();

    if (!scilabPath) {
        console.error('Scilab executable not found!');
        // Fail the job immediately
        await axios.post(`${BACKEND_URL}/agent/job-result`, {
            jobId: job.id,
            output: 'Error: Scilab executable not found on the server. Please install Scilab.',
            status: 'failed',
            score: 0
        }, { headers: { 'x-agent-key': AGENT_KEY } });
        return;
    }

    let scilabCmd;
    if (job.input) {
        const inputPath = path.join(tempDir, 'input.txt');
        await fs.writeFile(inputPath, job.input);
        // Pipe input.txt to Scilab - use only -f flag (Scilab 2026.0.0 doesn't support -nb, -nw, -quit)
        scilabCmd = `type "${inputPath}" | "${scilabPath}" -f "${scriptPath}"`;
    } else {
        // Use only -f flag (Scilab 2026.0.0 doesn't support -nb, -nw, -quit)
        scilabCmd = `"${scilabPath}" -f "${scriptPath}"`;
    }

    let output = '';
    let status = 'completed';
    let score = 0;
    let imageData = null;

    try {
        const { stdout, stderr } = await execPromise(scilabCmd, { timeout: 60000 }); // Increased timeout to 60s
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

        if (error.killed || error.signal === 'SIGTERM') {
            output += '\n\n⏱️ Execution timed out after 60 seconds.';
            status = 'failed';
        } else if (error.code === 'ENOENT') {
            output = 'Error: Scilab executable not found or not accessible.';
            status = 'failed';
        } else {
            if (!output.trim()) {
                output = `Execution error: ${error.message}`;
            }
            status = 'failed';
        }

        console.error(`Job ${job.id} failed:`, error.message);
    }

    // Submit result with retry logic
    let retries = 3;
    let submitted = false;

    while (retries > 0 && !submitted) {
        try {
            await axios.post(`${BACKEND_URL}/agent/job-result`, {
                jobId: job.id,
                output,
                image: imageData,
                status,
                score
            }, {
                headers: { 'x-agent-key': AGENT_KEY },
                timeout: 10000
            });
            submitted = true;
        } catch (error) {
            retries--;
            console.error(`Error submitting result for job ${job.id} (${3 - retries}/3):`, error.message);
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
            }
        }
    }

    if (!submitted) {
        console.error(`Failed to submit result for job ${job.id} after 3 attempts. Job may be stuck.`);
    }

    // Cleanup
    await fs.remove(tempDir).catch(err => console.error(`Failed to cleanup ${tempDir}:`, err.message));
};

console.log('Executor Service Started (Concurrent Mode)');
console.log(`Backend URL: ${BACKEND_URL}`);
console.log(`Max Concurrent Jobs: ${MAX_CONCURRENT_JOBS}`);
pollJobs();
