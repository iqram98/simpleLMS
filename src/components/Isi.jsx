import { toEmbed } from '../lib/embed.js'

// Menampilkan satu blok konten pelajaran. Dipakai di tampilan siswa dan pratinjau guru.
export function BlokView({ blok }) {
  if (blok.type === 'text') {
    return (
      <section className="blok">
        {blok.title && <h3>{blok.title}</h3>}
        <p className="teks">{blok.body_text}</p>
      </section>
    )
  }

  if (blok.type === 'embed') {
    const embed = toEmbed(blok.url)
    return (
      <section className="blok">
        {blok.title && <h3>{blok.title}</h3>}
        {embed ? (
          <figure className="embed">
            <div
              className={`embed-kotak ${blok.embed_height ? 'tetap' : embed.rasio}`}
              style={blok.embed_height ? { height: `${blok.embed_height}px` } : undefined}
            >
              <iframe
                title={blok.title || embed.jenis}
                src={embed.src}
                loading="lazy"
                allow="fullscreen"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
              />
            </div>
            <figcaption className="kecil-teks">
              {embed.jenis} ·{' '}
              <a href={blok.url} target="_blank" rel="noopener noreferrer">
                Tidak tampil? Buka di tab baru ↗
              </a>
            </figcaption>
          </figure>
        ) : (
          <a className="btn" href={blok.url} target="_blank" rel="noopener noreferrer">
            Buka tautan ↗
          </a>
        )}
      </section>
    )
  }

  if (blok.type === 'link') {
    return (
      <section className="blok">
        {blok.title && <h3>{blok.title}</h3>}
        <a className="btn" href={blok.url} target="_blank" rel="noopener noreferrer">
          Buka tautan ↗
        </a>
      </section>
    )
  }

  // Catatan guru. Siswa tidak pernah menerima blok ini dari database.
  return (
    <section className="blok catatan">
      <p className="label-catatan">Catatan guru · tidak terlihat siswa</p>
      {blok.title && <h3>{blok.title}</h3>}
      {blok.body_text && <p className="teks">{blok.body_text}</p>}
      {blok.url && (
        <a className="btn kecil" href={blok.url} target="_blank" rel="noopener noreferrer">
          Buka dokumen ↗
        </a>
      )}
    </section>
  )
}

export function DaftarBlok({ blok, tampilkanCatatan = false }) {
  const tampil = blok.filter((b) => tampilkanCatatan || b.type !== 'note')
  if (!tampil.length) return <p className="kosong">Pelajaran ini belum punya isi.</p>
  return (
    <>
      {tampil.map((b) => (
        <BlokView key={b.id} blok={b} />
      ))}
    </>
  )
}