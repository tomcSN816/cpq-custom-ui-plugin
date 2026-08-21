'use client';

// Shows a step-by-step progress modal while a quote submission is in
// flight. The actual work happens server-side in one request — there's no
// real per-step progress to stream — so this simulates advancing through
// `steps` while the request runs, and jumps straight to the final result
// (success or error) the moment the real response comes back, whichever
// happens first. This is an honest UX pattern (it's not lying about real
// progress, just giving the user something more informative than a bare
// spinner) as long as the step labels describe what the request is
// actually doing server-side.
//
// Usage: see ConfiguratorDemo.jsx's handleSubmit for the full pattern —
// call `start()`, run your fetch, then call `succeed(message)` or
// `fail(message)` when it resolves.
import { useCallback, useRef, useState } from 'react';

export function useSubmitProgress(steps) {
  const [status, setStatus] = useState('idle'); // idle | running | success | error
  const [stepIndex, setStepIndex] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setStatus('running');
    setStepIndex(0);
    setResultMessage('');
    intervalRef.current = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 700);
  }, [steps.length]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
  }, []);

  const succeed = useCallback((message) => {
    stop();
    setStepIndex(steps.length - 1);
    setResultMessage(message ?? '');
    setStatus('success');
  }, [stop, steps.length]);

  const fail = useCallback((message) => {
    stop();
    setResultMessage(message ?? 'Something went wrong.');
    setStatus('error');
  }, [stop]);

  const close = useCallback(() => {
    stop();
    setStatus('idle');
  }, [stop]);

  return { status, stepIndex, resultMessage, start, succeed, fail, close };
}

export default function SubmitProgressModal({ steps, status, stepIndex, resultMessage, onClose }) {
  if (status === 'idle') return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2 style={{ marginTop: 0 }}>
          {status === 'success' ? 'Quote submitted' : status === 'error' ? 'Submission failed' : 'Submitting your quote…'}
        </h2>

        <div className="modal-steps">
          {steps.map((label, i) => {
            const isDone = status === 'success' || i < stepIndex;
            const isActive = status === 'running' && i === stepIndex;
            const isError = status === 'error' && i === stepIndex;
            const cls = isError
              ? 'modal-step modal-step--error'
              : isDone
              ? 'modal-step modal-step--done'
              : isActive
              ? 'modal-step modal-step--active'
              : 'modal-step';
            return (
              <div key={label} className={cls}>
                <span className="modal-step__icon">{isDone ? '✓' : isError ? '!' : ''}</span>
                {label}
              </div>
            );
          })}
        </div>

        {resultMessage && (
          <p className={status === 'error' ? 'muted' : 'muted'} style={{ color: status === 'error' ? '#b42318' : undefined }}>
            {resultMessage}
          </p>
        )}

        {status !== 'running' && (
          <button className="button" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
