import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { SessionSlot } from './slots/SessionSlot';
import { NavSlot } from './slots/NavSlot';

interface HtmlInjectorProps {
  src: string;
}

const SLOT_COMPONENTS: Record<string, React.FC> = {
  'session': SessionSlot,
  'nav': NavSlot,
  'lang-switcher': () => <LanguageSwitcher variant="compact" />,
};

interface Slot {
  name: string;
  el: HTMLElement;
}

export const HtmlInjector: React.FC<HtmlInjectorProps> = ({ src }) => {
  const [html, setHtml] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(src)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(setHtml)
      .catch(() => {});
  }, [src]);

  useEffect(() => {
    if (!containerRef.current || !html) return;
    containerRef.current.innerHTML = html;
    const found = containerRef.current.querySelectorAll<HTMLElement>('[data-component]');
    setSlots(Array.from(found).map(el => ({ name: el.dataset.component!, el })));
  }, [html]);

  return (
    <>
      <div ref={containerRef} />
      {slots.map(({ name, el }, i) => {
        const Component = SLOT_COMPONENTS[name];
        return Component ? createPortal(<Component />, el, `slot-${name}-${i}`) : null;
      })}
    </>
  );
};
