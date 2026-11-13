"""True float64 FFT/DAS reference plus a shared-PCM16 input diagnostic."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['PYTHONDONTWRITEBYTECODE']='1'
import copy,hashlib,json,sys,time
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;BASE=HERE.parent/'candidate-benchmark'
sys.path.insert(0,str(BASE))
import run_benchmark as b
from exploration.precision import Precision
from exploration.runner import algorithm
baseline=json.loads((HERE.parent/'benchmark-reference/source-benchmark.json').read_text())
cfg=copy.deepcopy(json.loads((HERE.parent/'benchmark-reference/reference.json').read_text())['config'])
cfg['precision']['mode']='float'
NAME='reference_float64';CONTROL='reference_float64_pcm16'

class FloatFFT:
    def __init__(self,config,pcm16=False):
        self.c=config;self.m=30;self.n=512;self.pcm16=pcm16
        self.mics=b.GEOS[30];self.directions=next(iter(b.models.values())).directions
        self.frequencies=np.fft.rfftfreq(self.n,1/config['sample_rate_hz'])
        self.bins=np.flatnonzero((self.frequencies>=20000)&(self.frequencies<=40000))
        self.window=np.sqrt(.5-.5*np.cos(2*np.pi*np.arange(self.n)/self.n))
        self.delays=-(b.unit_vectors(self.directions)@self.mics.T)/343.
        self.steering=np.exp(2j*np.pi*self.delays[:,:,None]*self.frequencies[self.bins])
    def run(self,samples):
        x=np.asarray(samples[:,:self.n],dtype=np.float64)
        clips=0
        if self.pcm16:
            raw=np.rint(x*32768);quantized=np.clip(raw,-32768,32767)
            clips=int(np.count_nonzero(raw!=quantized));x=quantized/32768
        fft=np.fft.rfft(x*self.window,axis=1)/self.n
        assert fft.dtype==np.complex128
        summed=np.einsum('dmk,mk->dk',self.steering,fft[:,self.bins],optimize=False)/self.m
        power=(abs(summed)**2).sum(axis=1)*2/np.mean(self.window**2)
        return power,clips

model=FloatFFT(cfg);control=FloatFFT(cfg,True)
assert len(model.bins)==53
# Independent agreement with the project's conventional float FD/DAS path.
precision_cfg=copy.deepcopy(cfg['precision']);precision_cfg['mode']='float'
trial_pcm=b.make_pcm(b.source(b.DIRECTIONS[0],7),seed=7)[30]
expected,details=algorithm('fd').configured_power_map(trial_pcm,cfg,model.mics,model.directions,Precision(precision_cfg))
actual,_=model.run(trial_pcm)
assert np.allclose(actual,expected,rtol=2e-12,atol=1e-18)
# FFT and explicit float DFT must agree at every retained bin.
direct=(trial_pcm*model.window)@np.exp(-2j*np.pi*np.arange(512)[:,None]*model.bins/512)/512
assert np.allclose(direct,np.fft.rfft(trial_pcm*model.window,axis=1)[:,model.bins]/512,rtol=2e-11,atol=1e-16)
b.source.cache_clear()
b.HERE=HERE;b.models={NAME:model,CONTROL:control};b.ROWS=[];b.DONE=set();b.SAVED={};b.CURVE_META={};b.INPUTS=hashlib.sha256();b.START=time.perf_counter()
b.run()
assert len(b.ROWS)==5580 and b.INPUTS.hexdigest()==baseline['input_digest_sha256']
assert not sum(r['clipped'] for r in b.ROWS)
series=[];scores={}
for name in [NAME,CONTROL]:
    for key,meta in b.CURVE_META.items():
        if meta['axis']=='controls':continue
        subset=[r for r in b.ROWS if r['variant']==name and r['axis']==meta['axis'] and r['family']==meta['family']]
        points=[]
        for x in sorted(set(r['x'] for r in subset)):
            rows=[r for r in subset if r['x']==x];errors=[r['error_deg'] for r in rows if r['error_deg'] is not None and r['targets']==1];margins=[r['margin_db'] for r in rows if r['margin_db'] is not None]
            points.append(dict(x=x,n=len(rows),clear=sum(r['clear'] for r in rows),pointing=sum(r['pointing'] for r in rows),zeros=sum(r['zero'] for r in rows),clipped=sum(r['clipped'] for r in rows),p95_error_deg=float(np.percentile(errors,95)) if errors else None,median_margin_db=float(np.median(margins)) if margins else None,median_peak_power=float(np.median([r['peak_power'] for r in rows]))))
        series.append(dict(key=key,variant=name,points=points))
    scores[name]={}
    for axis in baseline['axes']:
        families=[s for s in series if s['variant']==name and s['key'].startswith(axis['id']+'/')]
        scores[name][axis['id']]=float(np.mean([sum(p['clear'] for p in f['points'])/sum(p['n'] for p in f['points']) for f in families])*100)
null=json.loads((HERE/'null-controls.json').read_text())
ref_rows=[r for r in b.ROWS if r['variant']==NAME]
diagnostics={}
for name in [NAME,CONTROL]:
    r=[r for r in b.ROWS if r['variant']==name]
    freq=[x for x in r if x['axis']=='frequency']
    diagnostics[name]=dict(overall=float(np.mean(list(scores[name].values()))),frequency=dict(tested=len(freq),correctly_located=sum(x['pointing'] for x in freq),clear=sum(x['clear'] for x in freq)),rear_families={family:float(np.mean([x['clear'] for x in r if x['axis']=='interference' and x['family']==family])*100) for family in ['broadband','tone_28p875','tone_30']})
variant=dict(id=NAME,label='Float64 FFT reference',reference=True,numeric_precision='float64',microphones=30,window_samples=512,bins=53,accumulator_width=None,accumulator_fraction=None,gate_count=None,gate_count_measured=False,observation_ms=512/192000*1000,bin_frequencies_hz=model.frequencies[model.bins].tolist())
result=dict(variant=variant,scores=scores[NAME],series=[s for s in series if s['variant']==NAME],overall=diagnostics[NAME]['overall'],evaluation_count=2790,null_evaluation_count=60,null_nonzero=sum(not r['zero'] for r in null if r['variant']==NAME),config=cfg,
            definition='Float64 samples, full real FFT/complex128, analytic float window and steering, all 53 in-band bins, one N512 window, no input PCM16 rounding or fixed-point truncation. Conventional equal-weight frequency-domain delay-and-sum; no adaptive interference rejection.',
            diagnostics=diagnostics,matched_pcm16_control_scores=scores[CONTROL],
            validation=dict(input_digest_matches_original=True,input_digest_sha256=b.INPUTS.hexdigest(),float_fft_matches_explicit_dft=True,float_reference_matches_existing_fd_implementation=True,clipped_values=0,matched_cases_per_series=2790,reference_maps=2790,pcm16_diagnostic_maps=2790,script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),base_script_sha256=hashlib.sha256((BASE/'run_benchmark.py').read_bytes()).hexdigest()))
(HERE/'reference.json').write_text(json.dumps(result,indent=2,allow_nan=False))
(HERE/'primary-measurements.json').write_text(json.dumps(ref_rows,separators=(',',':')))
(HERE/'primary-null-controls.json').write_text(json.dumps([r for r in null if r['variant']==NAME],indent=2))
print(json.dumps(dict(scores=scores,diagnostics=diagnostics,seconds=time.perf_counter()-b.START),indent=2),flush=True)
