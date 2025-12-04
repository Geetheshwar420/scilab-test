import Editor from '@monaco-editor/react';
import { useState } from 'react';

export default function CodingWorkspace({ initialCode, onRun, onSubmit, output, status, imageData, disabled }) {
    const [code, setCode] = useState(initialCode || '// Write your Scilab code here\n');
    const [input, setInput] = useState('');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Editor
                    height="70%"
                    defaultLanguage="python" // Scilab syntax highlighting isn't built-in, Python is close enough for basic highlighting
                    value={code}
                    onChange={(value) => setCode(value)}
                    theme="vs-dark"
                />
                <div style={{ height: '30%', padding: '10px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--color-text)', fontSize: '0.9rem' }}>Standard Input (stdin):</label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter input values here (e.g., numbers, strings) separated by newlines..."
                        style={{
                            width: '100%',
                            height: 'calc(100% - 25px)',
                            background: 'var(--color-background)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            padding: '8px',
                            fontFamily: 'monospace',
                            resize: 'none'
                        }}
                    />
                </div>
            </div>
            <div style={{ height: '200px', background: 'var(--color-background)', color: 'var(--color-text)', padding: '15px', overflow: 'auto', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>Output Terminal:</span>
                    <div>
                        <button
                            onClick={() => onRun(code, input)}
                            disabled={status === 'running' || disabled}
                            className="btn btn-primary"
                            style={{ padding: '5px 15px', fontSize: '0.9rem' }}
                        >
                            {status === 'running' ? 'Running...' : 'Run / Test'}
                        </button>
                        <button
                            onClick={() => onSubmit(code, input)}
                            className="btn btn-success"
                            style={{ padding: '5px 15px', fontSize: '0.9rem', marginLeft: '10px', background: 'var(--color-success, #10b981)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Submit Code
                        </button>
                    </div>
                </div>
                <pre style={{
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '10px',
                    borderRadius: '4px',
                    minHeight: '100px',
                    whiteSpace: 'pre-wrap'
                }}>{output || 'Ready to execute...'}</pre>
                {imageData && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Generated Graph:</strong>
                        <img
                            src={`data:image/png;base64,${imageData}`}
                            alt="Generated Plot"
                            style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
