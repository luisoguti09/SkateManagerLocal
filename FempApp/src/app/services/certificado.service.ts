import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { CertUsuario, CertEvento } from '../interfaces/certificados';

@Injectable({ providedIn: 'root' })
export class CertificadoService {
  private dia(valor: string | Date | null | undefined): string {
    if (!valor) throw new Error('El evento no tiene fecha. Solicitá a administración que la complete.');
    let fecha: Date;
    if (valor instanceof Date) {
      fecha = valor;
    } else {
      const texto = valor.trim();
      const partes = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(texto);
      if (!partes) throw new Error('La fecha del evento no es válida. Solicitá su corrección.');
      const [, y, m, d] = partes;
      const control = new Date(`${y}-${m}-${d}T12:00:00Z`);
      if (!Number.isFinite(+control) || control.toISOString().slice(0, 10) !== `${y}-${m}-${d}`) {
        throw new Error('La fecha del evento no es válida. Solicitá su corrección.');
      }
      const iso = texto.replace(' ', 'T');
      fecha = new Date(iso.length === 10 ? `${iso}T12:00:00-03:00`
        : /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}-03:00`);
    }
    if (!Number.isFinite(+fecha)) throw new Error('La fecha del evento no es válida. Solicitá su corrección.');
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(fecha);
    const valorParte = (tipo: string) => partes.find(p => p.type === tipo)!.value;
    return `${valorParte('year')}-${valorParte('month')}-${valorParte('day')}`;
  }

  private periodo(evento: CertEvento): string {
    const inicio = this.dia(evento.fechaInicio);
    const fin = evento.fechaFin ? this.dia(evento.fechaFin) : inicio;
    if (fin < inicio) throw new Error('El fin del evento es anterior al inicio. Solicitá su corrección.');
    const formato = (dia: string) => new Date(`${dia}T12:00:00-03:00`).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long', year: 'numeric'
    });
    return inicio === fin ? `el ${formato(inicio)}` : `del ${formato(inicio)} al ${formato(fin)}`;
  }

  async generar(usuario: CertUsuario, evento: CertEvento, opts?: { filename?: string; emitidoAt?: string }) {
    const periodo = this.periodo(evento);
    const limpiar = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
    for (const [nombre, valor] of Object.entries({ nombre: usuario.nombre, DNI: usuario.dni, club: usuario.club, evento: evento.titulo, lugar: evento.lugar })) {
      if (!limpiar(valor)) throw new Error(`Falta completar ${nombre} para generar el certificado.`);
    }
    const emision = this.dia(opts?.emitidoAt || new Date());
    const fechaEmision = new Date(`${emision}T12:00:00-03:00`).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'long', year: 'numeric'
    });
    const plantilla = await this.cargarPlantilla();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    await this.registrarFuentes(doc);
    const ancho = doc.internal.pageSize.getWidth();
    doc.addImage(plantilla, 'JPEG', 0, 0, ancho, doc.internal.pageSize.getHeight());
    const x = 58, anchoTexto = ancho - x * 2;
    doc.setTextColor('#111111');
    doc.setFont('CertificadoSans', 'normal');
    doc.setCharSpace(0);
    doc.setFontSize(11);
    doc.text(`Mendoza, ${fechaEmision}`, ancho - x, 119, { align: 'right' });
    doc.setFont('CertificadoSans', 'bold');
    doc.text('Ref.: JUSTIFICACIÓN – LEY 20.596', ancho - x, 151, { align: 'right' });
    const parrafos = [
      `Por medio de la presente se certifica que el/la deportista ${limpiar(usuario.nombre)}, DNI N.º ${limpiar(usuario.dni)}, perteneciente al club ${limpiar(usuario.club)}, participará del Evento Torneo ${limpiar(evento.titulo)}, a realizarse ${periodo}, en ${limpiar(evento.lugar)}, en carácter de atleta.`,
      'Se extiende la presente nota para ser presentada ante las autoridades que correspondan, a fin de solicitar la justificación y el no cómputo de inasistencias conforme a lo establecido en la Ley del Deporte N.º 20.596, en virtud de encontrarse afectada a la actividad deportiva mencionada.',
      'Sin otro particular, y sirviendo la presente de formal constancia, saludo a Uds. con atenta consideración.'
    ];
    doc.setFont('CertificadoSans', 'normal');
    let tam = 11;
    const preparar = () => { doc.setFontSize(tam); return parrafos.map(p => doc.splitTextToSize(p, anchoTexto) as string[]); };
    let bloques = preparar();
    const altura = () => bloques.reduce((s, l) => s + l.length * tam * 1.45 + 16, 0);
    while (altura() > 250 && tam > 10) { tam -= 0.25; bloques = preparar(); }
    if (altura() > 250) throw new Error('Los datos son demasiado extensos para la plantilla. Solicitá su revisión.');
    let y = 185;
    for (const lineas of bloques) {
      // Un bloque por párrafo: jsPDF ajusta los espacios entre palabras y
      // mantiene la última línea alineada a la izquierda.
      doc.text(lineas, x, y, {
        align: 'justify',
        maxWidth: anchoTexto,
        lineHeightFactor: 1.45,
        charSpace: 0,
      });
      y += lineas.length * tam * 1.45 + 16;
    }
    doc.save(opts?.filename ?? `cert_${limpiar(usuario.dni)}.pdf`);
  }

  private fuentes?: Promise<string[]>;

  private async registrarFuentes(doc: jsPDF): Promise<void> {
    const nombres = ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'];
    if (!this.fuentes) {
      this.fuentes = Promise.all(nombres.map(async nombre => {
        const respuesta = await fetch('assets/certificate/fonts/' + nombre);
        if (!respuesta.ok) throw new Error('No se pudo cargar la tipografía del certificado. Intentá nuevamente.');
        const bytes = new Uint8Array(await respuesta.arrayBuffer());
        let binario = '';
        for (let inicio = 0; inicio < bytes.length; inicio += 8192) {
          binario += String.fromCharCode(...bytes.subarray(inicio, inicio + 8192));
        }
        return btoa(binario);
      })).catch(error => {
        this.fuentes = undefined;
        throw error;
      });
    }
    const fuentes = await this.fuentes;
    nombres.forEach((nombre, i) => {
      doc.addFileToVFS(nombre, fuentes[i]);
      doc.addFont(nombre, 'CertificadoSans', i === 0 ? 'normal' : 'bold');
    });
  }

  private cargarPlantilla(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const imagen = new Image();
      imagen.onload = () => resolve(imagen);
      imagen.onerror = () => reject(new Error('No se pudo cargar la plantilla del certificado. Intentá nuevamente.'));
      imagen.src = 'assets/certificate/template.jpeg';
    });
  }
}
