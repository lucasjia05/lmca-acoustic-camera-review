(() => {
  const el = id => document.getElementById(id);
  const filters = Object.fromEntries(['bits','snr','level'].map(key=>[key,[...document.querySelectorAll(`input[name="layout-${key}"]`)]]));
  const chosen = key => filters[key].filter(c=>c.checked).map(c=>Number(c.value));
  const menus = [...document.querySelectorAll('.layout-filter')];
  const names = {'grid16-30cm-span':'16-mic square grid · 30 cm span','circle30-30cm':'30-mic circle · 30 cm','spiral30-30cm':'30-mic spiral · 30 cm','parsa-30cm':'Parsa layout · 30 cm','parsa-35cm':'Parsa layout · 35 cm','parsa-native':'Parsa original · 8.6 cm','circle16-30cm':'16-mic circle · 30 cm','spiral16-30cm':'16-mic spiral · 30 cm'};
  const colors = {0:'#566575',12:'#bd424f',16:'#147d87',20:'#ad7215',24:'#8057b2'};
  const label = b => b === 0 ? 'Float reference' : `${b}-bit`;
  const conditionKey = r => `${r.snr_db}/${r.input_rms_dbfs}`;
  const conditionLabel = r => `${label(r.bits)}; SNR ${r.snr_db} dB${r.bits===0?'':`; input ${r.input_rms_dbfs} dBFS`}`;
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
    const conditions=[...new Set(rows.map(conditionKey))];
    const seriesGroups=[...new Set(rows.map(r=>`${r.bits}/${conditionKey(r)}`))].map(key=>rows.filter(r=>`${r.bits}/${conditionKey(r)}`===key).sort((a,b)=>a.distance_m-b.distance_m));
    seriesGroups.forEach((series,index)=>{
      const b=series[0].bits;
      // Small horizontal offsets reveal overlapping trials; distance itself is unchanged.
      series.forEach(r=>r.trial_errors_deg.forEach((error,i)=>{
        if(error===null)return;
        const px=x(r.distance_m)+(((i*7+index*3)%17)-8)*.65;
        const tip=`${conditionLabel(r)}; ${r.distance_m} m; trial ${i+1}; error ${error.toFixed(2)}°`;
        out+=`<circle cx="${px}" cy="${y(error)}" r="2.1" fill="${colors[b]}" fill-opacity=".25"><title>${esc(tip)}</title></circle>`;
      }));
      let path='';
      series.forEach((r,i)=>{
        if(r.worst_error_deg===null)return;
        const previous=series[i-1];
        path+=`${!previous || previous.worst_error_deg===null?'M':'L'}${x(r.distance_m)} ${y(r.worst_error_deg)} `;
      });
      const patterns=['','8 4','3 3','10 3 2 3','2 5','12 5'];
      const dash=b===0?'12 4 2 4':patterns[conditions.indexOf(conditionKey(series[0]))%patterns.length];
      out+=`<path d="${path}" fill="none" stroke="${colors[b]}" stroke-width="2" stroke-dasharray="${dash}"><title>${esc(conditionLabel(series[0]))}; worst-case valid-output error</title></path>`;
      series.forEach(r=>{
        const tip=`${conditionLabel(r)}; ${r.distance_m} m; ${r.passed}/${r.trials} within 5°; worst ${r.worst_error_deg===null?'no output':r.worst_error_deg.toFixed(2)+'°'}; ${r.zero_maps} no-output trials`;
        if(r.zero_maps){
          const px=x(r.distance_m),py=20+bits.indexOf(b)*4;
          out+=`<path d="M${px-3} ${py-3}l6 6m0 -6l-6 6" stroke="${colors[b]}" stroke-width="2"><title>${esc(tip)}</title></path>`;
        }
        if(r.worst_error_deg!==null)out+=`<circle cx="${x(r.distance_m)}" cy="${y(r.worst_error_deg)}" r="3.5" fill="${colors[b]}" stroke="white" stroke-width=".6"><title>${esc(tip)}</title></circle>`;
      });
    });
    out+=txt(L,13,'Angular error (°)')+txt((L+W-R)/2,H-6,'Source distance (m)','text-anchor="middle"');
    return svg(W,H,out,'Individual trial errors and worst-case localization error versus distance');
  }
  function render() {
    const bits=chosen('bits'),snrs=chosen('snr'),levels=chosen('level');
    el('layout-bits-summary').textContent=bits.length?bits.map(label).join(', '):'Choose widths';
    el('layout-snr-summary').textContent=snrs.length?snrs.map(n=>`${n} dB`).join(', '):'Choose SNRs';
    el('layout-level-summary').textContent=levels.length?levels.map(n=>`${n} dBFS`).join(', '):'Choose levels';
    filters.level.forEach(c=>c.disabled=bits.length>0&&bits.every(b=>b===0));
    const groups=layoutDistanceData.arrays.map(a=>({...a,rows:a.summary.filter(r=>bits.includes(r.bits)&&snrs.includes(r.snr_db)&&(r.bits===0||levels.includes(r.input_rms_dbfs)))}));
    const finite=groups.flatMap(a=>a.rows).filter(r=>r.worst_error_deg!==null);
    const yMax=Math.max(10,Math.ceil(Math.max(0,...finite.map(r=>r.worst_error_deg))/10)*10);
    const limit=Math.ceil(Math.max(...groups.flatMap(a=>a.geometry).flatMap(p=>[Math.abs(p[0]),Math.abs(p[1])]))*100)/100;
    el('layout-conditions').innerHTML='512 samples (10.7 ms) · 48 ksample/s · 1–4 kHz · 27 trials per distance and condition.<br>SNR and digital level are fixed along each curve; distance tests geometry, not maximum detection range.';
    el('layout-legend').innerHTML=bits.map(b=>`<span><i style="background:${colors[b]}"></i>${label(b)}</span>`).join('')+'<span>Dots = individual trials · lines = worst-case valid-output error · × = no output. Hover for conditions.</span>';
    if(!bits.length||!snrs.length||(!levels.length&&bits.some(b=>b!==0))){el('layout-gallery').innerHTML='<p class="array-empty">Choose at least one option in each applicable dropdown.</p>';return;}
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
  Object.values(filters).flat().forEach(n=>n.addEventListener('change',render));
  menus.forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)menus.filter(m=>m!==menu).forEach(m=>m.open=false);}));
  document.addEventListener('click',event=>menus.forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')menus.filter(m=>m.open).forEach(m=>{m.open=false; m.querySelector('summary').focus();});});
  render();
})();
