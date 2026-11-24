/* Conceptual hierarchy traced to DFT-DAS/rtl at commit 9458624.
   Box boundaries inside the core describe logic, not additional SV modules. */
(() => {
  'use strict';
  const coreFile = 'lmca_compact_core.sv';
  const sourceRoot = 'https://github.com/EasonLi292/lmco-acoustic-camera-algorithm/blob/9458624ba3ab3af88abd1f1944244bb8f43ba921/DFT-DAS/rtl/';
  const b = (x,y,w,h,title,lines=[],to=null,kind='leaf') => ({x,y,w,h,title,lines,to,kind});
  const e = (path,label='',x=0,y=0,control=false) => ({path,label,x,y,control});
  const scenes = {
    core: {
      title:'Processing core', crumb:'u_core', parent:null, file:coreFile, height:650,
      summary:'The same core blocks as the overall architecture. Open a teal block to inspect its internal structure.',
      caption:'The rotating-storage presets use continuous Fourier-bank rotation and one captured windowed sample per microphone. Arithmetic is reused across microphones, bins and scan directions.',
      boxes:[
        b(35,70,260,120,'Window + sample hold',['PCM × window','One sample per mic'],'window'),
        b(460,70,300,120,'Shared complex arithmetic',['Selected-bin DFT, then DAS'],'arithmetic'),
        b(925,70,260,120,'Power + normalization',['One power per direction'],'power'),
        b(35,290,260,120,'Trig lookup',['u_trig · sin / cos'],'trig'),
        b(460,290,300,120,'Rotating Fourier banks',['spectrum_r / spectrum_i'],'storage'),
        b(925,290,260,120,'Phase generation',['DFT / steering phase'],'phase'),
        b(35,500,260,100,'Controller',['State + traversal counters'],'controller')],
      wires:[e('M295 130H460','windowed PCM',320,115),e('M760 130H925','DAS sums',800,115),
        e('M560 190V290','update',505,240),e('M665 290V190','read',680,240),
        e('M295 350H360V235H490V190','sin / cos',365,223),e('M1055 410V455H165V410','phase',650,444),
        e('M165 500V465H15V130H35','control',20,450,true)]
    },
    arithmetic: {
      title:'Shared complex arithmetic', crumb:'Shared complex arithmetic', parent:'core',file:coreFile,height:690,
      summary:'One complex multiply is built from four real multipliers. The core reuses it for DFT accumulation and DAS phase correction.',
      caption:'Shown: SERIAL_CMAC = 0, used by the current candidate presets. In DFT mode b = 0, so the b×d and b×c terms contribute zero. SERIAL_CMAC = 1 instead sequences the products through one real multiplier.',
      boxes:[
        b(25,85,260,170,'Operand selection',['a = windowed sample (DFT)','or spectrum real (DAS)','b = 0 (DFT) / imag (DAS)']),
        b(25,365,260,110,'Trig coefficients',['c = cosine · d = sine','18-bit signed Q16'],'trig'),
        b(410,55,190,90,'a × c',['24 × 18-bit multiply'],null,'multiplier'),
        b(410,205,190,90,'b × d',['24 × 18-bit multiply'],null,'multiplier'),
        b(410,355,190,90,'a × d',['24 × 18-bit multiply'],null,'multiplier'),
        b(410,505,190,90,'b × c',['24 × 18-bit multiply'],null,'multiplier'),
        b(735,130,200,105,'Subtract',['product_r = ac − bd']),
        b(735,430,200,105,'Add',['product_i = ad + bc']),
        b(1020,235,180,200,['DFT / DAS','accumulators'],['Round, add, store','Real + imaginary'],'accumulation')],
      wires:[e('M285 170H325V100H410','a, b',335,87),e('M325 170V250H410'),e('M325 250V400H410'),e('M325 400V550H410'),
        e('M285 420H375V115H410','c, d',337,459),e('M375 265H410'),e('M375 415H410'),e('M375 420V565H410'),
        e('M600 100H670V155H735','ac',625,85),e('M600 250H690V210H735','bd',625,278),
        e('M600 400H670V455H735','ad',625,385),e('M600 550H690V510H735','bc',625,579),
        e('M935 180H975V285H1020','real',950,160),e('M935 480H980V385H1020','imag',946,512)]
    },
    accumulation: {
      title:'DFT and DAS accumulation',crumb:'Accumulators',parent:'arithmetic',file:coreFile,height:650,
      summary:'The complex products feed two different accumulation paths, selected by the core state. Real and imaginary components each have the same structure.',
      caption:'DFT updates wrap to ACC_W bits, matching the RTL; they do not use a saturating accumulator. DAS rounds and saturates the rotated sample, then saturates the SUM_W-bit microphone sum. SUM_W = DATA_W + ceil(log₂(MICS)) + 1.',
      boxes:[
        b(30,75,200,100,'Complex product',['product_r / product_i']),
        b(320,60,230,120,'DFT rounding',['To ACC_FRAC','Current presets: Q15']),
        b(655,60,230,120,'Add previous DFT',['Zero old value at n = 0','Wrap to ACC_W = 24']),
        b(980,60,220,120,'Fourier banks',['Store updated_r / i'],'storage'),
        b(320,340,230,120,'DAS rounding',['Shift by COEF_FRAC','Saturate to DATA_W']),
        b(655,340,230,120,'Add microphone',['acc_r + qr / acc_i + qi','Saturate to SUM_W']),
        b(980,340,220,120,'Power calculation',['After the last mic'],'power'),
        b(655,520,230,85,'DAS sum registers',['acc_r / acc_i'])],
      wires:[e('M230 110H320','DFT',256,96),e('M230 140H270V400H320','DAS',276,377),e('M550 120H655'),e('M885 120H980'),
        e('M1090 180V240H770V180','previous Fourier value',800,229),e('M550 400H655'),e('M885 400H980'),
        e('M770 460V520'),e('M655 562H610V430H655','feedback',505,550)]
    },
    window: {
      title:'Window + sample hold',crumb:'Window + sample hold',parent:'core',file:coreFile,height:570,
      summary:'Apply the window to each microphone sample, then retain that sample while its selected frequency bins are updated.',
      caption:'With TILE_CAPTURE_VECTOR = 1, samples[MICS] holds one windowed sample per microphone and rotates with the Fourier storage. It is not an MICS × N PCM frame buffer. The legacy mode holds one sample in sample_hold.',
      boxes:[b(25,90,220,100,'PCM input',['s_pcm · 16-bit Q15']),b(25,290,220,110,'Window constants',['window_coeff[n]','18-bit Q16']),
        b(350,90,210,110,'Multiply',['PCM × window']),b(655,90,245,110,'Round and saturate',['WIN_W = 18','WIN_FRAC = 16']),
        b(655,320,245,120,'Sample registers',['samples[MICS]','18 bits per microphone']),b(1000,320,200,120,'DFT arithmetic',['Selected sample at head'],'arithmetic')],
      wires:[e('M245 140H350'),e('M245 345H300V175H350','coefficient',310,290),e('M560 145H655'),e('M775 200V320'),e('M900 380H1000'),
        e('M775 440V490H620V380H655','rotate in step with Fourier banks',620,521)]
    },
    storage: {
      title:'Rotating Fourier banks',crumb:'Rotating Fourier banks',parent:'core',file:coreFile,height:650,
      summary:'One register ring per selected bin retains a complex Fourier value for every microphone. The arithmetic reads the head; DFT updates replace the value returning to the tail.',
      caption:'This view shows SPECTRUM_TILE_MICS = MICS and TILE_CAPTURE_VECTOR = 1. Microphone values move between slots as all banks rotate every clock, including stalls and idle. No Fourier values are discarded. At 30 mics / 10 bins / ACC24, the banks contain 14,400 bits.',
      boxes:[b(30,80,230,110,'DFT update',['updated_r / updated_i'],'accumulation'),
        b(355,65,250,100,'Tail input selection',['Updated value in DFT','Otherwise original head']),
        b(350,270,140,85,'slot 0',['head']),b(550,270,140,85,'slot 1'),b(750,270,140,85,'…'),b(950,270,170,85,'slot M−1',['tail']),
        b(30,270,230,110,'Select bin head',['One complex value','2 × ACC_W bits']),
        b(30,480,230,115,'DAS read scaling',['Divide by N via scaling','To DATA_W / DATA_FRAC']),
        b(390,480,250,100,'Shared arithmetic',['Phase-correct DAS value'],'arithmetic')],
      wires:[e('M260 135H355'),e('M605 115H1035V270'),e('M550 312H490'),e('M750 312H690'),e('M950 312H890'),
        e('M350 312H260'),e('M420 270V220H480V165','recirculate head',505,211),e('M145 380V480'),e('M260 530H390')]
    },
    phase: {
      title:'Phase generation',crumb:'Phase generation',parent:'core',file:coreFile,height:690,
      summary:'DFT phase depends on sample index and bin number. DAS steering phase depends on microphone geometry, candidate direction and bin number.',
      caption:'Geometry constants already include fs / (N × speed of sound) in Q24 turns; scan vectors use Q18. The planar array has gz = 0, so synthesis can remove that product. Both paths wrap to PHASE_BITS = 10.',
      boxes:[b(25,65,240,100,'Mic geometry',['gx[m], gy[m], gz[m]']),b(25,240,240,100,'Scan direction',['dx[d], dy[d], dz[d]']),
        b(365,80,285,130,'Dot product',['gx × dx + gy × dy','+ gz × dz']),b(755,80,200,130,'Multiply by bin',['bin_phase = dot × k']),
        b(365,385,285,110,'DFT phase',['−n × k mod N','Scale into phase code']),b(25,385,240,110,'Sample and bin',['sample_index n','bin_numbers[k]']),
        b(1025,80,175,130,'Round / wrap',['Steering phase']),b(795,385,260,110,'State selects phase',['DFT or DAS']),
        b(795,555,260,95,'Trig lookup',['cosine / sine'],'trig')],
      wires:[e('M265 115H365'),e('M265 290H310V175H365'),e('M650 145H755'),e('M955 145H1025'),
        e('M265 440H365'),e('M265 470H300V295H855V210','bin number k',620,283),e('M650 440H795'),e('M1110 210V330H925V385'),e('M925 495V555')]
    },
    trig: {
      title:'Trig lookup',crumb:'u_trig',parent:'core',file:'lmca_compact_trig.sv',height:600,
      summary:'Generate sine and cosine from a single quarter-wave constant table. Cosine uses the same table with a quarter-turn phase offset.',
      caption:'At PHASE_BITS = 10 the quarter-wave table has 257 entries. The two reads and sign selection are combinational; these constants synthesize into logic, not a writable register RAM.',
      boxes:[b(25,90,200,100,'Phase input',['10-bit wrapped phase']),b(310,75,230,110,'Sine address',['Fold into first quadrant']),
        b(310,300,230,110,'Cosine address',['Add quarter turn','Then fold quadrant']),b(655,170,260,140,'Quarter-wave constants',['quarter[0 … 256]','Two lookup addresses']),
        b(1010,75,190,110,'Sine sign',['Quadrant sign']),b(1010,300,190,110,'Cosine sign',['Offset-quadrant sign'])],
      wires:[e('M225 120H310'),e('M225 155H265V355H310'),e('M540 130H590V210H655'),e('M540 355H590V275H655'),
        e('M915 210H955V130H1010'),e('M915 275H955V355H1010'),e('M1105 185V235','sine · 18 bits',1010,263),e('M1105 410V460','cosine · 18 bits',990,491)]
    },
    power: {
      title:'Power + normalization',crumb:'Power + normalization',parent:'core',file:coreFile,height:620,
      summary:'Square the coherent microphone sums, add real and imaginary power, then accumulate across selected bins for the current direction.',
      caption:'SUM_W depends on microphone count. Power is rounded to POWER_FRAC = 32 and accumulated in MAP_W = 48 bits. Normalization is power_total × GAIN_NUM / (MICS² × GAIN_DEN); constants can simplify during synthesis.',
      boxes:[b(25,85,210,95,'Real DAS sum',['acc_r']),b(25,285,210,95,'Imaginary DAS sum',['acc_i']),
        b(335,85,210,95,'Square',['acc_r × acc_r'],null,'multiplier'),b(335,285,210,95,'Square',['acc_i × acc_i'],null,'multiplier'),
        b(650,180,240,120,'Add and round',['real² + imag²','Scale to Q32']),b(980,180,220,120,'Sum selected bins',['direction_power','48-bit saturation']),
        b(980,440,220,110,'Normalize + output',['Scale by fixed gain','m_power · 48 bits'])],
      wires:[e('M235 132H335'),e('M235 332H335'),e('M545 132H590V215H650'),e('M545 332H590V265H650'),e('M890 240H980'),
        e('M1090 300V440'),e('M1200 260H1210V360H950V265H980','bin accumulation',970,388)]
    },
    controller: {
      title:'Core controller',crumb:'Controller',parent:'core',file:coreFile,height:670,
      summary:'Six states sequence capture, Fourier accumulation, directional summation and output. A transition that consumes data waits for its handshake or operation-ready condition.',
      caption:'Counters track sample_index, mic, bin_index and direction. With the sample-vector schedule, DFT visits microphones inside each bin. DAS visits microphones inside each bin and direction. EMIT waits for map_ready.',
      boxes:[b(35,90,240,100,'IDLE',['Wait for start']),b(490,90,240,100,'CAPTURE',['Accept windowed PCM']),b(945,90,240,100,'DFT',['Update Fourier values']),
        b(945,400,240,100,'DAS',['Phase-correct and sum']),b(490,400,240,100,'POWER',['Accumulate bin power']),b(35,400,240,100,'EMIT',['Hold point until ready'])],
      wires:[e('M275 140H490','start',357,124),e('M730 140H945','sample/vector captured',738,124),
        e('M1065 190V400','window complete',1078,295),e('M945 450H730','all mics',780,432),e('M490 450H275','all bins',350,432),
        e('M155 400V190','last point accepted',38,303),e('M1065 90V35H610V90','more samples',755,23),
        e('M730 480H790V550H1065V500','more bins',805,576),e('M155 500V620H1165V500','next direction',450,645)]
    }
  };

  Object.assign(scenes, {
    decimator: {
      title:'PDM decimator',crumb:'u_pdm',parent:null,file:'lmca_pdm_decimator.sv',height:660,
      summary:'Capture one PDM bit from every microphone together, then share the filter datapath across microphones. Each microphone keeps its own filter state.',
      caption:'Shown: one lane, CIC order 3 and decimation 16. Additional LANES process more microphones per clock. The optional FIR is identity in the balanced and coverage presets. Input remains a handshaked vector interface, not a complete physical microphone-clock interface.',
      boxes:[b(25,65,230,110,'Capture PDM vector',['captured_bits[MICS]','One bit per microphone']),b(340,65,230,110,'Select microphone',['slot counter','Map bit to +1 / −1']),
        b(655,65,240,110,'CIC decimation',['3 integrators + 3 combs','Decimation R = 16'],'cic'),b(980,65,220,110,'Normalize + clip',['Divide CIC gain R³','Round to PCM16 Q15']),
        b(980,350,220,110,'Optional FIR',['Per-mic history','Identity / configured taps'],'fir'),b(655,350,240,110,'PCM vector registers',['pcm_output[mic]','Valid after all mic slots']),
        b(25,350,280,110,'Capture / slot control',['working · slot · count','Update combs every R vectors'])],
      wires:[e('M255 120H340'),e('M570 120H655'),e('M895 120H980'),e('M1090 175V350'),e('M980 405H895'),
        e('M305 405H450V178','slot / decimate enable',335,335,true),e('M775 460V540','MICS × 16-bit PCM',650,573)]
    },
    cic: {
      title:'Third-order CIC',crumb:'CIC',parent:'decimator',file:'lmca_pdm_decimator.sv',height:650,
      summary:'Three running sums operate on every accepted PDM sample. Every 16th sample, three differences produce the decimated result.',
      caption:'Each box includes a shared add/subtract operation and a state bank indexed by microphone. Integrator states wrap at CIC_W bits. Comb state stores the previous input to that comb stage and updates only on a decimation event. Stage order is configurable; three is shown.',
      boxes:[b(25,100,160,95,'±1 PDM',['Selected mic']),b(265,100,230,125,'Integrator 1',['y = state[m] + x','Store y in state[m]']),
        b(625,100,230,125,'Integrator 2',['y = state[m] + x','Store y in state[m]']),b(985,100,230,125,'Integrator 3',['y = state[m] + x','Store y in state[m]']),
        b(985,410,230,125,'Comb 1',['y = x − previous[m]','Store x in previous[m]']),b(625,410,230,125,'Comb 2',['y = x − previous[m]','Store x in previous[m]']),
        b(265,410,230,125,'Comb 3',['y = x − previous[m]','Store x in previous[m]'])],
      wires:[e('M185 150H265'),e('M495 160H625'),e('M855 160H985'),e('M1100 225V410','Every R = 16 samples',890,315),
        e('M985 472H855'),e('M625 472H495'),e('M265 472H65','to normalization',65,508)]
    },
    fir: {
      title:'Optional FIR',crumb:'FIR',parent:'decimator',file:'lmca_pdm_decimator.sv',height:590,
      summary:'The current PCM sample and that microphone’s previous samples are multiplied by fixed coefficients and summed.',
      caption:'The drawing illustrates three taps; FIR_TAPS selects the actual length. With one tap and coefficient 1, synthesis can remove the filter arithmetic. History is separate for each microphone. More taps add arithmetic and stored samples.',
      boxes:[b(25,70,220,100,'PCM input',['Current selected mic']),b(355,70,220,100,'Delay 1',['history[m][0]']),b(685,70,220,100,'Delay 2',['history[m][1]']),
        b(25,260,220,95,'× fir[0]'),b(355,260,220,95,'× fir[1]'),b(685,260,220,95,'× fir[2]'),
        b(355,440,220,95,'Sum products'),b(985,440,220,95,'Round + saturate',['PCM_W = 16'])],
      wires:[e('M245 120H355'),e('M575 120H685'),e('M135 170V260'),e('M465 170V260'),e('M795 170V260'),
        e('M135 355V480H355'),e('M465 355V440'),e('M795 355V488H575'),e('M575 510H985')]
    },
    serializer: {
      title:'PCM serializer',crumb:'u_serializer',parent:null,file:'lmca_pdm_decimator.sv',height:520,
      summary:'Hold one simultaneous PCM vector and send its microphone samples to the core one at a time.',
      caption:'data contains MICS × PCM_W bits, not a full time window. mic advances only when m_valid and m_ready are both high; the occupied flag clears after the last microphone.',
      boxes:[b(25,100,250,130,'Vector register',['data[MICS × PCM_W]','Capture on valid & ready']),b(440,100,260,130,'Microphone selector',['Select PCM_W bits','at microphone index']),
        b(885,100,290,130,'PCM sample output',['m_pcm · 16 bits','m_valid = occupied']),b(440,335,260,110,'Index + occupied',['Advance on accepted sample','Clear after last microphone'])],
      wires:[e('M275 165H440'),e('M700 165H885'),e('M570 335V230','mic',585,290,true),e('M1030 230V390H700','ready / valid',790,377,true)]
    },
    uart: {
      title:'UART map output',crumb:'u_uart',parent:null,file:'lmca_uart_map_tx.sv',height:510,
      summary:'The map packetizer converts power words into bytes. A separate byte transmitter shifts those bytes onto the TX pin.',
      caption:'The packetizer buffers one map word, not a complete frame. Its ready signal can pause map production. CLKS_PER_BIT controls the byte transmitter’s baud rate.',
      boxes:[b(25,90,260,130,'Map point input',['m_power · m_last','clipped / overrun flags']),b(465,90,300,130,'Map packetizer',['Header + power bytes + status','One map-word buffer'],'packetizer'),
        b(945,90,260,130,'UART byte transmitter',['u_tx · 8-N-1'],'uart-tx')],
      wires:[e('M285 150H465','power word',320,130),e('M765 150H945','8-bit bytes',802,130),e('M1075 220V320H615V220','byte_ready',755,345,true),
        e('M465 195H375V320H155V220','map_ready',160,345,true)]
    },
    packetizer: {
      title:'Map packetizer',crumb:'Map packetizer',parent:'uart',file:'lmca_uart_map_tx.sv',height:620,
      summary:'Build the frame header, send each stored power word least-significant byte first, then send the status byte.',
      caption:'Header: LMC, version, sequence number and point count (8 bytes). Then DIRECTIONS × ceil(MAP_W/8) power bytes and one status byte. Direction indices are implicit. The interface has TX only, no CRC.',
      boxes:[b(25,70,260,115,'One-word buffer',['word_buffer[MAP_W]','flags + last-tag check']),b(25,290,260,110,'Header / counters',['sequence · point count','header / word / byte index']),
        b(435,180,300,150,'Byte selection',['Header byte','Power-word byte','Final flags']),b(945,180,260,150,'UART byte transmitter',['Valid / ready per byte'],'uart-tx'),
        b(435,450,300,115,'Packet state',['WAIT_FIRST → HEADER → DATA','WAIT_WORD / FLAGS'])],
      wires:[e('M285 125H350V220H435'),e('M285 345H350V290H435'),e('M735 255H945'),e('M585 450V330','select',600,403,true),
        e('M1075 330V505H735','byte_ready',850,490,true)]
    },
    'uart-tx': {
      title:'UART byte transmitter',crumb:'u_tx',parent:'uart',file:'lmca_uart_map_tx.sv',height:570,
      summary:'Load a start bit, eight data bits and a stop bit into a shift register, then advance one bit each baud interval.',
      caption:'8-N-1: start = 0, data least-significant bit first, stop = 1. baud = core clock / CLKS_PER_BIT. The default divisor is 50. busy prevents accepting another byte until the current one finishes.',
      boxes:[b(25,75,240,110,'Byte input',['s_data[7:0]','Accept when not busy']),b(465,75,290,110,'10-bit shift register',['Load {1, data[7:0], 0}','Shift right; fill with 1']),
        b(945,75,250,110,'TX output',['shift[0] while busy','Otherwise idle = 1']),b(25,330,240,115,'Baud counter',['ticks = CLKS_PER_BIT − 1','Count down each clock']),
        b(465,330,290,115,'Bit index + busy',['Advance when ticks = 0','Finish after bit index 9'])],
      wires:[e('M265 130H465'),e('M755 130H945'),e('M265 387H465','bit enable',310,370,true),e('M610 330V185','shift enable',625,260,true)]
    }
  });

  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href = id => `schematic.html?block=${encodeURIComponent(id)}`;
  const requested = new URLSearchParams(location.search).get('block') || 'core';
  const id = Object.hasOwn(scenes,requested) ? requested : 'core';
  const scene = scenes[id];
  document.title = `LMCA · ${scene.title}`;
  document.getElementById('title').textContent=scene.title;
  document.getElementById('scope').textContent=scene.file;
  document.getElementById('summary').textContent=scene.summary;
  document.getElementById('caption').textContent=scene.caption;
  document.getElementById('source').href=sourceRoot+scene.file;
  document.getElementById('up').href=scene.parent?href(scene.parent):'index.html#architecture';
  const ancestors=[];let parent=scene.parent;
  while(parent){ancestors.unshift(parent);parent=scenes[parent].parent;}
  document.getElementById('breadcrumbs').innerHTML='<a href="index.html#architecture">Architecture / top</a>'+ancestors.map(key=>`<span class="separator" aria-hidden="true">/</span><a href="${href(key)}">${escape(scenes[key].crumb)}</a>`).join('')+`<span class="separator" aria-hidden="true">/</span><span aria-current="page">${escape(scene.crumb)}</span>`;
  const box = item => {
    const titles=Array.isArray(item.title)?item.title:[item.title];
    const titleY=item.y+33;
    const title= titles.map((t,i)=>`<text class="node-title" x="${item.x+item.w/2}" y="${titleY+i*26}" text-anchor="middle">${escape(t)}</text>`).join('');
    const lines=item.lines.map((t,i)=>`<text class="node-detail" x="${item.x+item.w/2}" y="${titleY+titles.length*26+5+i*24}" text-anchor="middle">${escape(t)}</text>`).join('');
    const content=`<rect class="node-body" x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}" rx="8"/>${title}${lines}`;
    return item.to?`<a class="expandable" href="${href(item.to)}" aria-label="Open ${escape(Array.isArray(item.title)?item.title.join(' '):item.title)}" data-block="${item.to}"><title>Open ${escape(scenes[item.to].title)}</title>${content}</a>`:`<g class="primitive" data-kind="${item.kind}">${content}</g>`;
  };
  const wires=scene.wires.map(w=>`<path d="${w.path}" class="${w.control?'control':'wire'}"/>${w.label?`<text x="${w.x}" y="${w.y}" class="wire-label">${escape(w.label)}</text>`:''}`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 ${scene.height}" width="1240" height="${scene.height}" role="group" aria-labelledby="schematic-title schematic-description">
  <title id="schematic-title">${escape(scene.title)} internal structure</title><desc id="schematic-description">${escape(scene.summary)}</desc>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#527d80"/></marker><marker id="control-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#9276ac"/></marker></defs>
  <style>text{font-family:'Segoe UI',Arial,sans-serif;fill:#162b35}.node-title{font-size:21px;font-weight:650}.node-detail{font-size:17px;fill:#536873}.node-body{fill:#fbfdfc;stroke:#98a7af;stroke-width:1.4}.expandable .node-body{fill:#f5fbf9;stroke:#006e72;stroke-width:3}.expandable:hover .node-body,.expandable:focus .node-body{fill:#dff1ec;stroke:#004b50;stroke-width:4}.expandable:focus{outline:none}.wire{stroke:#527d80;stroke-width:2;fill:none;marker-end:url(#arrow)}.control{stroke:#9276ac;stroke-width:1.7;stroke-dasharray:6 4;fill:none;marker-end:url(#control-arrow)}.wire-label{font-size:16px;fill:#536873}</style>
  ${wires}${scene.boxes.map(box).join('')}</svg>`;
  document.getElementById('drawing').innerHTML=svg;
})();
