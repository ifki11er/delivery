'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Upload, CheckCircle2, ChevronLeft, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function BusinessApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    contact: '',
    representativeName: '',
    businessRegNo: ''
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/business-apply');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("사업자등록증 파일을 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      const submissionData = new FormData();
      submissionData.append('businessName', formData.businessName);
      submissionData.append('address', formData.address);
      submissionData.append('contact', formData.contact);
      submissionData.append('representativeName', formData.representativeName);
      submissionData.append('businessRegNo', formData.businessRegNo);
      submissionData.append('file', file);

      const res = await fetch('/api/business-apply', {
        method: 'POST',
        body: submissionData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '신청에 실패했습니다.');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setPreviewUrl(null);
        setFormData({
          businessName: '',
          address: '',
          contact: '',
          representativeName: '',
          businessRegNo: ''
        });
        fetchApplications();
      }, 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING':
        return <span className="flex items-center text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-xs font-bold"><Clock className="w-3 h-3 mr-1"/> 검토중</span>;
      case 'APPROVED':
        return <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle2 className="w-3 h-3 mr-1"/> 승인완료</span>;
      case 'REJECTED':
        return <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold"><XCircle className="w-3 h-3 mr-1"/> 반려됨</span>;
      default:
        return null;
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">신청이 완료되었습니다!</h2>
          <p className="text-gray-600 mb-6">
            상점 입점 신청이 성공적으로 접수되었습니다.<br/>
            관리자 승인 후 사장님 메뉴를 이용하실 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20 space-y-8">
      <div className="flex items-center space-x-4">
        <Link href="/mypage" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-6 h-6 text-indigo-600" />
          상점 입점 신청
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-600 mb-6 text-sm">
          사장님으로 입점하시려면 아래 정보를 정확히 입력해 주세요. 등록하신 정보는 관리자 확인 후 승인됩니다.<br/>
          <span className="text-red-500 font-bold">* 모든 필드는 필수 항목입니다.</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상점 이름 *</label>
            <input
              required
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="예: 배달의 민족 치킨"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상점 주소 *</label>
            <input
              required
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="예: 서울시 강남구 테헤란로 123"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
              <input
                required
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="02-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대표자명 *</label>
              <input
                required
                name="representativeName"
                value={formData.representativeName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="홍길동"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호 *</label>
            <input
              required
              name="businessRegNo"
              value={formData.businessRegNo}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="000-00-00000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록증 업로드 *</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group relative overflow-hidden min-h-[160px]">
              <input
                type="file"
                required={!file}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full p-2">
                  <img src={previewUrl} alt="미리보기" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <span className="text-white font-medium flex items-center">
                      <Upload className="w-5 h-5 mr-2" /> 다른 사진으로 변경
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-center my-auto z-0 pointer-events-none">
                  <Upload className={`mx-auto h-12 w-12 transition-colors ${file ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                  <div className="flex flex-col items-center text-sm text-gray-600 justify-center">
                    <span className="font-medium text-indigo-600 group-hover:text-indigo-500">
                      {file ? file.name : '파일 선택 (클릭하여 앨범/파일 열기)'}
                    </span>
                    {file && <span className="text-xs text-gray-400 mt-1">(미리보기를 지원하지 않는 형식입니다)</span>}
                  </div>
                  {!file && <p className="text-xs text-gray-500 mt-2">PNG, JPG, PDF 지원</p>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all disabled:bg-gray-400"
            >
              {loading ? '신청 중...' : '입점 신청하기'}
            </button>
          </div>
        </form>
      </div>

      {applications.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900">내 신청 내역</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{app.businessName}</h4>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>등록번호: {app.businessRegNo}</p>
                    <p>대표자: {app.representativeName} | 연락처: {app.contact}</p>
                    <p>신청일: {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(app.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
