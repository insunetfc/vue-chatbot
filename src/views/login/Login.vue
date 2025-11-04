<template>
  <div
    class="flex items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-indigo-50 via-slate-50 to-sky-100"
  >
    <div
      class="w-full max-w-md px-10 py-12 text-center bg-white shadow-2xl rounded-3xl shadow-indigo-100/80"
    >
      <div class="flex items-center justify-center mx-auto mb-6 text-3xl">
        <img src="/logo.png" alt="로고" class="w-auto h-12" />
      </div>
      <h1 class="text-2xl font-semibold text-slate-900">Chatbot에 로그인</h1>
      <p class="mt-2 text-sm text-slate-500">
        Google 계정으로 간편하게 시작하세요.
      </p>

      <button
        type="button"
        class="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full border border-indigo-100 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="loading || !GOOGLE_CLIENT_ID"
        @click="onGoogleLoginClick"
      >
        <span class="flex items-center justify-center w-5 h-5">
          <svg viewBox="0 0 24 24" focusable="false" class="w-5 h-5">
            <path
              fill="#EA4335"
              d="M12 10.8v3.84h5.37c-.24 1.26-.97 2.33-2.07 3.04l3.35 2.6c1.95-1.8 3.08-4.45 3.08-7.6 0-.73-.07-1.43-.2-2.08H12z"
            />
            <path
              fill="#34A853"
              d="M6.58 14.28l-.93.7-2.67 2.07C4.86 20.54 8.17 22.5 12 22.5c2.7 0 4.96-.9 6.61-2.42l-3.35-2.6c-.9.6-2.05.96-3.26.96-2.51 0-4.64-1.7-5.4-3.98z"
            />
            <path
              fill="#4A90E2"
              d="M3 7.46C2.1 9.2 2.1 11.3 3 13.04c.76-2.28 2.89-3.98 5.4-3.98 1.21 0 2.35.4 3.26.96l3.35-2.6C16.96 5.9 14.7 5 12 5c-3.83 0-7.14 1.96-9.42 5.04z"
            />
            <path
              fill="#FBBC05"
              d="M12 5c2.7 0 4.96.9 6.61 2.42l-3.35 2.6c-.9-.56-2.04-.96-3.26-.96V5z"
            />
          </svg>
        </span>
        <span>
          <span v-if="loading">로그인 페이지로 이동 중...</span>
          <span v-else>Google 계정으로 로그인</span>
        </span>
      </button>

      <p
        v-if="!GOOGLE_CLIENT_ID"
        class="px-4 py-3 mt-6 text-xs text-left rounded-xl bg-amber-50 text-amber-700"
      >
        `VUE_APP_GOOGLE_CLIENT_ID` 환경 변수가 설정되지 않았습니다.
      </p>

      <p
        v-if="errorMessage"
        class="px-4 py-3 mt-6 text-sm text-left rounded-xl bg-rose-50 text-rose-600"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <p class="mt-10 text-xs text-slate-400">
        로그인을 진행하면 개인정보 처리방침에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  </div>
</template>

<script>
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "@/config";

const CODE_VERIFIER_STORAGE_KEY = "google_oauth_code_verifier";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function encodeState(payload) {
  try {
    const json = JSON.stringify(payload);
    return window.btoa(unescape(encodeURIComponent(json)));
  } catch (error) {
    console.warn("Failed to encode Google OAuth state", error);
    return "";
  }
}

function base64UrlEncode(arrayBuffer) {
  const bytes =
    arrayBuffer instanceof Uint8Array
      ? arrayBuffer
      : new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier() {
  const random = new Uint8Array(32);
  window.crypto.getRandomValues(random);
  return base64UrlEncode(random);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export default {
  name: "LoginView",
  data() {
    return {
      loading: false,
      errorMessage: "",
      GOOGLE_CLIENT_ID,
    };
  },
  mounted() {
    try {
      window.sessionStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear Google code verifier", error);
    }
  },
  methods: {
    async onGoogleLoginClick() {
      this.errorMessage = "";

      if (!GOOGLE_CLIENT_ID) {
        this.errorMessage =
          "Google OAuth Client ID가 구성되지 않았습니다. `VUE_APP_GOOGLE_CLIENT_ID`를 설정해 주세요.";
        return;
      }

      this.loading = true;

      try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        window.sessionStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier);

        const redirectTarget = this.$route.query.redirect ?? "/chat";
        const state = encodeState({ redirect: redirectTarget });

        const params = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: GOOGLE_REDIRECT_URI,
          response_type: "code",
          scope: "openid email profile",
          access_type: "offline",
          include_granted_scopes: "true",
          prompt: "consent",
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        });

        window.location.assign(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`);
      } catch (error) {
        console.error(error);
        this.loading = false;
        this.errorMessage =
          error?.message ?? "Google 로그인 구성을 완료하지 못했습니다.";
      }
    },
  },
};
</script>
