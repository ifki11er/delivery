'use server'

import { signIn, signOut } from '../../../auth'
import { AuthError } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  try {
    await signIn('credentials', Object.fromEntries(formData))
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          redirect('/login?message=이메일 또는 비밀번호가 올바르지 않습니다.')
        default:
          redirect('/login?message=로그인 중 오류가 발생했습니다.')
      }
    }
    throw error // NEXT_REDIRECT 처리를 위해 다시 throw
  }
}

// 회원가입 함수 삭제됨
export async function signInWithKakao() {
  await signIn('kakao', { redirectTo: '/' })
}

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/' })
}

export async function logout() {
  await signOut()
}
