'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type PromptOptions = {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
};

type FeedbackContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const [confirmResolver, setConfirmResolver] = useState<((value: boolean) => void) | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptResolver, setPromptResolver] = useState<((value: string | null) => void) | null>(null);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    if (!message.trim()) return;

    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2200);
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => toast(String(message ?? ''), 'info');

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  const confirm = useCallback((options: ConfirmOptions | string) => (
    new Promise<boolean>((resolve) => {
      setConfirmOptions(typeof options === 'string' ? { message: options } : options);
      setConfirmResolver(() => resolve);
    })
  ), []);

  const prompt = useCallback((options: PromptOptions | string) => (
    new Promise<string | null>((resolve) => {
      const nextOptions = typeof options === 'string' ? { message: options } : options;
      setPromptOptions(nextOptions);
      setPromptValue(nextOptions.defaultValue || '');
      setPromptResolver(() => resolve);
    })
  ), []);

  const closeConfirm = (value: boolean) => {
    confirmResolver?.(value);
    setConfirmResolver(null);
    setConfirmOptions(null);
  };

  const closePrompt = (value: string | null) => {
    promptResolver?.(value);
    setPromptResolver(null);
    setPromptOptions(null);
    setPromptValue('');
  };

  const value = useMemo(() => ({ toast, confirm, prompt }), [confirm, prompt, toast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`w-full max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
              item.kind === 'success'
                ? 'border-green-100 bg-green-600 text-white'
                : item.kind === 'error'
                  ? 'border-red-100 bg-red-600 text-white'
                  : 'border-gray-100 bg-gray-900 text-white'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>

      {confirmOptions ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-gray-900">{confirmOptions.title || '확인'}</h2>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-gray-600">
              {confirmOptions.message}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-700"
              >
                {confirmOptions.cancelText || '취소'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`h-11 rounded-xl text-sm font-black text-white ${
                  confirmOptions.danger ? 'bg-red-600' : 'bg-indigo-600'
                }`}
              >
                {confirmOptions.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {promptOptions ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <form
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              closePrompt(promptValue);
            }}
          >
            <h2 className="text-lg font-black text-gray-900">{promptOptions.title || '입력'}</h2>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-gray-600">
              {promptOptions.message}
            </p>
            <input
              autoFocus
              value={promptValue}
              inputMode={promptOptions.inputMode}
              onChange={(event) => setPromptValue(event.target.value)}
              className="mt-4 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white"
            />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closePrompt(null)}
                className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-700"
              >
                {promptOptions.cancelText || '취소'}
              </button>
              <button type="submit" className="h-11 rounded-xl bg-indigo-600 text-sm font-black text-white">
                {promptOptions.confirmText || '확인'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}
