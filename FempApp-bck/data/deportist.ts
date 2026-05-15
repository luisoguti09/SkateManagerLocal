export interface Deportist {
    licNacionalNumero: string;
    documentoN:        string;
    apellidoYNombre:   string;
    fechadeNacimiento: string;
    sexo:              Sexo;
    nacionalidad:      Nacionalidad;
    club:              string;
    categoria:         string;
    funcion:           Funcion;
    domicilio:         string;
    cP:                number;
    localidad:         string;
    provincia:         Provincia;
    telefono:          string;
    tipoLicencia:      TipoLicencia;
    federeada:         Federeada;
  }
  
  export enum Federeada {
    Federada = "FEDERADA",
  }
  
  export enum Funcion {
    Delegado = "Delegado",
    Patinador = "Patinador",
    Técnico = "Técnico",
  }
  
  export enum Nacionalidad {
    Argentina = "ARGENTINA",
    Empty = ""
  }
  
  export enum Provincia {
    BuenosAires = "Buenos Aires",
    Capital = "Capital",
    GodoyCruz = "Godoy Cruz",
    Guaymallén = "Guaymallén",
    Junín = "Junín",
    LasHeras = "Las Heras",
    LujánDeCuyo = "Luján de Cuyo",
    Maipú = "Maipú",
    Mendoza = "Mendoza",
    Rivadavia = "Rivadavia",
    SANMartín = "San Martín",
    SANRafael = "San Rafael",
  }
  
  export enum Sexo {
    F = "f",
    M = "m",
  }
  
  export enum TipoLicencia {
    Nacional = "Nacional",
    Promocional = "Promocional",
    PromocionalProvincial = "Promocional Provincial",
    Provincial = "Provincial",
  }
  