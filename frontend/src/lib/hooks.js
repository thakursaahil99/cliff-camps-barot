import { useEffect, useState } from 'react';
import { api } from './api.js';

let configPromise;
/** Public config (payment methods, advance %, ...) - fetched once per page load. */
export function useSiteConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    configPromise ||= api('/config').catch((e) => {
      configPromise = null;
      throw e;
    });
    let alive = true;
    configPromise.then((c) => alive && setConfig(c)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return config;
}

let tentsPromise;
export function useTents() {
  const [state, setState] = useState({ tents: null, error: null });
  useEffect(() => {
    tentsPromise ||= api('/tents').then((r) => r.tents).catch((e) => {
      tentsPromise = null;
      throw e;
    });
    let alive = true;
    tentsPromise.then((tents) => alive && setState({ tents, error: null })).catch((error) => alive && setState({ tents: [], error }));
    return () => { alive = false; };
  }, []);
  return state;
}

export function useMediaQuery(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}
