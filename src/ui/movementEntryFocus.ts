/** Align only the movement entry scroller; leave focus, values and document scroll alone. */
export function installMovementEntryFocus(form: HTMLElement | null, spacer: HTMLElement | null) {
  const scroller = form?.closest<HTMLElement>('.fainance-mobile-content');
  const anchor = form?.querySelector<HTMLElement>('.fainance-entry-amount');
  if (!form || !spacer || !scroller || !anchor) return;
  const win = form.ownerDocument.defaultView!;
  let frame = 0;
  let timers: number[] = [];
  let extra = 0;
  const eligible = (target: EventTarget | null) =>
    target instanceof win.HTMLElement && form.contains(target) && target.matches('[data-entry-focus]');
  const align = () => {
    if (!eligible(form.ownerDocument.activeElement)) return;
    const target = Math.max(0, scroller.scrollTop + anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop - 2);
    // Add only the missing scroll range, so even a short form can reach the top.
    const naturalMax = scroller.scrollHeight - scroller.clientHeight - extra;
    extra = Math.max(0, Math.ceil(target - naturalMax));
    spacer.style.height = extra + 'px';
    scroller.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
  };
  const schedule = () => {
    win.cancelAnimationFrame(frame);
    timers.forEach(id => win.clearTimeout(id));
    frame = win.requestAnimationFrame(align);
    // Native keyboard and browser focus scrolling settle over several frames.
    timers = [120, 300, 500].map(ms => win.setTimeout(align, ms));
  };
  const onField = (event: Event) => { if (eligible(event.target)) schedule(); };
  form.addEventListener('focusin', onField);
  form.addEventListener('click', onField);
  win.visualViewport?.addEventListener('resize', schedule);
  win.addEventListener('resize', schedule);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  observer?.observe(scroller);
  if (eligible(form.ownerDocument.activeElement)) schedule();
  return () => {
    win.cancelAnimationFrame(frame);
    timers.forEach(id => win.clearTimeout(id));
    observer?.disconnect();
    form.removeEventListener('focusin', onField);
    form.removeEventListener('click', onField);
    win.visualViewport?.removeEventListener('resize', schedule);
    win.removeEventListener('resize', schedule);
    spacer.style.height = '0px';
  };
}
