import { seasonPresets, timePresets, type Season, type TimeOfDay } from '../config/atmospherePresets';
import { dockLandmarks, type FocusId } from '../config/landmarks';

const drawings: Record<string, string> = {
  spring: '<path d="M12 10C5 2 1 12 9 14c-5 7 7 9 6 1 9 1 7-10 0-7 1-9-10-6-6 0"/><circle cx="12" cy="12" r="2"/>',
  summer: '<path d="M19 4C7 2 3 10 7 16c6 6 13-1 12-12Z"/><path d="m5 20 10-11m-4 4 5 1"/>',
  autumn: '<path d="m12 3 3 6 5-1-3 5 3 3-7 2-1 4-1-4-7-2 3-3-3-5 5 1Z"/>',
  winter: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3M5 11l3-1-1-3M19 13l-3 1 1 3"/>',
  morning: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-3-7-1.5 1.5M6.5 17.5 5 19M5 5l1.5 1.5M17.5 17.5 19 19"/>',
  golden: '<path d="M3 16h18M5 20h14M7 13a5 5 0 0 1 10 0M12 3v2M3 7l2 2m14 0 2-2"/>',
  night: '<path d="M20 15A8.5 8.5 0 0 1 9 4 8.5 8.5 0 1 0 20 15Z"/><path d="M18 3v4m-2-2h4"/>',
  atmosphere: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><path d="M12 2v2m0 16v2"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  restore: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name]}</svg>`;
export class HudOverlay {
  readonly canvas: HTMLCanvasElement;
  readonly badge: HTMLDivElement;
  zen = false;
  private readonly trigger: HTMLButtonElement;
  private readonly panel: HTMLElement;
  constructor(private app: HTMLElement, callbacks: { season: (s: Season) => void; time: (t: TimeOfDay) => void; focus: (f: FocusId) => void }) {
    app.innerHTML = `
      <canvas id="campus" aria-label="复旦校园三维微缩场景；拖拽旋转，滚轮缩放，数字1至6选择地标，H隐藏界面，Esc恢复界面" tabindex="0"></canvas>
      <header class="title ui-element"><svg viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M5 32V11h8v21m6 0V11h8v21M13 22h6M3 34h26M7 7h4m10 0h4" stroke="currentColor" stroke-width=".85"/></svg><h1>光华四时</h1></header>
      <div class="atmosphere ui-element">
        <button class="atmosphere-trigger glass" type="button" aria-expanded="false" aria-controls="atmosphere-panel" id="atmosphere-trigger">${icon('atmosphere')}<span>四时光影</span><span class="trigger-chevron" aria-hidden="true"></span></button>
        <section class="atmosphere-panel glass" id="atmosphere-panel" aria-label="四时光影" hidden>
          <div class="panel-section"><h2>四时</h2><div class="season-grid" role="group" aria-label="季节">${(Object.keys(seasonPresets) as Season[]).map(s => `<button type="button" class="season-chip" data-season="${s}" aria-label="${s === 'autumn' ? '秋杏' : seasonPresets[s].label}" aria-pressed="${s === 'autumn'}">${icon(s)}<span>${s === 'autumn' ? '秋杏' : seasonPresets[s].label}</span></button>`).join('')}</div></div>
          <div class="panel-section light-section"><h2>光影</h2><div class="time-dial" role="group" aria-label="时段">${(Object.keys(timePresets) as TimeOfDay[]).map(t => `<button type="button" data-time="${t}" aria-label="${t === 'morning' ? '晨曦' : t === 'golden' ? '暮霞' : '星夜'}" aria-pressed="${t === 'night'}">${icon(t)}<span>${t === 'morning' ? '晨曦' : t === 'golden' ? '暮霞' : '星夜'}</span></button>`).join('')}</div></div>
        </section>
      </div>
      <nav class="landmark-dock glass ui-element" aria-label="地标导览">${dockLandmarks.map((l, i) => `<button type="button" data-focus="${l.id}" aria-label="${l.id === 'overview' ? '全景' : l.name}" aria-pressed="${l.id === 'overview'}"><span class="landmark-number" aria-hidden="true">${i + 1}</span><span>${l.name}</span></button>`).join('')}</nav>
      <div class="utilities ui-element"><button type="button" class="utility glass" id="reset-camera" aria-label="重置镜头" title="重置镜头">${icon('reset')}</button><button type="button" class="utility glass" id="zen-toggle" aria-label="隐藏界面，Esc恢复" title="隐藏界面（H），Esc恢复">${icon('eye')}</button></div>
      <button type="button" class="zen-restore utility glass" id="zen-restore" aria-label="恢复界面" title="恢复界面（Esc）" hidden>${icon('restore')}</button>
      <div class="landmark-badge" id="landmark-badge" role="status" hidden></div>
      <div id="loading" class="loading"><span class="loading-ring"></span><span>光华四时</span></div>`;
    this.canvas = app.querySelector('#campus')!;
    this.badge = app.querySelector('#landmark-badge')!;
    this.trigger = app.querySelector('#atmosphere-trigger')!;
    this.panel = app.querySelector('#atmosphere-panel')!;
    this.trigger.addEventListener('click', () => this.openPanel(this.panel.hidden));
    document.addEventListener('pointerdown', event => {
      if (!this.panel.hidden && !(event.target as Element).closest('.atmosphere')) this.openPanel(false);
    });
    app.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b => b.addEventListener('click', () => { this.select('season', b.dataset.season!); callbacks.season(b.dataset.season as Season); }));
    app.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(b => b.addEventListener('click', () => { this.select('time', b.dataset.time!); callbacks.time(b.dataset.time as TimeOfDay); }));
    const focus = (id: FocusId) => { this.setFocus(id); this.openPanel(false); callbacks.focus(id); };
    app.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b => b.addEventListener('click', () => focus(b.dataset.focus as FocusId)));
    app.querySelector('#reset-camera')!.addEventListener('click', () => focus('overview'));
    app.querySelector('#zen-toggle')!.addEventListener('click', () => this.setZen(true));
    app.querySelector('#zen-restore')!.addEventListener('click', () => this.setZen(false));
    document.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).isContentEditable) return;
      if (event.key === 'Escape') {
        if (this.zen) this.setZen(false); else if (!this.panel.hidden) { this.openPanel(false); this.trigger.focus(); }
      }
      if (event.key.toLowerCase() === 'h') this.setZen(!this.zen);
      const number = Number(event.key);
      if (!this.zen && number >= 1 && number <= 6) focus(dockLandmarks[number - 1].id);
    });
  }
  private openPanel(open: boolean): void { this.panel.hidden = !open; this.trigger.setAttribute('aria-expanded', String(open)); }
  private select(kind: string, value: string): void { this.app.querySelectorAll<HTMLButtonElement>(`[data-${kind}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[kind] === value))); }
  updateSeason(season: Season, time: TimeOfDay): void {
    document.documentElement.dataset.time = time; document.documentElement.dataset.season = season;
    this.select('season', season); this.select('time', time);
  }
  setFocus(focus: FocusId): void { this.select('focus', focus); }
  private setZen(zen: boolean): void {
    this.zen = zen; this.openPanel(false); this.app.classList.toggle('is-zen', zen);
    this.badge.hidden = true;
    this.app.querySelectorAll<HTMLElement>('.ui-element').forEach(el => el.inert = zen);
    this.app.querySelector<HTMLButtonElement>('#zen-restore')!.hidden = !zen;
    if (zen) this.canvas.focus({ preventScroll: true }); else this.app.querySelector<HTMLButtonElement>('#zen-toggle')!.focus({ preventScroll: true });
  }
  ready(): void { this.app.querySelector('#loading')?.remove(); }
  fail(message: string): void { const loading = this.app.querySelector('#loading'); if (loading) { loading.classList.add('failed'); loading.textContent = message; } }
}
