import{c}from"./index-DDHTtm2g.js";const d=[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]],p=c("message-circle",d),l="6282337753394";function o(a){if(!a)return"";let e=a.replace(/\D/g,"");return e.startsWith("0")?e="62"+e.slice(1):e.startsWith("8")&&(e="62"+e),e}function g({phoneNumber:a,vendorName:e,categorySlug:s="umum",landmarkName:u,itemOrIssue:i}){const k=o(a);if(!k)return"#";const t=u?`area ${u}`:"wilayah Sumenep";let n="";switch(s){case"servis-teknik":{n=`Halo Pak/Cak ${e}, saya menemukan kontak Anda di SumenepKerja.

${i||"Peralatan/fasilitas"} saya di rumah (${t}) butuh perbaikan.

Apakah hari ini ada jadwal luang untuk pengecekan ke lokasi? Terima kasih.`;break}case"hajatan-acara":{n=`Halo ${e}, saya lihat profil usaha Anda di SumenepKerja.

Mau menanyakan ketersediaan tanggal dan daftar harga (${i||"layanan hajatan"}) untuk acara di ${t}.

Apakah masih ada slot kosong yang bisa dibooking? Terima kasih.`;break}case"kuliner":{const r=i?`menu ${i}`:"makanan/minuman";n=`Halo ${e}, saya mau pesan ${r} lewat katalog SumenepKerja.

Apakah hari ini masih ada porsi/stok tersedia? Terima kasih!`;break}case"transportasi":{n=`Halo Pak/Cak ${e}, saya menemukan kontak Anda di SumenepKerja.

Mau menanyakan ketersediaan jasa angkut/pikap untuk rute sekitar ${t}.

Apakah unitnya sedang luang hari ini?`;break}case"umum":default:{n=`Halo ${e}, saya menemukan kontak usaha Anda di SumenepKerja.

Apakah layanan Anda untuk ${t} saat ini sedang buka dan aktif? Terima kasih.`;break}}return`https://wa.me/${k}?text=${encodeURIComponent(n)}`}function m(a){const e=a.phoneNumber?`Nomor WhatsApp saya: ${o(a.phoneNumber)}

`:"",s=`Halo Admin SumenepKerja,

${a.intro}

Kartu digital: ${a.cardUrl}

`+e+"Terima kasih.";return`https://wa.me/${l}?text=${encodeURIComponent(s)}`}function $(a){return m({...a,intro:`Saya pemilik usaha "${a.vendorName}" dan ingin MENGKLAIM kartu digital saya di SumenepKerja.`})}function f(a){return m({...a,intro:`Saya baru saja mendaftarkan usaha "${a.vendorName}" dan ingin KONFIRMASI verifikasi nomor WhatsApp ini.`})}export{p as M,$ as a,g as b,f as g,o as s};
