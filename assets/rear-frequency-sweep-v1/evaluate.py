"""Frequency-balanced rear-tone sweep; four original integer models + float FFT."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['PYTHONDONTWRITEBYTECODE']='1'
import concurrent.futures,hashlib,json,sys,time
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;BASE=HERE.parent/'candidate-benchmark'
sys.path.insert(0,str(BASE))
import run_benchmark as b
DATA=json.loads((HERE/'source-benchmark.json').read_text())
NAMES=[v['id'] for v in DATA['variants']]
FREQS=np.arange(20000.,40000.1,125.)
SIRS=list(range(-20,21,5));SEEDS=[7,23,91];DIRS=b.DIRECTIONS[:2]

class FloatFFT:
    def __init__(self):
        self.m=30;self.n=512;self.mics=b.GEOS[30];self.directions=next(iter(b.models.values())).directions
        self.freqs=np.fft.rfftfreq(512,1/192000.)
        self.bins=np.flatnonzero((self.freqs>=20000)&(self.freqs<=40000))
        self.window=np.sqrt(.5-.5*np.cos(2*np.pi*np.arange(512)/512))
        delays=-(b.unit_vectors(self.directions)@self.mics.T)/343.
        self.steering=np.exp(2j*np.pi*delays[:,:,None]*self.freqs[self.bins])
    def run(self,pcm):
        spec=np.fft.rfft(pcm*self.window,axis=1)/512
        summed=np.einsum('dmk,mk->dk',self.steering,spec[:,self.bins],optimize=False)/30
        return (abs(summed)**2).sum(axis=1)*2/np.mean(self.window**2),0

def run_variant(name):
    start=time.perf_counter()
    model=FloatFFT() if name=='reference_float64' else b.models[name]
    expected_source={k.replace('\\','/'):v for k,v in DATA['source_sha256'].items()}
    for file in ['exploration/compact_pcm.py','exploration/evaluate_suite.py','exploration/config.py','common/geometry.py','rtl/full_pipeline/scripts/model.py']:
        assert hashlib.sha256((b.ROOT/file).read_bytes()).hexdigest()==expected_source[file]
    # Previously published outcomes are exact anchors at both earlier tone frequencies.
    prior_path=HERE.parent/('benchmark-float-reference/primary-measurements.json' if name=='reference_float64' else 'candidate-benchmark/measurements.json')
    prior=json.loads(prior_path.read_text())
    anchors={(r['family'],r['x'],r['seed'],r['context']):r for r in prior if r['variant']==name and r['axis']=='interference' and r['family'] in ['tone_28p875','tone_30']}
    assert len(anchors)==108
    targets={(direction,seed):b.source(direction,seed)[model.m] for direction in DIRS for seed in SEEDS}
    noise={seed:b.background(seed)[model.m]*10**(-46/20) for seed in SEEDS}
    pos=np.array([.15,0.,-.30]);distance=float(np.linalg.norm(pos));rear=(float(np.degrees(np.arctan2(pos[0],pos[2]))),0.)
    rows=[];digest=hashlib.sha256();checked=0
    for number,hz in enumerate(FREQS):
        rear_signals={seed:b.source(rear,seed+2741,tone=float(hz),distance=distance)[model.m] for seed in SEEDS}
        for sir in SIRS:
            for direction in DIRS:
                for seed in SEEDS:
                    # Preserve the original evaluation's floating-point operation order.
                    pcm=(targets[direction,seed]+rear_signals[seed]*10**(-sir/20))*10**(-36/20)+noise[seed]
                    digest.update(pcm.tobytes())
                    offset=(512-model.n)//2
                    power,clipped=model.run(pcm[:,offset:offset+model.n]);assert clipped==0
                    measured=b.measure(power,[direction])
                    if hz in [28875.,30000.]:
                        old=anchors[('tone_28p875' if hz==28875 else 'tone_30',float(sir),seed,str(direction))]
                        assert measured['clear']==old['clear'] and measured['pointing']==old['pointing']
                        if name=='reference_float64':assert np.isclose(measured['peak_power'],old['peak_power'],rtol=2e-13,atol=1e-18)
                        else:assert measured['peak_power']==old['peak_power']
                        checked+=1
                    rows.append(dict(axis='interference',family='tone_frequency',x=float(hz/1000),seed=seed,context=f'SIR {sir} dB / {direction}',variant=name,clipped=clipped,**measured,interferer_hz=float(hz),sir_db=float(sir)))
        if number%20==0:
            (HERE/(name+'-progress.json')).write_text(json.dumps(dict(frequencies_complete=number+1,total_frequencies=161,maps=len(rows),seconds=time.perf_counter()-start)))
    assert len(rows)==8694 and checked==108
    (HERE/(name+'-measurements.json')).write_text(json.dumps(rows,separators=(',',':')))
    validation=dict(variant=name,maps=len(rows),earlier_anchor_checks=checked,clipped_values=0,full_window_input_sha256=digest.hexdigest(),microphones=model.m,seconds=time.perf_counter()-start)
    (HERE/(name+'-validation.json')).write_text(json.dumps(validation,indent=2))
    return validation

def point(rows,x):
    errors=[r['error_deg'] for r in rows if r['error_deg'] is not None];margins=[r['margin_db'] for r in rows if r['margin_db'] is not None]
    return dict(x=float(x),n=len(rows),clear=sum(r['clear'] for r in rows),pointing=sum(r['pointing'] for r in rows),zeros=sum(r['zero'] for r in rows),clipped=sum(r['clipped'] for r in rows),p95_error_deg=float(np.percentile(errors,95)) if errors else None,median_margin_db=float(np.median(margins)) if margins else None,median_peak_power=float(np.median([r['peak_power'] for r in rows])))

def finish(results):
    same30=[r['full_window_input_sha256'] for r in results if r['microphones']==30]
    assert len(set(same30))==1,'30-microphone models received different recordings'
    series=[];scores={};all_rows=[]
    for name in NAMES:
        rows=json.loads((HERE/(name+'-measurements.json')).read_text());all_rows+=rows
        series.append(dict(key='interference/tone_frequency',variant=name,points=[point([r for r in rows if r['interferer_hz']==hz],hz/1000) for hz in FREQS]))
        series.append(dict(key='interference/tone_sir',variant=name,points=[point([r for r in rows if r['sir_db']==sir],sir) for sir in SIRS]))
        tonal=float(np.mean([r['clear'] for r in rows])*100)
        broadband=next(s for s in DATA['series'] if s['variant']==name and s['key']=='interference/broadband')
        wide=100*sum(p['clear'] for p in broadband['points'])/sum(p['n'] for p in broadband['points'])
        rear=(tonal+wide)/2
        overall=sum(rear if a['id']=='interference' else DATA['scores'][name][a['id']] for a in DATA['axes'])/8
        scores[name]=dict(tonal_frequency_sweep=tonal,broadband_check=wide,rear=rear,overall=overall,previous_rear=DATA['scores'][name]['interference'],previous_overall=DATA['overall_scores'][name])
    assert len(all_rows)==43470
    metadata=dict(
        tone_frequency=dict(axis='interference',family='tone_frequency',title='Tonal interference · frequency sweep',xlabel='Rear interferer frequency (kHz)',score_contribution=True,
          description='Rear tone swept from 20–40 kHz in 125 Hz steps. Each point averages nine target/interferer levels (−20 to +20 dB), two target directions and three seeds: 54 cases per frequency. Target is 20–40 kHz broadband at −36 dBFS RMS; independent noise −46 dBFS. Rear source [0.15, 0, −0.30] m; other conditions fixed.'),
        tone_sir=dict(axis='interference',family='tone_sir',title='Tonal interference · strength sweep',xlabel='Target / interferer RMS (dB)',score_contribution=False,projection_of='interference/tone_frequency',
          description='The same swept-tone cases regrouped by strength. Each point averages all 161 interferer frequencies, two target directions and three seeds. This is a second view of the same tests, not an extra contribution to the score.'),
        broadband=dict(DATA['curves']['interference/broadband'],score_contribution=True))
    output=dict(version=1,frequencies_hz=FREQS.tolist(),sir_levels_db=SIRS,seeds=SEEDS,target_directions=DIRS,maps=len(all_rows),maps_per_variant=8694,series=series,scores=scores,curves=metadata,
                scoring='Rear-interference score: 50% existing broadband check + 50% uniformly frequency-weighted tonal sweep. The strength projection is not counted again. Other seven radar categories unchanged.',
                validation=dict(variants=results,earlier_anchor_checks=sum(r['earlier_anchor_checks'] for r in results),same_pcm_for_all_30_mic_variants=True,clipped_values=0,source_benchmark_sha256=hashlib.sha256((HERE/'source-benchmark.json').read_bytes()).hexdigest(),script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()))
    (HERE/'sweep.json').write_text(json.dumps(output,indent=2,allow_nan=False))
    (HERE/'measurements.json').write_text(json.dumps(all_rows,separators=(',',':')))
    print(json.dumps(dict(scores=scores,maps=len(all_rows),anchors=output['validation']['earlier_anchor_checks']),indent=2),flush=True)

if __name__=='__main__':
    results=[]
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(run_variant,name):name for name in NAMES}
        for future in concurrent.futures.as_completed(futures):
            result=future.result();results.append(result);print('Completed',result['variant'],round(result['seconds'],1),'s',flush=True)
    finish(results)
