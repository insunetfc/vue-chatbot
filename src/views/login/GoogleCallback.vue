<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-slate-50">
    <div class="w-full max-w-md px-10 py-12 text-center bg-white shadow-2xl rounded-3xl shadow-indigo-100/80">
      <div class="flex items-center justify-center mx-auto mb-6 text-indigo-500 bg-indigo-100 rounded-full h-14 w-14">
        <svg class="h-7 w-7 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
      <h1 class="text-xl font-semibold text-slate-900">Google 로그인 처리 중...</h1>
      <p class="mt-2 text-sm text-slate-500" v-if="status === 'loading'">잠시만 기다려 주세요.</p>

      <div v-if="status === 'error'" class="px-4 py-3 mt-6 text-sm text-left rounded-xl bg-rose-50 text-rose-600">
        {{ message }}
      </div>

      <div v-if="status === 'success'" class="px-4 py-3 mt-6 text-sm text-left rounded-xl bg-emerald-50 text-emerald-600">
        로그인에 성공했습니다. 곧 이동합니다...
      </div>
    </div>
  </div>
</template>

<script>
import { exchangeGoogleAuthCode } from '@/services/authClient';
import { saveAuthSession } from '@/utils/authStorage';

const CODE_VERIFIER_STORAGE_KEY = 'google_oauth_code_verifier';

function loadVerifierFromGoogleStorage() {
  try {
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.includes('code_verifier')) {
        const value = window.sessionStorage.getItem(key);
        if (value) {
          window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, value);
          return value;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to inspect Google code verifier storage', error);
  }
  return undefined;
}

function decodeState(value) {
  if (!value) {
    return {};
  }

  try {
    const json = decodeURIComponent(escape(window.atob(value)));
    return JSON.parse(json);
  } catch (error) {
    console.warn('Failed to decode Google OAuth state', error);
    return {};
  }
}

export default {
  name: 'GoogleCallbackView',
  data() {
    return {
      status: 'loading',
      message: '',
    };
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const state = params.get('state');
    const { redirect = '/chat' } = decodeState(state);

    if (error) {
      this.status = 'error';
      this.message = errorDescription || 'Google 인증이 취소되었거나 실패했습니다.';
      return;
    }

    if (!code) {
      this.status = 'error';
      this.message = 'Google 인증 코드가 전달되지 않았습니다.';
      return;
    }

    try {
      let codeVerifier = window.sessionStorage.getItem(CODE_VERIFIER_STORAGE_KEY) || undefined;
      if (!codeVerifier) {
        codeVerifier = loadVerifierFromGoogleStorage();
      }
      const authPayload = await exchangeGoogleAuthCode(code, codeVerifier);
      window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
      saveAuthSession(authPayload);

      this.status = 'success';
      setTimeout(() => {
        this.$router.replace(redirect);
      }, 800);
    } catch (err) {
      window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
      console.error(err);
      this.status = 'error';
      this.message = err?.message ?? 'Google 로그인 처리 중 오류가 발생했습니다.';
    }
  },
};
</script>
