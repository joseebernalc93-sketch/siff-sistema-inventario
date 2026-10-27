export function validateIdentity(id: string): boolean {
  if (!id) return false;
  const cleanId = id.trim().toUpperCase();
  
  // Cédula venezolana (V o E, opcionalmente con guion, o simplemente 6 a 8 dígitos solos)
  if (/^([VE]-?)?\d{6,8}$/.test(cleanId)) {
    return true;
  }

  // Cédula o RUC ecuatoriano
  const ecuadorianCleanId = cleanId.replace(/[^0-9]/g, '');
  if (ecuadorianCleanId.length === 10) {
    return validateEcuadorianID(ecuadorianCleanId, false);
  } else if (ecuadorianCleanId.length === 13) {
    // El RUC debe terminar en algo mayor a 000 (normalmente 001)
    const suffix = ecuadorianCleanId.substring(10, 13);
    if (suffix === "000") return false;
    
    // Primero, intentar la validación estricta de módulo
    if (validateEcuadorianID(ecuadorianCleanId, true)) {
      return true;
    }
    
    // Fallback: Aceptar RUCs que fallan el validador estricto por inconsistencias 
    // del SRI, siempre que la provincia sea válida
    const province = parseInt(ecuadorianCleanId.substring(0, 2), 10);
    if (province >= 1 && province <= 24) return true;
    
    return false;
  }
  return false;
}

function validateEcuadorianID(id: string, isRuc: boolean): boolean {
  const digits = id.split("").map(Number);
  if (digits.some(isNaN)) return false;

  const province = digits[0] * 10 + digits[1];
  if (province < 1 || province > 24) return false;

  const thirdDigit = digits[2];

  if (thirdDigit < 6) {
    // Persona Natural (Modulo 10)
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const verificador = digits[9];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let valor = digits[i] * coeficientes[i];
      if (valor >= 10) valor -= 9;
      suma += valor;
    }
    const modulo = suma % 10;
    const resultado = modulo === 0 ? 0 : 10 - modulo;
    return resultado === verificador;
  } else if (thirdDigit === 9 && isRuc) {
    // Sociedad Privada / Extranjeros (Modulo 11)
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    const verificador = digits[9];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      suma += digits[i] * coeficientes[i];
    }
    const modulo = suma % 11;
    const resultado = modulo === 0 ? 0 : 11 - modulo;
    return resultado === verificador;
  } else if (thirdDigit === 6 && isRuc) {
    // Sociedad Publica (Modulo 11)
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    const verificador = digits[8]; // En publicas el verificador es el digito 9 (indice 8)
    let suma = 0;
    for (let i = 0; i < 8; i++) {
      suma += digits[i] * coeficientes[i];
    }
    const modulo = suma % 11;
    const resultado = modulo === 0 ? 0 : 11 - modulo;
    return resultado === verificador;
  }

  return false;
}

export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  
  // Limpiamos espacios y caracteres comunes, manteniendo el '+' si existe
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

  // Celular (09XXXXXXXX) - 10 digitos
  if (/^09\d{8}$/.test(cleanPhone)) return true;

  // Fijo nacional (0X XXXXXXX) - 9 digitos
  if (/^0\d{8}$/.test(cleanPhone)) return true;

  // Fijo o celular internacional (+593 X XXXXXXX o +593 9XXXXXXXX, o sin +)
  if (/^\+?593\d{8,9}$/.test(cleanPhone)) return true;

  // 1800 (1800 XXX XXX)
  if (/^1800\d{6}$/.test(cleanPhone)) return true;

  return false;
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  // Solo permite dominios populares (gmail, hotmail, outlook, yahoo, live, iCloud, ug.edu.ec)
  const emailRegex = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|yahoo\.es|live\.com|icloud\.com|ug\.edu\.ec)$/i;
  return emailRegex.test(email);
}

export function getEcuadorianProvinceFromPhone(phone: string): string | null {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
  
  if (/^09/.test(cleanPhone) || /^1800/.test(cleanPhone)) return null;

  let code = "";
  if (/^\+?593[2-7]/.test(cleanPhone)) {
    const offset = cleanPhone.startsWith("+") ? 4 : 3;
    code = "0" + cleanPhone.charAt(offset);
  } else if (/^0[2-7]/.test(cleanPhone)) {
    code = cleanPhone.substring(0, 2);
  } else {
    return null;
  }

  const provinceMap: Record<string, string> = {
    "02": "Pichincha, Santo Domingo de los Tsáchilas",
    "03": "Bolívar, Chimborazo, Cotopaxi, Pastaza, Tungurahua",
    "04": "Guayas, Santa Elena",
    "05": "Galápagos, Los Ríos, Manabí",
    "06": "Carchi, Esmeraldas, Imbabura, Napo, Orellana, Sucumbíos",
    "07": "Azuay, Cañar, El Oro, Loja, Morona Santiago, Zamora Chinchipe"
  };

  return provinceMap[code] || null;
}
