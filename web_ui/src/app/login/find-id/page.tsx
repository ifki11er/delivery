'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, ArrowLeft, Mail, AlertCircle } from 'lucide-react';

export default function FindIdPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS_EMAIL' | 'SUCCESS_SOCIAL' | 'ERROR'>('IDLE');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setStatus('LOADING');
    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.type === 'SOCIAL') {
          setStatus('SUCCESS_SOCIAL');
          setResult(data.provider); // e.g. 'kakao', 'google'
        } else {
          setStatus('SUCCESS_EMAIL');
          setResult(data.email); // e.g. 'hon***@gmail.com'
        }
      } else {
        setStatus('ERROR');
        setMessage(data.error || '오류가 발생했습니다.');
      }
    } catch (err) {
      setStatus('ERROR');
      setMessage('네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden p-4">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-500/20 rounded-full blur-3xl mix-blend-overlay"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] overflow-hidden p-8 relative z-10">
        <Link href="/login" className="inline-flex items-center text-indigo-100 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
        </Link>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">이메일(아이디) 찾기</h2>
          <p className="text-indigo-100/80 text-sm">가입 시 등록하신 전화번호를 입력해주세요.</p>
        </div>

        {status === 'SUCCESS_EMAIL' ? (
          <div className="bg-indigo-500/20 border border-indigo-400/50 text-white p-6 rounded-xl text-center space-y-4">
            <Mail className="w-10 h-10 mx-auto text-indigo-300" />
            <div>
              <p className="text-sm text-indigo-100 mb-1">고객님의 이메일은 다음과 같습니다.</p>
              <p className="text-xl font-bold tracking-wider">{result}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Link href="/login" className="flex-1 py-2 px-4 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-bold shadow">
                로그인하기
              </Link>
              <Link href="/login/forgot" className="flex-1 py-2 px-4 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors text-sm font-bold">
                비밀번호 찾기
              </Link>
            </div>
          </div>
        ) : status === 'SUCCESS_SOCIAL' ? (
          <div className="bg-yellow-500/20 border border-yellow-400/50 text-white p-6 rounded-xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-yellow-300" />
            <div>
              <p className="text-sm text-indigo-100 mb-1">이 번호로 등록된 계정은</p>
              <p className="text-lg font-bold">
                <span className="text-yellow-300 uppercase">{result}</span> 간편 로그인
              </p>
              <p className="text-sm text-indigo-100 mt-1">으로 가입되었습니다.</p>
            </div>
            <div className="pt-4">
              <Link href="/login" className="block w-full py-2 px-4 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-bold shadow">
                소셜 로그인으로 이동
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-indigo-100" htmlFor="phoneNumber">전화번호</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-indigo-200" />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01012345678 (숫자만 입력)"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {status === 'ERROR' && (
              <div className="text-red-300 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="w-full py-3 px-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:bg-indigo-50 focus:outline-none transition-all disabled:opacity-50"
            >
              {status === 'LOADING' ? '조회 중...' : '아이디 찾기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
