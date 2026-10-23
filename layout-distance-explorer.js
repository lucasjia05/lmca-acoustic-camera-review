(() => {
  const el = id => document.getElementById(id);
  const snr = el('layout-snr'), level = el('layout-level');
  const checks = [...document.querySelectorAll('input[name="layout-bits"]')];
  const names = {'grid16-30cm-span':'16-mic square grid · 30 cm span','circle30-30cm':'30-mic circle · 30 cm','spiral30-30cm':'30-mic spiral · 30 cm','parsa-30cm':'Parsa layout · 30 cm','parsa-35cm':'Parsa layout · 35 cm','parsa-native':'Parsa original · 8.6 cm','circle16-30cm':'16-mic circle · 30 cm','spiral16-30cm':'16-mic spiral · 30 cm'};
  const colors = {0:'#566575',12:'#bd424f',16:'#147d87',20:'#ad7215',24:'#8057b2'};
  const label = b => b === 0 ? 'Float reference' : `${b}-bit`;
  const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const line = (x1,y1,x2,y2,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
  const txt = (x,y,s,extra='') => `<text x="${x}" y="${y}" style="text-anchor:${extra.match(/text-anchor="([^"]+)"/)?.[1]||'start'}" ${extra}>${esc(s)}</text>`;
  const svg = (w,h,s,text) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(text)}">${s}</svg>`;
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
  function chart(rows,bits,yMax) {
    const W=560,H=290,L=55,R=20,T=42,B=52;
    const x=v=>L+(v-.25)/4.75*(W-L-R),y=v=>H-B-v/yMax*(H-T-B);
    let out='';
    for(const v of [0,yMax/4,yMax/2,3*yMax/4,yMax])out+=line(L,y(v),W-R,y(v),'stroke="#e0e6e7"')+txt(L-8,y(v)+4,Number(v.toFixed(1)),'text-anchor="end"');
    out+=line(L,T,L,H-B,'stroke="#a1afb3"')+line(L,H-B,W-R,H-B,'stroke="#a1afb3"');
    for(const v of [.25,1,2,3,4,5])out+=txt(x(v),H-B+20,v,'text-anchor="middle"');
    out+=line(L,y(5),W-R,y(5),'stroke="#c33b45" stroke-dasharray="5 4"')+txt(W-R,y(5)-5,'5° target','text-anchor="end" fill="#b43540"');
    bits.forEach((b,index)=>{
      const series=rows.filter(r=>r.bits===b).sort((a,b)=>a.distance_m-b.distance_m);
      let path='';
      series.forEach((r,i)=>{
        if(r.worst_error_deg===null || r.zero_maps)return;
        const previous=series[i-1];
        path+=`${!previous || previous.worst_error_deg===null || previous.zero_maps?'M':'L'}${x(r.distance_m)} ${y(r.worst_error_deg)} `;
      });
      const dash={0:'12 4 2 4',12:'2 3',16:'',20:'8 4',24:'3 3'}[b];
      out+=`<path d="${path}" fill="none" stroke="${colors[b]}" stroke-width="2" stroke-dasharray="${dash}"/>`;
      series.forEach(r=>{
        const tip=`${label(b)}; ${r.distance_m} m; ${r.passed}/${r.trials} within 5°; worst ${r.worst_error_deg===null?'no output':r.worst_error_deg.toFixed(2)+'°'}; ${r.zero_maps} no-output trials`;
        if(r.zero_maps){
          const px=x(r.distance_m),py=20+index*4;
          out+=`<path d="M${px-3} ${py-3}l6 6m0 -6l-6 6" stroke="${colors[b]}" stroke-width="2"><title>${esc(tip)}</title></path>`;
        }else if(r.worst_error_deg!==null){
          out+=`<circle cx="${x(r.distance_m)}" cy="${y(r.worst_error_deg)}" r="4" fill="${colors[b]}" stroke="white" stroke-width=".6"><title>${esc(tip)}</title></circle>`;
        }
      });
    });
    out+=txt(L,13,'Worst angular error (°)')+txt((L+W-R)/2,H-6,'Source distance (m)','text-anchor="middle"');
    return svg(W,H,out,'Worst localization error versus distance, overlaid bit widths');
  }
  function render() {
    const bits=checks.filter(c=>c.checked).map(c=>Number(c.value));
    level.disabled=bits.every(b=>b===0);
    const groups=layoutDistanceData.arrays.map(a=>({...a,rows:a.summary.filter(r=>bits.includes(r.bits)&&r.snr_db===Number(snr.value)&&(r.bits===0||r.input_rms_dbfs===Number(level.value)))}));
    const finite=groups.flatMap(a=>a.rows).filter(r=>r.worst_error_deg!==null&&!r.zero_maps);
    const yMax=Math.max(10,Math.ceil(Math.max(0,...finite.map(r=>r.worst_error_deg))/10)*10);
    const limit=Math.ceil(Math.max(...groups.flatMap(a=>a.geometry).flatMap(p=>[Math.abs(p[0]),Math.abs(p[1])]))*100)/100;
    el('layout-conditions').innerHTML='512 samples (10.7 ms) · 48 ksample/s · 1–4 kHz · 27 trials per distance (9 directions × 3 seeds).<br>Distance: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5 m. SNR and digital input level are held fixed; this tests geometry and precision, not maximum detection range.';
    el('layout-legend').innerHTML=bits.map(b=>`<span><i style="background:${colors[b]}"></i>${label(b)}</span>`).join('')+'<span>Worst error at each distance · × = no output in one or more trials · hover for counts.</span>';
    if(!bits.length){el('layout-gallery').innerHTML='<p class="array-empty">Select at least one bit width.</p>';return;}
    el('layout-gallery').innerHTML=groups.map(a=>{
      const pts=a.geometry;
      const span=Math.max(...pts.flatMap(p=>pts.map(q=>Math.hypot(...p.map((v,k)=>v-q[k])))))*100;
      const metrics=bits.map(b=>{
        const rs=a.rows.filter(r=>r.bits===b);
        return `<span style="color:${colors[b]}">${label(b)}: <strong>${rs.reduce((v,r)=>v+r.passed,0)}/${rs.reduce((v,r)=>v+r.trials,0)}</strong> within 5°</span>`;
      }).join('');
      return `<article class="array-card"><div><h3>${esc(names[a.id]||a.id)}</h3><div class="array-meta">${pts.length} microphones · ${span.toFixed(1)} cm maximum span</div><div class="array-geometry">${geometry(pts,limit)}</div></div><div class="array-results"><div class="array-chart">${chart(a.rows,bits,yMax)}</div><div class="array-metrics">${metrics}</div></div></article>`;
    }).join('');
  }
  [...checks,snr,level].forEach(n=>n.addEventListener('change',render));
  render();
})();
