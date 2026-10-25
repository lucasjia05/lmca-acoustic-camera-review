(() => {
  const host = document.getElementById('how-it-works');
  host.innerHTML = `<div class="section-head"><span class="number">05</span><h2>How it works</h2></div>
  <p class="intro">The FFT asks <strong>“Which pitches are here?”</strong> Beamforming asks <strong>“Which direction did they come from?”</strong></p>
  <div class="learn-controls"><button id="learn-play" class="utility">Play walkthrough</button><button id="learn-next" class="utility">Next step →</button><label>Move the sound <input id="learn-angle" type="range" min="-50" max="50" value="25" step="1"> <output id="learn-angle-value">25°</output></label></div>
  <div class="learn-controls"><label>Try a direction <input id="learn-guess" type="range" min="-60" max="60" value="-30" step="1"> <output id="learn-guess-value">−30°</output></label></div>
  <div class="learn-steps" aria-label="Animation steps"></div>
  <div class="learn-story" aria-live="polite"><h3 id="learn-title"></h3><p id="learn-description"></p></div>
  <div class="learn-grid">
    <article><h3>1 · Hear the sound</h3><canvas id="learn-arrival" role="img" aria-label="Sound waves reach three microphones at different times"></canvas><p>Each microphone records its own wiggly line. The small timing differences are our clue to direction.</p></article>
    <article><h3>2 · Separate the pitches</h3><canvas id="learn-fft" role="img" aria-label="Microphone waveform and frequency spectrum"></canvas><p>The FFT keeps both <strong>how much</strong> of each pitch we heard and <strong>where it is in its cycle</strong> (phase).</p></article>
    <article><h3>3 · Try a direction</h3><canvas id="learn-align" role="img" aria-label="Microphone phase arrows before and after steering"></canvas><p>For each guessed direction, rotate the phase arrows to undo the expected arrival delays. Then add them.</p></article>
    <article><h3>4 · Find the strongest match</h3><canvas id="learn-map" role="img" aria-label="Beamforming power versus guessed direction"></canvas><p>Square the sum’s size to get power, then add powers across the selected frequencies. The strongest direction becomes the hot spot.</p></article>
  </div>
  <details class="learn-details"><summary>Connect this to our chip</summary><p><strong>30 microphones → PDM-to-PCM filter → 512 samples per microphone → Hann window + FFT → bins 11–42 → phase alignment → microphone sum → power → frequency-bin sum → acoustic map.</strong></p><p>At 48,000 samples/s, each frame is 10.67 ms and bins are 93.75 Hz apart. The 32 selected bin centers span 1031.25–3937.5 Hz. FFT alone does not tell us the direction: we must retain the separate microphones’ complex spectra.</p><p>This animation uses three closely spaced microphones, two bin-centered tones (1500 and 3000 Hz), and a left-to-right scan to make the idea visible. Our array has 30 microphones and scans both left/right and up/down. This is an ideal, noiseless explanation, not a performance simulation. A hot spot indicates direction; it does not by itself measure distance.</p></details>`;
  const steps = [
    ['Listen together', 'Imagine three ears hearing the same whistle. The ear nearer the whistle hears it a tiny bit sooner. We save those timing clues.'],
    ['Sort the sound into pitches', 'Imagine sorting a mixed bag of colored blocks. The FFT separates the mixed wiggle into pitches. The bars show their strengths; the little arrows in the next panel show their phases.'],
    ['Guess, then line up', 'We ask: “What if the sound came from here?” We undo the delays expected for that direction. A wrong guess leaves the arrows spread out. A correct guess makes them point together.'],
    ['Keep the strongest match', 'Aligned arrows add into a big arrow. Misaligned arrows partly cancel. We repeat for many directions and pitches: the biggest combined power tells us where to paint the hot spot.']
  ];
  const buttons = steps.map((s,i) => { const b=document.createElement('button');b.textContent=`${i+1} · ${['Listen','FFT','Align','Map'][i]}`;b.onclick=()=>{playing=false;setStep(i);};host.querySelector('.learn-steps').append(b);return b; });
  const ids=['arrival','fft','align','map'];
  const canvases=ids.map(id=>document.getElementById('learn-'+id));
  const colors=['#007e87','#d07c23','#785caf'];
  const positions=[-.035,0,.035], freqs=[1500,3000], amplitudes=[1,.65], fs=48000,N=512;
  let source=25,step=0,playing=false,stepStart=0,last=0,phase=0,guess=-60,spectrum=[],curve=[];
  const rad=x=>x*Math.PI/180;
  const phaseAt=(x,f,a)=>2*Math.PI*f*x*Math.sin(rad(a))/343;
  function calculate(){
    // A real DFT of one synthetic, Hann-windowed 512-sample microphone frame.
    const samples=Array.from({length:N},(_,n)=>freqs.reduce((s,f,i)=>s+amplitudes[i]*Math.cos(2*Math.PI*f*n/fs+phaseAt(positions[0],f,source)),0));
    spectrum=Array.from({length:55},(_,k)=>{let re=0,im=0;for(let n=0;n<N;n++){const w=.5-.5*Math.cos(2*Math.PI*n/(N-1)),p=2*Math.PI*k*n/N;re+=samples[n]*w*Math.cos(p);im-=samples[n]*w*Math.sin(p);}return Math.hypot(re,im)/(N/4);});
    // Same phase-steer / sum / squared-magnitude rule as the explanatory arrows.
    curve=Array.from({length:121},(_,i)=>{const a=i-60;return freqs.reduce((s,f,j)=>{let re=0,im=0;positions.forEach(x=>{const p=phaseAt(x,f,source)-phaseAt(x,f,a);re+=Math.cos(p);im+=Math.sin(p);});return s+amplitudes[j]**2*(re*re+im*im);},0)/(9*amplitudes.reduce((s,a)=>s+a*a,0));});
  }
  function setStep(i){step=i;stepStart=performance.now();buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));document.getElementById('learn-title').textContent=steps[i][0];document.getElementById('learn-description').textContent=steps[i][1];host.querySelectorAll('.learn-grid article').forEach((a,j)=>a.classList.toggle('active',j===i));document.getElementById('learn-play').textContent=playing?'Pause':'Play walkthrough';}
  document.getElementById('learn-play').onclick=()=>{playing=!playing;stepStart=performance.now();setStep(step);};
  document.getElementById('learn-next').onclick=()=>{playing=false;setStep((step+1)%4);};
  document.getElementById('learn-angle').oninput=e=>{source=Number(e.target.value);document.getElementById('learn-angle-value').textContent=source+'°';calculate();};
  document.getElementById('learn-guess').oninput=e=>{playing=false;guess=Number(e.target.value);setStep(2);};
  function setup(canvas){const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;const w=Math.max(280,rect.width),h=250;if(canvas.width!==Math.round(w*dpr)||canvas.height!==h*dpr){canvas.width=Math.round(w*dpr);canvas.height=h*dpr;}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.font='12px Segoe UI';return {c,w,h};}
  function text(c,t,x,y,color='#536873'){c.fillStyle=color;c.fillText(t,x,y);}
  function line(c,x,y,X,Y,color='#d7e0e3',width=1){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function dot(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
  function arrow(c,x,y,p,len,color){const X=x+len*Math.cos(p),Y=y-len*Math.sin(p);line(c,x,y,X,Y,color,2.5);line(c,X,Y,X-7*Math.cos(p-.45),Y+7*Math.sin(p-.45),color,2);line(c,X,Y,X-7*Math.cos(p+.45),Y+7*Math.sin(p+.45),color,2);}
  function draw(){
    let {c,w}=setup(canvases[0]);const sx=w/2+Math.sin(rad(source))*110,sy=30;
    c.save();c.beginPath();c.rect(0,0,w,142);c.clip();for(let i=0;i<6;i++){c.beginPath();c.arc(sx,sy,(phase*30+i*28)%180,0,Math.PI*2);c.strokeStyle='#007e872a';c.stroke();}c.restore();dot(c,sx,sy,8,'#162b35');text(c,'Sound',sx+13,sy+4);
    positions.forEach((x,i)=>{const mx=w/2+x*2000;dot(c,mx,125,6,colors[i]);text(c,String.fromCharCode(65+i),mx-4,145,colors[i]);const y=167+i*26;text(c,String.fromCharCode(65+i),8,y+4,colors[i]);c.beginPath();for(let j=0;j<w-40;j++){const t=j/(w-40)*.0013;const v=freqs.reduce((s,f,k)=>s+amplitudes[k]*Math.cos(2*Math.PI*f*t+phaseAt(x,f,source)-phase),0);const Y=y-v*7;j?c.lineTo(30+j,Y):c.moveTo(30+j,Y);}c.strokeStyle=colors[i];c.lineWidth=1.5;c.stroke();});
    ({c,w}=setup(canvases[1]));text(c,'One microphone · mixed pitches',12,20);c.beginPath();for(let j=0;j<w-24;j++){const v=freqs.reduce((s,f,k)=>s+amplitudes[k]*Math.cos(2*Math.PI*f*j/(w-24)*.002-phase),0);j?c.lineTo(12+j,58-v*17):c.moveTo(12+j,58-v*17);}c.strokeStyle=colors[0];c.lineWidth=2;c.stroke();text(c,'FFT ↓  strength at each frequency',12,104);const x0=32,x1=w-20,y0=205;line(c,x0,y0,x1,y0);spectrum.forEach((v,k)=>{const x=x0+k/54*(x1-x0);line(c,x,y0,x,y0-v*75,k>=11&&k<=42?colors[0]:'#cbd5d7',Math.max(2,(x1-x0)/65));});[0,1,2,3,4,5].forEach(k=>text(c,k+'',x0+k*1000/(54*93.75)*(x1-x0)-3,222));text(c,'Frequency (kHz)',w/2-40,239);text(c,'1.5 kHz',x0+16/54*(x1-x0)-18,119);text(c,'3 kHz',x0+32/54*(x1-x0)-10,150);
    ({c,w}=setup(canvases[2]));text(c,`1500 Hz · guessing ${guess.toFixed(0)}°`,12,22);const cy=91;let re=0,im=0;positions.forEach((x,i)=>{const cx=w*(i+1)/4,p=phaseAt(x,1500,source)-phaseAt(x,1500,guess);c.beginPath();c.arc(cx,cy,29,0,2*Math.PI);c.strokeStyle='#d7e0e3';c.lineWidth=1;c.stroke();arrow(c,cx,cy,p,26,colors[i]);text(c,String.fromCharCode(65+i),cx-4,137,colors[i]);re+=Math.cos(p);im+=Math.sin(p);});text(c,'After correcting the guessed delays',12,160);arrow(c,35,201,Math.atan2(im,re),Math.hypot(re,im)*26,'#162b35');text(c,'Sum',w-65,204);text(c,Math.abs(guess-source)<2?'Aligned! The sum is strongest.':'Not lined up yet → a smaller sum.',12,235);
    ({c,w}=setup(canvases[3]));const left=35,right=w-18,top=35,bottom=190;const X=a=>left+(a+60)/120*(right-left);text(c,'Combined power · both pitches',12,19);line(c,left,bottom,right,bottom);c.beginPath();curve.forEach((v,i)=>{const x=X(i-60),y=bottom-v*(bottom-top);i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle=colors[0];c.lineWidth=2.5;c.stroke();line(c,X(source),top,X(source),bottom,'#d07c23',1);text(c,'Source '+source+'°',Math.min(right-75,Math.max(left,X(source)-30)),top-5,'#ad6217');dot(c,X(guess),bottom-curve[Math.round(guess)+60]*(bottom-top),5,'#162b35');[-60,-30,0,30,60].forEach(a=>text(c,a+'°',X(a)-10,208));for(let i=0;i<121;i++){c.fillStyle=`hsl(${180-curve[i]*150} 75% ${92-curve[i]*40}%)`;c.fillRect(X(i-60),218,(right-left)/120+1,12);}text(c,'Guessed direction',w/2-45,243);
  }
  function tick(now){if(!host.hidden){const dt=Math.min((now-last)/1000,.1);if(playing&&!matchMedia('(prefers-reduced-motion: reduce)').matches)phase+=dt*2;if(playing&&now-stepStart>6000){if(step===3){playing=false;setStep(3);}else setStep(step+1);}const elapsed=(now-stepStart)/1000;if(step===2&&playing)guess=-60+Math.min(1,elapsed/4)*(source+60);else if(step===3&&playing)guess=-60+Math.min(1,elapsed/4)*120;document.getElementById('learn-guess').value=guess;document.getElementById('learn-guess-value').textContent=guess.toFixed(0)+'°';draw();}last=now;requestAnimationFrame(tick);}
  calculate();setStep(0);requestAnimationFrame(tick);
})();
