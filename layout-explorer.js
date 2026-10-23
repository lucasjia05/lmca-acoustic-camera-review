(() => {
  const el = id => document.getElementById(id);
  const distance = el('layout-distance'), band = {value:'1000-4000'}, snr = el('layout-snr'), view = el('layout-view');
  const shortlist = [
    ['grid16-30cm-span', '16-mic square grid · 30 cm span'],
    ['circle30-30cm', '30-mic circle · 30 cm'],
    ['spiral30-30cm', '30-mic spiral · 30 cm'],
    ['parsa-30cm', 'Parsa layout · 30 cm'],
    ['parsa-35cm', 'Parsa layout · 35 cm'],
    ['parsa-native', 'Parsa original · 8.6 cm'],
    ['circle16-30cm', '16-mic circle · 30 cm'],
    ['spiral16-30cm', '16-mic spiral · 30 cm']
  ];
  const names = Object.fromEntries(shortlist);
  const colors = {'20':'#167d8d','0':'#c57616','-10':'#8156ac','-20':'#c33b45'};
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const bandKey = r => r.fft_size ? String(r.fft_size) : `${r.band_low_hz}-${r.band_high_hz}`;
  const bandName = r => r.fft_size ? `${r.fft_size} samples` : `${r.band_low_hz/1000}–${r.band_high_hz/1000} kHz`;
  const line = (x1,y1,x2,y2,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
  const txt = (x,y,s,extra='') => `<text x="${x}" y="${y}" ${extra}>${esc(s)}</text>`;
  const svg = (w,h,s,label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" style="font:11px system-ui;fill:#566575">${s}</svg>`;
  function geometry(points,limit) {
    const scale=88/limit,x=v=>115+v*scale,y=v=>110-v*scale;
    let out=line(22,110,208,110,'stroke="#cbd6d8"')+line(115,17,115,203,'stroke="#cbd6d8"');
    for(const v of [-limit,0,limit]){
      out+=txt(x(v),220,(100*v).toFixed(0),'text-anchor="middle"');
      out+=txt(16,y(v)+4,(100*v).toFixed(0),'text-anchor="end"');
    }
    out+=txt(115,238,'x (cm)','text-anchor="middle"')+txt(118,12,'y (cm)');
    points.forEach((p,i)=>out+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3.6" fill="#167d8d"><title>Mic ${i+1}: ${(p[0]*100).toFixed(2)}, ${(p[1]*100).toFixed(2)} cm</title></circle>`);
    return svg(230,245,out,'Microphone positions, front view');
  }
  function chart(rows,bands,yMax) {
    const parity=['az','el'].includes(view.value),W=540,H=270,L=54,R=20,T=44,B=52;
    const x=v=>L+(v+60)/120*(W-L-R),y=v=>H-B-(parity?(v+60)/120:v/yMax)*(H-T-B);
    let out='';
    const ticks=parity?[-60,-30,0,30,60]:[0,yMax/4,yMax/2,3*yMax/4,yMax];
    ticks.forEach(v=>out+=line(L,y(v),W-R,y(v),'stroke="#e0e6e7"')+txt(L-8,y(v)+4,Number(v.toFixed(1)),'text-anchor="end"'));
    out+=line(L,T,L,H-B,'stroke="#a1afb3"')+line(L,H-B,W-R,H-B,'stroke="#a1afb3"');
    if(parity){
      out+=line(x(-60),y(-60),x(60),y(60),'stroke="#607c85" stroke-dasharray="5 4"');
      [-60,-30,0,30,60].forEach(v=>out+=txt(x(v),H-B+20,`${v}°`,'text-anchor="middle"'));
    } else {
      out+=line(L,y(5),W-R,y(5),'stroke="#c33b45" stroke-dasharray="5 4"')+txt(W-R,y(5)-5,'5° target','text-anchor="end" fill="#b43540"');
      bands.forEach((b,i)=>out+=txt(L+(i+.5)*(W-L-R)/bands.length,H-B+20,bandName(b),'text-anchor="middle"'));
    }
    rows.forEach((r,i)=>{
      const axis=view.value==='el'?'el':'az';
      const px=parity?x(r[`source_${axis}_deg`]):L+(bands.findIndex(b=>bandKey(b)===bandKey(r))+.5)*(W-L-R)/bands.length+((i*7)%13-6)*1.8;
      const py=y(parity?r[`estimated_${axis}_deg`]:r.error_deg);
      const tip=`${r.fft_size?`FFT ${r.fft_size}; 1–4 kHz`:bandName(r)}; SNR ${r.snr_db} dB; trial ${r.trial}; actual (${r.source_az_deg}°, ${r.source_el_deg}°); predicted (${r.estimated_az_deg}°, ${r.estimated_el_deg}°); error ${r.error_deg.toFixed(2)}°`;
      out+=`<circle cx="${px}" cy="${py}" r="3.6" fill="${colors[r.snr_db]||'#167d8d'}" fill-opacity=".65" stroke="white" stroke-width=".4"><title>${esc(tip)}</title></circle>`;
    });
    const frequencyLabel=[...new Set(rows.map(r=>`${r.band_low_hz/1000}–${r.band_high_hz/1000} kHz`))].join(' / ');
    out+=txt(W-R,14,frequencyLabel,'text-anchor="end" font-weight="600"');
    out+=txt(L,T-9,parity?`Predicted ${view.value==='az'?'azimuth':'elevation'} (°)`:'Angular error (°)');
    out+=txt((L+W-R)/2,H-6,parity?`Actual ${view.value==='az'?'azimuth':'elevation'} (°)`:view.value.startsWith('fft-')?'FFT size':'Source frequency band','text-anchor="middle"');
    return svg(W,H,out,parity?'Actual versus predicted source angle':view.value.startsWith('fft-')?'Angular localization error by FFT size':'Angular localization error by frequency band');
  }
  function render() {
    const s=layoutStudies.find(s=>s.id===`baseline-${distance.value}-2048-1`), c=s.config;
    if(!s.id.startsWith("baseline-")&&view.value.startsWith("fft-"))view.value="error";
    const compare=view.value.startsWith('fft-') && s.id.startsWith('baseline-');
    const peers=compare?layoutStudies.filter(t=>t.id.startsWith('baseline-')&&t.config.source_distance_m===c.source_distance_m&&(view.value==='fft-single'?t.config.frames===1:t.config.frames*t.config.frame_length===2048)).sort((a,b)=>a.config.frame_length-b.config.frame_length):[s];
    const shownGeometries=s.id.startsWith('near')?Object.entries(s.geometries):shortlist.filter(([id])=>s.geometries[id]).map(([id])=>[id,s.geometries[id]]);
    const shownIds=new Set(shownGeometries.map(([id])=>id));
    const sourceRows=compare?peers.flatMap(t=>t.rows.map(r=>({...r,fft_size:t.config.frame_length}))):s.rows;
    const rows=sourceRows.filter(r=>shownIds.has(r.array_id)&&(compare||band.value==='all'||bandKey(r)===band.value)&&(snr.value==='all'||String(r.snr_db)===snr.value));
    const singles=rows.filter(r=>Number.isFinite(r.error_deg));
    const bands=compare?peers.map(t=>({fft_size:t.config.frame_length})):c.bands_hz.map(([a,b])=>({band_low_hz:a,band_high_hz:b})).filter(b=>band.value==='all'||bandKey(b)===band.value);
    const yMax=Math.max(10,Math.ceil(Math.max(0,...singles.map(r=>r.error_deg))/10)*10);
    const limit=Math.ceil(Math.max(...shownGeometries.map(([,pts])=>pts).flat().flatMap(p=>[Math.abs(p[0]),Math.abs(p[1])]))*100)/100;
    el('layout-conditions').innerHTML=`<strong>Simulation conditions</strong><br>Flat-spectrum, band-limited noise sources · spherical propagation · plane-wave frequency-domain DAS.<br>${c.source_distance_m} m source distance · ${c.sample_rate/1000} ksample/s · 512 / 1024 / 2048 samples per frame · scan ±${c.grid_limit_deg}° azimuth/elevation, ${c.grid_step_deg}° steps · ${c.trials} noise trials per condition.<br>Independent microphone noise: ${s.noise==='in-band'?'within the source band; SNR measured in-band.':'full-band white noise; SNR measured before band selection (in-band SNR is higher). Distance uses normalized SNR, not a detection-range prediction.'}<br>Single sources (azimuth, elevation): ${c.directions_deg.map(p=>`(${p[0]}°, ${p[1]}°)`).join(', ')}.${c.two_source_separations_deg.length?` Equal-strength source pairs: ${c.two_source_separations_deg.join('° / ')}° separation, centered on 0° azimuth, 0° elevation. Pair pass: both peaks within 5° and ≥1 dB valley.`:' No two-source tests.'}`;
    if(compare) el('layout-conditions').innerHTML+=`<br><strong>FFT comparison:</strong> ${view.value==='fft-single'?'one frame per map: 512 / 1024 / 2048 samples = 10.7 / 21.3 / 42.7 ms.':'same 42.7 ms recording: average 4 × 512 / 2 × 1024 / 1 × 2048 sample frames.'} Same distances, directions, SNRs and trial seeds; 1–4 kHz throughout. <br>For 30 mics, 16-bit PCM frame storage: 30 / 60 / 120 KiB. Selected complex spectra (16 + 16 bit): 3.75 / 7.5 / 15 KiB. Streaming averaging can reuse a frame buffer; chip area depends on memory and hardware sharing.`;
    el('layout-legend').innerHTML=c.snr_db.filter(n=>snr.value==='all'||String(n)===snr.value).map(n=>`<span><i style="background:${colors[n]}"></i>${n} dB SNR</span>`).join('')+`<span>${!['az','el'].includes(view.value)?'Each dot = one single-source trial; horizontal offsets separate overlapping dots.':'Diagonal = perfect prediction; repeated estimates can overlap.'} Hover a dot for details. Shared axes across layouts.</span>`;
    el('layout-gallery').innerHTML=shownGeometries.map(([id,pts])=>{
      const r=singles.filter(r=>r.array_id===id),pairs=rows.filter(r=>r.array_id===id&&r.scene==='pair');
      const widths=r.map(r=>r.azimuth_cut_width_deg).filter(Number.isFinite).sort((a,b)=>a-b),m=widths.length;
      const median=m?(widths[Math.floor((m-1)/2)]+widths[Math.floor(m/2)])/2:null;
      const span=Math.max(...pts.flatMap(p=>pts.map(q=>Math.hypot(...p.map((v,k)=>v-q[k])))))*100;
      const fftTable=compare?`<table class="fft-metrics"><tr><th>FFT</th><th>Within 5°</th><th>Worst error</th><th>Two-source pass</th></tr>${peers.map(t=>{const n=t.config.frame_length,rs=r.filter(x=>x.fft_size===n),ps=pairs.filter(x=>x.fft_size===n);return `<tr><td>${n}</td><td>${rs.filter(x=>x.success).length}/${rs.length}</td><td>${Math.max(...rs.map(x=>x.error_deg)).toFixed(2)}°</td><td>${ps.filter(x=>x.success).length}/${ps.length}</td></tr>`}).join('')}</table>`:'';
      const pass=r.filter(r=>r.error_deg<=c.success_tolerance_deg).length;
      return `<article class="array-card"><div><h3>${esc(names[id]||id)}</h3><div class="array-meta">${pts.length} microphones · ${span.toFixed(1)} cm maximum span</div><div class="array-geometry">${geometry(pts,limit)}</div></div><div class="array-results"><div class="array-chart">${r.length?chart(r,bands,yMax):'<div class="array-empty">No single-source results.</div>'}</div><div class="array-metrics" style="${compare?'display:none':''}"><span>Within 5°: <strong>${pass}/${r.length}</strong></span><span>Worst error: <strong>${r.length?Math.max(...r.map(r=>r.error_deg)).toFixed(2)+'°':'—'}</strong></span><span>Median −3 dB beamwidth: <strong>${median===null?'—':median.toFixed(1)+'°'}</strong>${m<r.length?` (${m}/${r.length} measured)`:''}</span>${pairs.length?`<span>Two-source pass: <strong>${pairs.filter(r=>r.success===true||r.success==='True'||r.success===1).length}/${pairs.length}</strong></span>`:''}</div>${fftTable}</div></article>`;
    }).join('');
  }
  [distance,snr,view].forEach(n=>n.addEventListener('change',render));
  render();
})();
