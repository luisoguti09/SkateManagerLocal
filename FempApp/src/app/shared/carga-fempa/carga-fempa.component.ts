import {Component,Input} from '@angular/core';
import {CommonModule} from '@angular/common';
@Component({selector:'app-carga-fempa',standalone:true,imports:[CommonModule],template:`<div *ngIf="activa" class="carga" role="status" aria-live="polite"><img src="assets/icons/MARCAFEMPA3.png" alt="" aria-hidden="true"><span>{{texto}}</span></div>`,styles:[`
.carga{position:fixed;right:24px;bottom:24px;z-index:10000;display:flex;align-items:center;gap:14px;padding:14px 22px;background:#fff;color:#123f89;border:2px solid #85b6ff;border-radius:18px;box-shadow:0 8px 32px #062b6455;pointer-events:none;font:600 14px/1.5 Arial,sans-serif;max-width:calc(100vw - 32px)}
img{display:block;width:42px;height:42px;object-fit:contain;animation:fempa-carga 1.2s linear infinite;flex-shrink:0}
@keyframes fempa-carga{to{transform:rotate(360deg)}}
@media(max-width:600px){.carga{right:16px;bottom:16px}}
@media(prefers-reduced-motion:reduce){img{animation:none}}
`]})
export class CargaFempaComponent {@Input() activa=false;@Input() texto='Cargando…';}
