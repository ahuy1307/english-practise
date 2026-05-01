import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'learned' }
  | { name: 'study'; topicSlug: string | null };

function parsePath(path: string): Route {
  const p = path.replace(/^\//, '');
  if (p === 'learned') return { name: 'learned' };
  if (p === 'practice') return { name: 'study', topicSlug: null };
  if (p.startsWith('topic/')) return { name: 'study', topicSlug: p.slice(6) };
  return { name: 'home' };
}

export function navigate(path: string) {
  window.history.pushState(null, '', path ? `/${path}` : '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  useEffect(() => {
    function onPop() {
      setRoute(parsePath(window.location.pathname));
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return route;
}
