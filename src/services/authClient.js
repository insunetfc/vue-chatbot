import { API_HOST, GOOGLE_REDIRECT_URI } from '@/config';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && body && body.message) ||
      (typeof body === 'string' ? body : null) ||
      '로그인에 실패했습니다.';
    throw new Error(message);
  }

  return body;
}

export async function exchangeGoogleAuthCode(code, codeVerifier) {
  const response = await fetch(`${API_HOST}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirectUri: GOOGLE_REDIRECT_URI,
      ...(codeVerifier ? { codeVerifier } : {}),
    }),
  });

  return handleResponse(response);
}
