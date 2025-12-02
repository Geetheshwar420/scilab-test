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
            <div style={{ height: '200px', background: 'var(--color-background)', color: 'var(--color-text)', padding: '15px', overflow: 'auto', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Output Terminal:</span>
                    <button
                        onClick={() => onRun(code)}
                        disabled={status === 'running'}
                        className="btn btn-primary"
                        style={{ padding: '5px 15px', fontSize: '0.9rem' }}
                    >
                        {status === 'running' ? 'Running...' : 'Run Code'}
                    </button>
                </div>
                <pre style={{
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '10px',
                    borderRadius: '4px',
                    minHeight: '100px',
                    whiteSpace: 'pre-wrap'
                }}>{output || 'Ready to execute...'}</pre>
            </div>
        </div>
    );
}
