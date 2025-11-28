import Editor from '@monaco-editor/react';
import { useState } from 'react';

export default function CodingWorkspace({ initialCode, onRun, output, status }) {
    const [code, setCode] = useState(initialCode || '// Write your Scilab code here\n');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
                <Editor
                    height="100%"
                    defaultLanguage="python" // Scilab syntax highlighting isn't built-in, Python is close enough for basic highlighting
                    value={code}
                    onChange={(value) => setCode(value)}
                    theme="vs-dark"
                />
            </div>
            <div style={{ height: '150px', background: '#1e1e1e', color: 'white', padding: '10px', overflow: 'auto', borderTop: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>Output:</span>
                    <button onClick={() => onRun(code)} disabled={status === 'running'}>
                        {status === 'running' ? 'Running...' : 'Run Code'}
                    </button>
                </div>
                <pre>{output}</pre>
            </div>
        </div>
    );
}
