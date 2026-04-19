export function shouldRedirectFromLogin(_token) {
  return false;
}

export function shouldRedirectToLogin(token) {
  return !token;
}
