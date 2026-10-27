const str = "Necesita cambio/vuelto: Si (Para 10)";
console.log(str.replace(/\(Para ([\d.]+)\)/g, "(Para $$$1)"));
console.log(str.replace(/\(Para ([\d.]+)\)/g, "(Para \\$$1)"));
console.log(str.replace(/\(Para ([\d.]+)\)/g, "(Para $$1)"));
console.log(str.replace(/\(Para ([\d.]+)\)/g, "(Para \\$$$1)"));
