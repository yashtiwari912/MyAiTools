import axios from 'axios';

// By default, use relative /api calls so Next.js rewrites can proxy to the backend.
// If an explicit different origin is provided via env, use it.
const base = process.env.NEXT_PUBLIC_BASE_URL;
if (base && typeof window === 'undefined') {
  // On the server, honor explicit base (useful for SSG/SSR calling the backend)
  axios.defaults.baseURL = base;
}

export default axios;
