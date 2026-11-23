import { seasonPresets, type Season } from '../config/atmospherePresets';
import { dockLandmarks, type FocusId } from '../config/landmarks';

const drawings: Record<string, string> = {
  spring: '<path d="M12 10C5 2 1 12 9 14c-5 7 7 9 6 1 9 1 7-10 0-7 1-9-10-6-6 0"/><circle cx="12" cy="12" r="2"/>',
  summer: '<path d="M19 4C7 2 3 10 7 16c6 6 13-1 12-12Z"/><path d="m5 20 10-11m-4 4 5 1"/>',
  autumn: '<path d="M12 20v-7M12 14 4 10C3 4 8 2 12 5c4-3 9-1 8 5l-8 4Z"/><path d="m12 13-4-6m4 6V6m0 7 4-6"/>',
  winter: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3M5 11l3-1-1-3M19 13l-3 1 1 3"/>',
  overview: '<path d="m3 15 9 5 9-5M3 10l9-5 9 5-9 5Z"/><path d="m3 19 9 5 9-5" transform="translate(0 -2)"/>',
  guanghua: '<path d="M4 21V5h6v16m4 0V5h6v16M10 12h4M3 21h18M5 2h4m6 0h4M7 8v1m10-1v1M7 12v1m10-1v1"/>',
  xianghui: '<path d="M2 10c3 0 5-4 10-6 5 2 7 6 10 6H2Zm3 1v9m4-9v9m6-9v9m4-9v9M3 21h18M8 2h8"/>',
  teaching: '<path d="M2 21V8h20v13M1 7l11-4 11 4M6 11v8m4-8v8m4-8v8m4-8v8M2 16h20"/>',
  gate: '<path d="M3 21V10m5 11V8m8 13V8m5 13V10M2 10h6m8 0h6M6 8c3 0 4-3 6-4 2 1 3 4 6 4H6ZM8 12h8"/>',
  yanyuan: '<path d="M2 19h20M3 17c3-10 15-10 18 0M3 13c3-9 15-9 18 0M5 11v6m4-9v5m6-5v5m4-2v6M2 22h5m3 0h4m3 0h5"/>',
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
  private readonly compass: HTMLElement;
  private readonly fan: HTMLElement;
  private readonly slider: SVGSVGElement;
  private readonly thumb: SVGGElement;
  private selectedSeason: Season = 'autumn';
  private time = .94;
  private pinned = false;
  private closeTimer = 0;
  constructor(private app: HTMLElement, callbacks: { season: (s: Season) => void; time: (t: number) => void; focus: (f: FocusId) => void }) {
    app.innerHTML = `
      <canvas id="campus" aria-label="复旦三维校园；拖拽旋转、滚轮缩放，1至6选择地标，H隐藏界面，Esc恢复" tabindex="0"></canvas>
      <svg class="filter-defs" aria-hidden="true"><defs><filter id="glass-ripple"><feTurbulence type="fractalNoise" baseFrequency=".017 .028" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>
      <header class="wordmark ui-element"><h1 aria-label="Campora"><span>C</span>ampora</h1></header>
      <div class="atmosphere ui-element">
        <div class="season-compass" id="season-compass">
          <button type="button" class="season-trigger glass-orb" id="season-trigger" aria-label="选择季节，当前秋杏" aria-expanded="false" aria-controls="season-fan">${icon('autumn')}</button>
          <div class="season-fan" id="season-fan" role="group" aria-label="季节" inert>${(['spring', 'summer', 'autumn', 'winter'] as Season[]).map((s, i) => {const a=(5+i*27)*Math.PI/180;return `<button type="button" class="season-orb glass-orb" data-season="${s}" style="--orb-x:${(-Math.cos(a)*115).toFixed(2)}px;--orb-y:${(Math.sin(a)*115).toFixed(2)}px;--orb-delay:${i*28}ms" aria-label="${seasonPresets[s].label}" aria-pressed="${s==='autumn'}">${icon(s)}<span class="season-character" aria-hidden="true">${seasonPresets[s].short}</span></button>`;}).join('')}</div>
        </div>
        <div class="celestial-control"><svg id="celestial-slider" viewBox="0 0 210 108" tabindex="0" role="slider" aria-label="昼夜光影" aria-valuemin="0" aria-valuemax="100" aria-valuenow="94" aria-valuetext="星夜">
          <defs><linearGradient id="celestial-spectrum"><stop stop-color="#e9c489"/><stop offset=".48" stop-color="#f4e8bf"/><stop offset="1" stop-color="#95b3e2"/></linearGradient></defs>
          <path class="arc-halo" d="M20 86 Q105 -38 190 86"/>
          <path class="arc-track" d="M20 86 Q105 -38 190 86"/>
          <path class="arc-progress" id="arc-progress" d="M20 86 Q105 -38 190 86" pathLength="1"/>
          <circle class="arc-stop" cx="20" cy="86" r="1.7"/><circle class="arc-stop" cx="105" cy="24" r="1.5"/><circle class="arc-stop" cx="190" cy="86" r="1.7"/>
          <g id="celestial-thumb"><circle class="celestial-aura" r="17"/><circle class="celestial-glass" r="12.5"/><g id="sun-glyph"><circle r="4.2"/><path d="M0-8v1.5M0 8V6.5M-8 0h1.5M8 0H6.5m-12-5.5 1 1m10 10-1-1m-10 1 1-1m10-10-1 1"/></g><path id="moon-glyph" d="M5.5 3A6.3 6.3 0 0 1-2.5-5.5 6.3 6.3 0 1 0 5.5 3Z"/><path id="orb-stars" d="M6-8v3m-1.5-1.5h3M9-1v2m-1-1h2"/></g>
        </svg></div>
      </div>
      <nav class="landmark-rail ui-element" aria-label="地标导览">${dockLandmarks.map(l=>`<button type="button" data-focus="${l.id}" aria-label="${l.name}" aria-pressed="${l.id==='overview'}">${icon(l.id)}<span>${l.name}</span></button>`).join('')}</nav>
      <div class="utilities ui-element"><button class="utility glass-orb" type="button" id="reset-camera" aria-label="重置全景" title="重置全景">${icon('reset')}</button><button class="utility glass-orb" type="button" id="zen-toggle" aria-label="隐藏界面，Esc恢复" title="隐藏界面（H），Esc恢复">${icon('eye')}</button></div>
      <button class="zen-restore utility glass-orb" type="button" id="zen-restore" aria-label="恢复界面" title="恢复界面（Esc）" hidden>${icon('restore')}</button>
      <div class="landmark-badge" id="landmark-badge" role="status" hidden></div>
      <div class="loading" id="loading"><span class="loading-ring"></span><span>Campora</span></div>`;
    this.canvas=app.querySelector('#campus')!; this.badge=app.querySelector('#landmark-badge')!;
    this.trigger=app.querySelector('#season-trigger')!; this.compass=app.querySelector('#season-compass')!; this.fan=app.querySelector('#season-fan')!;
    this.slider=app.querySelector('#celestial-slider')!; this.thumb=app.querySelector('#celestial-thumb')!;
    this.trigger.addEventListener('click',()=>{this.pinned=!this.pinned;this.openFan(this.pinned);});
    this.compass.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){clearTimeout(this.closeTimer);this.openFan(true);}});
    this.compass.addEventListener('pointerleave',()=>{if(!this.pinned)this.closeTimer=window.setTimeout(()=>this.openFan(false),180);});
    document.addEventListener('pointerdown',event=>{if(!(event.target as Element).closest('.season-compass')){this.pinned=false;this.openFan(false);}});
    app.querySelectorAll<HTMLButtonElement>('[data-season]').forEach(b=>b.addEventListener('click',()=>{
      this.selectedSeason=b.dataset.season as Season;this.select('season',this.selectedSeason);this.trigger.innerHTML=icon(this.selectedSeason);this.trigger.setAttribute('aria-label',`选择季节，当前${seasonPresets[this.selectedSeason].label}`);
      callbacks.season(this.selectedSeason);this.pinned=false;this.openFan(false);this.trigger.focus({preventScroll:true});
    }));
    const changeTime=(value:number)=>{this.time=Math.min(1,Math.max(0,value));this.updateCelestial();callbacks.time(this.time);};
    const pointerTime=(event:PointerEvent)=>{const r=this.slider.getBoundingClientRect();changeTime(((event.clientX-r.left)/r.width*210-20)/170);};
    this.slider.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();this.slider.focus({preventScroll:true});this.slider.setPointerCapture(event.pointerId);pointerTime(event);});
    this.slider.addEventListener('pointermove',event=>{if(this.slider.hasPointerCapture(event.pointerId))pointerTime(event);});
    this.slider.addEventListener('pointerup',event=>{if(this.slider.hasPointerCapture(event.pointerId)){pointerTime(event);this.slider.releasePointerCapture(event.pointerId);}});
    this.slider.addEventListener('keydown',event=>{let v=this.time;switch(event.key){case'ArrowLeft':case'ArrowDown':v-=.02;break;case'ArrowRight':case'ArrowUp':v+=.02;break;case'Home':v=0;break;case'End':v=1;break;case'PageUp':v+=.1;break;case'PageDown':v-=.1;break;default:return;}event.preventDefault();changeTime(v);});
    const focus=(id:FocusId)=>{this.setFocus(id);this.pinned=false;this.openFan(false);callbacks.focus(id);};
    app.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(b=>{
      b.addEventListener('click',()=>focus(b.dataset.focus as FocusId));
      b.addEventListener('pointermove',event=>{const r=b.getBoundingClientRect();b.style.setProperty('--shine-x',`${event.clientX-r.left}px`);b.style.setProperty('--shine-y',`${event.clientY-r.top}px`);});
    });
    app.querySelector('#reset-camera')!.addEventListener('click',()=>focus('overview'));
    app.querySelector('#zen-toggle')!.addEventListener('click',()=>this.setZen(true));app.querySelector('#zen-restore')!.addEventListener('click',()=>this.setZen(false));
    document.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||(event.target as HTMLElement).isContentEditable)return;
      if(event.key==='Escape'){if(this.zen)this.setZen(false);else{this.pinned=false;this.openFan(false);this.trigger.focus({preventScroll:true});}}
      if(event.key.toLowerCase()==='h')this.setZen(!this.zen);
      const n=Number(event.key);if(!this.zen&&n>=1&&n<=6)focus(dockLandmarks[n-1].id);
    });
    this.updateCelestial();
  }
  private openFan(open:boolean):void {clearTimeout(this.closeTimer);this.compass.classList.toggle('open',open);this.app.querySelector('.atmosphere')!.classList.toggle('fan-open',open);this.trigger.setAttribute('aria-expanded',String(open));this.fan.inert=!open;}
  private select(kind:string,value:string):void {this.app.querySelectorAll<HTMLButtonElement>(`[data-${kind}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[kind]===value)));}
  private updateCelestial():void {
    const t=this.time,x=20+170*t,y=86-248*t*(1-t),night=Math.min(1,Math.max(0,(t-.7)/.22));
    this.thumb.setAttribute('transform',`translate(${x} ${y})`);this.slider.setAttribute('aria-valuenow',String(Math.round(t*100)));this.slider.setAttribute('aria-valuetext',t<.16?'晨曦':t<.62?'日间':t<.84?'暮霞':'星夜');
    this.app.querySelector('#arc-progress')!.setAttribute('stroke-dasharray',`${t} 1`);
    (this.app.querySelector('#sun-glyph') as SVGElement).style.opacity=String(1-night);(this.app.querySelector('#moon-glyph') as SVGElement).style.opacity=String(night);(this.app.querySelector('#orb-stars') as SVGElement).style.opacity=String(night);
    this.slider.style.setProperty('--orb-color',`rgb(${Math.round(242-night*77)},${Math.round(205-night*4)},${Math.round(135+night*103)})`);
    let ink=Math.min(1,Math.max(0,(t-.56)/.28));ink=ink*ink*(3-2*ink);
    const wordmark=this.app.querySelector<HTMLHeadingElement>('.wordmark h1')!;
    wordmark.style.setProperty('--wordmark-top',`rgb(${20+235*ink},${29+224*ink},${46+201*ink})`);
    wordmark.style.setProperty('--wordmark-bottom',`rgb(${20+197*ink},${29+170*ink},${46+117*ink})`);
    document.documentElement.dataset.time=t>.79?'night':t>.61?'golden':'morning';
  }
  updateSeason(season:Season,time:number):void {this.selectedSeason=season;this.time=time;this.select('season',season);this.trigger.innerHTML=icon(season);document.documentElement.dataset.season=season;this.updateCelestial();}
  setFocus(focus:FocusId):void {this.select('focus',focus);}
  private setZen(zen:boolean):void {this.zen=zen;this.pinned=false;this.openFan(false);this.badge.hidden=true;this.app.classList.toggle('is-zen',zen);this.app.querySelectorAll<HTMLElement>('.ui-element').forEach(el=>el.inert=zen);this.app.querySelector<HTMLButtonElement>('#zen-restore')!.hidden=!zen;if(zen)this.canvas.focus({preventScroll:true});else this.app.querySelector<HTMLButtonElement>('#zen-toggle')!.focus({preventScroll:true});}
  ready():void {this.app.querySelector('#loading')?.remove();}
  fail(message:string):void {const el=this.app.querySelector('#loading');if(el){el.classList.add('failed');el.textContent=message;}}
}
