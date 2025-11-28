export default function QuizSection({ questions, onAnswer }) {
    return (
        <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
            <h2>Quiz</h2>
            {questions.map((q, index) => (
                <div key={q.id} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                    <p><strong>{index + 1}. {q.question}</strong></p>

                    {q.type === 'mcq' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {q.options.map((opt) => (
                                <label key={opt}>
                                    <input
                                        type="radio"
                                        name={q.id}
                                        value={opt}
                                        onChange={(e) => onAnswer(q.id, e.target.value)}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}

                    {q.type === 'true_false' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <label>
                                <input
                                    type="radio"
                                    name={q.id}
                                    value="true"
                                    onChange={() => onAnswer(q.id, 'true')}
                                /> True
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name={q.id}
                                    value="false"
                                    onChange={() => onAnswer(q.id, 'false')}
                                /> False
                            </label>
                        </div>
                    )}

                    {q.type === 'short' && (
                        <input
                            type="text"
                            placeholder="Your answer"
                            onChange={(e) => onAnswer(q.id, e.target.value)}
                            style={{ width: '100%', padding: '5px' }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
