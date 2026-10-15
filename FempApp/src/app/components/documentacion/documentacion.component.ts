import {Component} from '@angular/core';
import {SolicitudComponent} from '../solicitud/solicitud.component';
@Component({selector:'app-documentacion',standalone:true,imports:[SolicitudComponent],template:'<app-solicitud></app-solicitud>'})
export class DocumentacionComponent {}
