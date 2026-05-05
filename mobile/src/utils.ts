export function saatFormatla(saat: any): string {
  const str = String(saat);
  // MSSQL TIME kolonları "1970-01-01T09:00:00.000Z" şeklinde gelir
  if (str.includes('T')) {
    const m = str.match(/T(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  return str.substring(0, 5);
}

export function tarihFormatla(tarih: string): string {
  const str = String(tarih).split('T')[0];
  const [yil, ay, gun] = str.split('-');
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${gun} ${aylar[parseInt(ay) - 1]} ${yil}`;
}

export function bugunTarih(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
