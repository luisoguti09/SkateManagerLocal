import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { CertUsuario, CertEvento } from '../interfaces/certificados';



@Injectable({ providedIn: 'root' })
export class CertificadoService {

  async generar(usuario: CertUsuario, evento: CertEvento, opts?: { filename?: string }) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    await this.tryAddImage(doc, 'assets/certificate/template.jpeg', 0, 0, W, H);

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('CERTIFICADO DE ASISTENCIA', W / 2, 120, { align: 'center' });

    // Datos
    const nombreTxt = usuario.nombre || '........................';
    const dniTxt = usuario.dni || '........................';
    const clubTxt = usuario.club || '........................';
    const disciplinaTxt = usuario.disciplina || 'Patinaje Artístico';
    const categoriaTxt = usuario.categoria || usuario.divisional || '........................';
    const licenciaTxt = usuario.licencia || '........................';

    const eventoNombre = evento.titulo || '........................';
    const eventoLugar = evento.lugar || '........................';
    const fechaTxt = evento.fechaInicio
      ? new Date(evento.fechaInicio).toLocaleDateString('es-AR')
      : new Date().toLocaleDateString('es-AR');

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const x = 120;
    let y = 170;
    const lh = 24;

    doc.text('Por la presente, la FEDERACIÓN MENDOCINA DE PATÍN certifica que', x, y);
    y += lh;

    doc.setFont('helvetica', 'bold');
    doc.text(nombreTxt, x + 25, y);
    doc.line(x + 25, y + 3, W - 140, y + 3);
    y += lh;

    doc.setFont('helvetica', 'normal');
    doc.text(`DNI Nº ${dniTxt}, es deportista federado/a a esta Federación`, x, y);
    y += lh;

    doc.text(`por el club ${clubTxt}`, x, y);
    y += lh;

    doc.text(`en la disciplina ${disciplinaTxt}, categoría ${categoriaTxt}`, x, y);
    y += lh;

    doc.text(`contando con licencia ${licenciaTxt} durante el corriente año.`, x, y);
    y += lh + 8;

    doc.text('Se extiende el presente certificado a pedido del interesado,', x, y);
    y += lh;

    doc.text('para ser presentado ante las autoridades y/o instituciones que así lo requieran.', x, y);
    y += lh + 12;

    const eventoTxt =
      `Esta deportista asistió al evento "${eventoNombre}", realizado en ${eventoLugar} el día ${fechaTxt}.`;

    const eventoLines = doc.splitTextToSize(eventoTxt, W - 240);
    doc.text(eventoLines, x, y);

    // NO agregamos firma por código porque el template ya trae la firma institucional abajo.

    doc.save(opts?.filename ?? `cert_${usuario.dni}.pdf`);
  }

  private async tryAddImage(
    doc: jsPDF,
    src: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          doc.addImage(img, 'PNG', x, y, w, h);
          resolve();
        };

        img.onerror = reject;
        img.src = src;
      });
    } catch {
      // Si no carga la imagen, no rompe el PDF
    }
  }

}

















/*import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

type CertUsuario = {
  nombre: string; dni: string;
  club?: string; categoria?: string;
};

type CertEvento = {
  titulo: string;
  fechaInicio?: string | Date | null;
  lugar?: string | null;
  nivel?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CertificadoService {

  async generar(usuario: CertUsuario, evento: CertEvento, opts?: { filename?: string }) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // 1) Fondo (si existe)
    await this.tryAddImage(doc, 'assets/certificate/template.jpeg', 0, 0, W, H);

    // 2) Logo (por si la plantilla no lo incluye)
    await this.tryAddImage(doc, 'assets/certificate/MARCA FEMPA 1.png', 40, 40, 110, 110);

    // 3) Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('CERTIFICADO DE ASISTENCIA', W / 2, 120, { align: 'center' });

    // 4) Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const fechaTxt = evento.fechaInicio
  ? new Date(evento.fechaInicio).toLocaleDateString()
  : new Date().toLocaleDateString();

    const lineas = [
      `La Federación Mendocina de Patín certifica que ${usuario.nombre} (DNI ${usuario.dni})`,
      `asistió al evento "${evento.titulo}" realizado en ${evento.lugar ?? '-'} el día ${fechaTxt}.`,
      usuario.club ? `Club: ${usuario.club}` : '',
      usuario.categoria ? `Categoría: ${usuario.categoria}` : '',
      evento.nivel ? `Nivel: ${evento.nivel}` : '',
    ].filter(Boolean) as string[];

    let y = 200;
    lineas.forEach(l => { doc.text(l, 60, y); y += 20; });

    // 5) Firma
    await this.tryAddImage(doc, 'assets/certificate/FIRMA LUIS GUTIERREZ.png', W - 260, H - 170, 200, 80);
    doc.text('__________________________', W - 240, H - 80);
    doc.text('Autoridad FEMPA', W - 205, H - 62);

    doc.save(opts?.filename ?? `cert_${usuario.dni}.pdf`);
  }

  * Intenta dibujar una imagen; si no existe, no rompe 
  private async tryAddImage(doc: jsPDF, src: string, x: number, y: number, w: number, h: number) {
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { doc.addImage(img, 'PNG', x, y, w, h); resolve(); };
        img.onerror = reject;
        img.src = src;
      });
    } catch { /* no-op si no existe  }
  }
}
*/