"""Deterministic, one-factor synthetic characterization of four budget candidates.

Run from the workspace. Uses the existing PCM integer oracle without editing it.
No operational discharge detector, SPL calibration, PDM or flight recording model.
"""
import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
import copy, hashlib, json, sys, time
from functools import lru_cache
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get('LMCA_ALGORITHM_ROOT', r'C:/Users/lucas/Obsidian/Workspace0/projects/lmca_acoustic_camera/references/lmco-acoustic-camera-algorithm'))
sys.path.insert(0, str(ROOT))
from exploration.compact_pcm import CompactPCM
from exploration.evaluate_suite import unit_vectors, score_map

OLD = ROOT/'results/hardware_cost/fft_comparison'
if (HERE/'configurations.json').exists():
    configs = json.loads((HERE/'configurations.json').read_text())
else:
    configs = json.loads((OLD/'configurations.json').read_text())
    configs.update(json.loads((HERE.parent/'promising-dft-candidates/new-configurations.json').read_text())['configs'])
NAMES = ['dft30_n256_k10_w24', 'dft30_10', 'dft24_n512_k15_w24', 'dft16_24']
FRACTIONS = [15, 16, 14, 16]
GATES = [268455.75, 281097.75, 295013.5, 287823.25]
models = {n: CompactPCM(configs[n], f) for n, f in zip(NAMES, FRACTIONS)}
GEOS = {m.m: m.mics for m in models.values()}
FS = 192000
T = (np.arange(512)-256)/FS
SEEDS = [7, 23, 91]
DIRECTIONS = [(-12., 6.), (13.4, -7.1), (27.4, 23.2)]
BANDS = [(20000., 40000.), (25000., 30000.), (35000., 40000.)]
INPUTS = hashlib.sha256()
ROWS = []
DONE = set()
SAVED = {}
CURVE_META = {}
U = unit_vectors(next(iter(models.values())).directions)
assert all(np.array_equal(m.directions, next(iter(models.values())).directions) for m in models.values())

def rms(x): return float(np.sqrt(np.mean(x*x)))

@lru_cache(maxsize=64)
def source(direction, seed, band=(20000., 40000.), tone=None, pulse_us=None,
           speed=343., distance=None):
    """Same continuous source and level across native layouts; no wraparound."""
    rng = np.random.default_rng(seed)
    frequencies = np.array([tone]) if tone is not None else np.arange(band[0], band[1]+1, 125.)
    phases = rng.uniform(0, 2*np.pi, len(frequencies))
    uv = unit_vectors([direction])[0]
    result = {}
    for count, geo in GEOS.items():
        if distance is None:
            delay = geo@uv/speed
            gain = 1.
        else:
            dist = np.linalg.norm(uv*distance-geo, axis=1)
            delay = (distance-dist)/speed
            gain = (distance/dist)[:, None]
        local_time = T[None, :] + delay[:, None]
        signal = np.sin(2*np.pi*local_time[:, :, None]*frequencies+phases).sum(axis=2)*gain
        if pulse_us is not None:
            sigma = pulse_us*1e-6/(2*np.sqrt(2*np.log(2)))
            signal *= np.exp(-.5*(local_time/sigma)**2)
        result[count] = signal
    # Normalization uses ONE reference layout, never each candidate separately.
    scale = np.max(abs(result[30])) if pulse_us is not None else rms(result[30])
    return {m: x/scale for m, x in result.items()}

def background(seed):
    return {m: np.random.default_rng(seed+100000*m).normal(size=(m, 512)) for m in GEOS}

def make_pcm(src, level=-36., noise=-46., seed=7):
    bg = background(seed)
    return {m: x*10**(level/20)+(bg[m]*10**(noise/20) if noise is not None else 0) for m, x in src.items()}

def measure(power, truths):
    peak = float(power.max())
    truth_u = unit_vectors(truths)
    errors = np.degrees(np.arccos(np.clip(U@truth_u.T, -1, 1)))
    error = float(errors[int(np.argmax(power)), 0]) if peak else None
    outside = (errors > 9.).all(axis=1)
    wrong = float(power[outside].max()) if outside.any() else 0.
    if len(truths) == 1:
        target = float(power[errors[:, 0] <= 3.].max())
        found = bool(peak > 0 and error <= 3.)
        matched = int(found)
    else:
        score = score_map(power, next(iter(models.values())).directions,
                          [dict(azimuth_deg=a, elevation_deg=e) for a, e in truths],
                          tolerance_deg=3., display_floor_db=-12)
        matched = score['matched_sources']
        found = matched == len(truths)
        target = min(float(power[errors[:, i] <= 3.].max()) for i in range(len(truths)))
    margin = 10*np.log10(target/wrong) if target > 0 and wrong > 0 else (120. if target > 0 else None)
    clear = bool(found and margin is not None and margin >= 3.)
    return dict(pointing=found, clear=clear, matched=matched, targets=len(truths),
                error_deg=error, margin_db=float(margin) if margin is not None else None,
                peak_power=peak, target_power=target, wrong_power=wrong, zero=peak == 0)

def trial(axis, family, x, pcm, truths, seed, context, save=False):
    key=f'{axis}/{family}'
    assert key in CURVE_META
    case_id=f'{key}/{x}/{seed}/{context}'
    for m in sorted(pcm): INPUTS.update(pcm[m].tobytes())
    if (axis,family,float(x),seed,context) in DONE:
        return
    for name, model in models.items():
        start=(512-model.n)//2
        power, clips = model.run(pcm[model.m][:, start:start+model.n])
        score=measure(power, truths)
        ROWS.append(dict(axis=axis, family=family, x=float(x), seed=seed, context=context,
                         variant=name, clipped=clips, **score))
        if save: SAVED[case_id.replace('/', '__')+'__'+name]=power

def curve(axis, family, title, xlabel, description):
    CURVE_META[f'{axis}/{family}']=dict(axis=axis, family=family, title=title,
                                      xlabel=xlabel, description=description)

def checkpoint(axis):
    (HERE/'measurements.json').write_text(json.dumps(ROWS, separators=(',', ':')))
    print(axis, 'complete;', len(ROWS), 'maps;', round(time.perf_counter()-START, 1), 's', flush=True)

def run():
    curve('frequency', 'tones', 'Frequency coverage', 'Tone frequency (kHz)',
          '20–40 kHz in 125 Hz steps; target −36 dBFS RMS; +10 dB input SNR; three directions × three seeds. More than six samples per N256 bin spacing; never just selected-bin centers.')
    for hz in np.arange(20000., 40000.1, 125.):
        for direction in DIRECTIONS:
            for seed in SEEDS:
                pcm=make_pcm(source(direction, seed, tone=hz), seed=seed)
                trial('frequency', 'tones', hz/1000, pcm, [direction], seed, str(direction), save=(hz in [28875, 30000] and direction==DIRECTIONS[0] and seed==7))
    checkpoint('frequency')

    curve('level', 'quiet', 'Weak-signal level', 'Source RMS (dBFS)',
          '−100 to −20 dBFS RMS in 5 dB steps, no added noise: isolates PCM quantization and integer-map extinction, not microphone sensitivity. Three bands × two directions × three seeds.')
    for level in range(-100, -19, 5):
        for band in BANDS:
            for direction in DIRECTIONS[:2]:
                for seed in SEEDS:
                    pcm=make_pcm(source(direction, seed, band), level=level, noise=None, seed=seed)
                    trial('level', 'quiet', level, pcm, [direction], seed, f'{band}/{direction}')
    checkpoint('level')

    curve('noise', 'snr', 'Background noise', 'Nominal input signal / noise (dB)',
          '−30 to +20 dB SNR in 5 dB steps. Source −46 dBFS RMS, avoiding ADC overload at the highest noise level; independent, full-PCM-band white channel noise. SNR is nominal, before bin selection; three source bands × two directions × three seeds.')
    for snr in range(-30, 21, 5):
        for band in BANDS:
            for direction in DIRECTIONS[:2]:
                for seed in SEEDS:
                    pcm=make_pcm(source(direction, seed, band), level=-46., noise=-46-snr, seed=seed)
                    trial('noise', 'snr', snr, pcm, [direction], seed, f'{band}/{direction}')
    checkpoint('noise')

    for family in ['azimuth', 'elevation']:
        curve('fov', family, 'Field of view · '+family, family.capitalize()+' (°)',
              '−29.5° to +29.5°; other angle 0.7°, avoiding only on-grid tests. Target −36 dBFS RMS, +10 dB SNR; three bands × three seeds.')
        for angle in [-29.5,-27.,-24.,-18.,-12.,-6.,0.,6.,12.,18.,24.,27.,29.5]:
            direction=(angle,.7) if family=='azimuth' else (.7,angle)
            for band in BANDS:
                for seed in SEEDS:
                    pcm=make_pcm(source(direction, seed, band), seed=seed)
                    trial('fov', family, angle, pcm, [direction], seed, str(band))
    checkpoint('fov')

    for family, values in [('separation',[3.,4.5,6.,9.,12.,18.,24.]), ('imbalance',[0.,3.,6.,9.,12.,15.,18.])]:
        curve('multiple', family, 'Two sources · '+family, 'Separation (°)' if family=='separation' else 'Second source weaker by (dB)',
              'Two independent broadband sources, centered near boresight; stronger source −36 dBFS RMS and noise −46 dBFS. Separation varies at equal strength; imbalance varies at fixed 12° separation. Distinct local peaks must each match within 3° and lie above −12 dB. Three bands × three seeds.')
        for x in values:
            separation=x if family=='separation' else 12.
            gap=0. if family=='separation' else x
            truths=[(-separation/2,.7),(separation/2,.7)]
            for band in BANDS:
                for seed in SEEDS:
                    a=source(truths[0],seed,band);b=source(truths[1],seed+947,band)
                    combined={m:a[m]+b[m]*10**(-gap/20) for m in GEOS}
                    pcm=make_pcm(combined, seed=seed)
                    trial('multiple', family, x, pcm, truths, seed, str(band))
    checkpoint('multiple')

    curve('pulse', 'width', 'Short pulses', 'Envelope width FWHM (µs)',
          '50, 100, 200, 400, 800 and 1,600 µs Gaussian-envelope synthetic 20–40 kHz bursts, centered in BOTH observation windows. Peak levels −30/−50/−65 dBFS at the 30-mic reference array; independent noise −70 dBFS. Two directions × three seeds. This tests captured bursts, not the probability that a sparse snapshot catches an event.')
    for width in [50.,100.,200.,400.,800.,1600.]:
        for level in [-30.,-50.,-65.]:
            for direction in DIRECTIONS[:2]:
                for seed in SEEDS:
                    pcm=make_pcm(source(direction,seed,pulse_us=width),level=level,noise=-70.,seed=seed)
                    trial('pulse','width',width,pcm,[direction],seed,f'{level}/{direction}')
    checkpoint('pulse')

    for family,tone in [('broadband',None),('tone_28p875',28875.),('tone_30',30000.)]:
        curve('interference',family,'Rear interference · '+('20–40 kHz' if tone is None else f'{tone/1000:g} kHz'), 'Target / interferer RMS (dB)',
              'Synthetic coherent point interferer at [0.15, 0, −0.30] m, behind the array, with spherical delays and 1/r level differences. Target −36 dBFS RMS, noise −46 dBFS. Interferer level is referenced to RMS on the native 30-mic array. This is an in-band drone interference stress proxy, not recorded propeller noise. Two target directions × three seeds.')
        pos=np.array([.15,0.,-.30]);dist=float(np.linalg.norm(pos))
        # unit_vectors uses az in x/z plane and elevation from that plane.
        rear=(float(np.degrees(np.arctan2(pos[0],pos[2]))),0.)
        for sir in range(-20,21,5):
            for direction in DIRECTIONS[:2]:
                for seed in SEEDS:
                    a=source(direction,seed);b=source(rear,seed+2741,tone=tone,distance=dist)
                    combined={m:a[m]+b[m]*10**(-sir/20) for m in GEOS}
                    pcm=make_pcm(combined,seed=seed)
                    trial('interference',family,sir,pcm,[direction],seed,str(direction))
    checkpoint('interference')

    mismatch=[('temperature',[-10.,0.,10.,20.,30.,40.],'Air temperature (°C)'),
              ('gain',[0.,.5,1.,2.,3.],'Channel gain error σ (dB)'),
              ('delay',[0.,.25,.5,1.,2.],'Channel timing error σ (µs)'),
              ('range',[.5,1.,2.,5.,10.,20.,35.],'Source distance (m)')]
    for family,values,xlabel in mismatch:
        curve('mismatch',family,'Model mismatch · '+family,xlabel,
              'One factor at a time: temperature −10…40°C (c = 331.3 + 0.606T), channel gain σ 0…3 dB, channel delay σ 0…2 µs, or range 0.5…35 m. Fixed steering uses 343 m/s and far-field focus. Source −36 dBFS RMS and +10 dB SNR; three bands × three seeds, target (13.4°, −7.1°). Range holds received RMS constant to isolate wavefront curvature: it is NOT a detection-range prediction.')
        for x in values:
            for band in BANDS:
                for seed in SEEDS:
                    direction=DIRECTIONS[1]
                    src=source(direction,seed,band,speed=331.3+.606*x if family=='temperature' else 343., distance=x if family=='range' else None)
                    if family=='delay':
                        # Exact continuous carrier phase offsets, not a circular shift of finite PCM.
                        rng=np.random.default_rng(seed);frequencies=np.arange(band[0],band[1]+1,125.);phases=rng.uniform(0,2*np.pi,len(frequencies));unit=unit_vectors([direction])[0]
                        modified={}
                        for m,geo in GEOS.items():
                            offsets=np.random.default_rng(seed+10000*m).normal(0,x*1e-6,m)
                            local=T[None,:]+(geo@unit/343.+offsets)[:,None]
                            modified[m]=np.sin(2*np.pi*local[:,:,None]*frequencies+phases).sum(axis=2)
                        # Match nominal source normalization, not the perturbed array output.
                        nominal=source(direction,seed,band)
                        scale=rms(np.sin(2*np.pi*(T[None,:,None]+(GEOS[30]@unit/343.)[:,None,None])*frequencies+phases).sum(axis=2))
                        src={m:s/scale for m,s in modified.items()}
                    if family=='gain':
                        src={m:s*10**(np.random.default_rng(seed+10000*m).normal(0,x,m)[:,None]/20) for m,s in src.items()}
                    pcm=make_pcm(src,seed=seed)
                    trial('mismatch',family,x,pcm,[direction],seed,str(band))
    checkpoint('mismatch')

    # Null maps are diagnostics only. A display-normalized map has no absent-target state.
    curve('controls','noise_only','Noise-only control','Noise RMS (dBFS)',
          'Noise-only maps at −70/−46/−26 dBFS, 20 independent seeds. No localization score or radar contribution. Without a detector threshold, any nonzero map still has a strongest pixel.')
    null=[]
    for level in [-70.,-46.,-26.]:
        for seed in range(200,220):
            for name,model in models.items():
                raw=background(seed)[model.m]*10**(level/20)
                start=(512-model.n)//2;power,clips=model.run(raw[:,start:start+model.n])
                null.append(dict(variant=name,noise_dbfs=level,seed=seed,peak_power=float(power.max()),zero=not power.max(),clipped=clips))
    (HERE/'null-controls.json').write_text(json.dumps(null,indent=2))

def finish():
    axes=['frequency','level','noise','fov','multiple','pulse','interference','mismatch']
    labels=['Frequency coverage','Weak-signal level','Background noise','Field of view','Two sources','Short pulses','Rear interference','Model mismatch']
    aggregate=[]
    for key,meta in CURVE_META.items():
        if meta['axis']=='controls':continue
        for name in NAMES:
            subset=[r for r in ROWS if r['variant']==name and r['axis']==meta['axis'] and r['family']==meta['family']]
            points=[]
            for x in sorted(set(r['x'] for r in subset)):
                items=[r for r in subset if r['x']==x]
                errors=[r['error_deg'] for r in items if r['error_deg'] is not None and r['targets']==1]
                margins=[r['margin_db'] for r in items if r['margin_db'] is not None]
                points.append(dict(x=x,n=len(items),clear=sum(r['clear'] for r in items),pointing=sum(r['pointing'] for r in items),zeros=sum(r['zero'] for r in items),clipped=sum(r['clipped'] for r in items),
                                   p95_error_deg=float(np.percentile(errors,95)) if errors else None,
                                   median_margin_db=float(np.median(margins)) if margins else None,
                                   median_peak_power=float(np.median([r['peak_power'] for r in items]))))
            aggregate.append(dict(key=key,variant=name,points=points))
    scores={}
    for name in NAMES:
        scores[name]={}
        for axis in axes:
            families=[a for a in aggregate if a['variant']==name and a['key'].startswith(axis+'/')]
            # Families have equal weight; samples within each family have equal weight.
            value=float(np.mean([sum(p['clear'] for p in f['points'])/sum(p['n'] for p in f['points']) for f in families])*100)
            scores[name][axis]=value
    variants=[dict(id=name,label=f'{m.m} / {m.n} / {len(m.bins)} / {m.width}',microphones=m.m,window_samples=m.n,bins=len(m.bins),accumulator_width=m.width,accumulator_fraction=m.frac,gate_count=gate,gate_count_measured=True,observation_ms=m.n/FS*1000,bin_frequencies_hz=(m.bins*FS/m.n).tolist()) for (name,m),gate in zip(models.items(),GATES)]
    source_files=[ROOT/'exploration/compact_pcm.py', ROOT/'exploration/evaluate_suite.py',ROOT/'exploration/config.py',ROOT/'common/geometry.py',ROOT/'rtl/full_pipeline/scripts/model.py',Path(__file__)]
    hashes={str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files}
    result=dict(version=1,variants=variants,axes=[dict(id=a,label=l) for a,l in zip(axes,labels)],curves=CURVE_META,series=aggregate,scores=scores,
                evaluation_count=len(ROWS),null_evaluation_count=240,seeds=SEEDS,pass_rule='Nonzero map, strongest pixel within 3° of the source (or two distinct matched peaks within 3° and above −12 dB for a pair), and weakest target neighborhood at least 3 dB above the strongest pixel more than 9° from every true source. No operational detector is implied.',
                input_digest_sha256=INPUTS.hexdigest(),source_sha256=hashes,clipped_values=sum(r['clipped'] for r in ROWS),
                score_weighting='Per-axis mean of family pass fractions. Equal family weights; no overall score or weighting by deployment probability.',
                assumptions=dict(sample_rate_hz=FS,aperture_m=.2,layout='native spiral per microphone count',scan_deg=[-30,30],grid_step_deg=3,window='sqrt_hann',normalization='Common 512-sample scene, centered candidate windows. Steady-source RMS and pulse peak referenced to the 30-mic array, held fixed across arrays. No image normalization is used in scores.',baseline='Source −36 dBFS RMS, independent white channel noise −46 dBFS (+10 dB SNR), except where the tested condition explicitly changes them.'),
                limitations=['Synthetic PCM, not PDM or analogue microphone input; no flight data, microphone frequency response, weather absorption, reflections or ADC front-end overload beyond PCM saturation.',
                'Electrical discharge is represented by tones, independent multitone bands and Gaussian-envelope bursts; these are stress probes, not a validated PD waveform distribution.',
                'Radar percentages are coverage of deliberately chosen test ranges, not real-world detection probabilities or sensitivity in SPL.',
                'Steady and burst observation duration differs by candidate; centering bursts isolates captured-event quality. Capture scheduling, overlap and multiwindow accumulation are not simulated.',
                'Noise-only controls have no detection pass/fail because the RTL power map has no operational absent-target decision.',
                'Sweeps are one-factor families with a small set of fixed contexts. They do not cover the full joint space of simultaneous stressors or all deployment conditions.'])
    (HERE/'benchmark.json').write_text(json.dumps(result,indent=2,allow_nan=False))
    (HERE/'configurations.json').write_text(json.dumps({n:configs[n] for n in NAMES},indent=2))
    np.savez_compressed(HERE/'diagnostic-maps.npz',directions=next(iter(models.values())).directions,**SAVED)
    assert all(len([r for r in ROWS if r['variant']==n]) == len(ROWS)//4 for n in NAMES)
    assert all(np.isfinite(r['peak_power']) and r['peak_power']>=0 for r in ROWS)
    print(json.dumps(dict(scores=scores,evaluations=len(ROWS),clipped=result['clipped_values'],seconds=time.perf_counter()-START),indent=2),flush=True)

if __name__=='__main__':
    START=time.perf_counter()
    if '--resume' in sys.argv:
        ROWS.extend(json.loads((HERE/'measurements.json').read_text()))
        if '--redo-noise' in sys.argv:
            ROWS[:]=[r for r in ROWS if r['axis']!='noise']
        DONE.update((r['axis'],r['family'],r['x'],r['seed'],r['context']) for r in ROWS)
        if (HERE/'diagnostic-maps.npz').exists():
            with np.load(HERE/'diagnostic-maps.npz') as saved:
                SAVED.update({k:saved[k] for k in saved.files if k!='directions'})
    run()
    finish()
