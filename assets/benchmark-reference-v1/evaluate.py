"""Run only the one-window all-bin reference on the unchanged benchmark inputs."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
os.environ['PYTHONDONTWRITEBYTECODE']='1'
import hashlib,json,sys,time
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'candidate-benchmark'
sys.path.insert(0,str(BASE))
import run_benchmark as b
NAME='reference_all_bins'
baseline=json.loads((HERE/'source-benchmark.json').read_text())
source_hashes={k.replace('\\','/'):v for k,v in baseline['source_sha256'].items()}
assert b.NAMES==[v['id'] for v in baseline['variants']]
assert hashlib.sha256((BASE/'run_benchmark.py').read_bytes()).hexdigest()==baseline['source_sha256']['run_benchmark.py']
for file in ['exploration/compact_pcm.py','exploration/evaluate_suite.py','exploration/config.py','common/geometry.py','rtl/full_pipeline/scripts/model.py']:
    assert hashlib.sha256((b.ROOT/file).read_bytes()).hexdigest()==source_hashes[file],file
reference=json.loads((HERE.parent/'promising-dft-candidates/focus/configuration.json').read_text())['variants']['reference']['config']
model=b.CompactPCM(reference,16)
assert model.m==30 and model.n==512 and model.width==26 and len(model.bins)==53
assert np.array_equal(model.directions,next(iter(b.models.values())).directions)
assert np.array_equal(model.mics,b.GEOS[30])
b.HERE=HERE
b.models={NAME:model}
b.ROWS=[];b.DONE=set();b.SAVED={};b.CURVE_META={};b.INPUTS=hashlib.sha256();b.START=time.perf_counter()
b.run()
assert len(b.ROWS)==baseline['evaluation_count']//4==2790
assert b.INPUTS.hexdigest()==baseline['input_digest_sha256'],'Benchmark PCM inputs changed'
assert not sum(r['clipped'] for r in b.ROWS)
series=[];scores={}
for key,meta in b.CURVE_META.items():
    if meta['axis']=='controls':continue
    subset=[r for r in b.ROWS if r['axis']==meta['axis'] and r['family']==meta['family']]
    points=[]
    for x in sorted(set(r['x'] for r in subset)):
        rows=[r for r in subset if r['x']==x]
        errors=[r['error_deg'] for r in rows if r['error_deg'] is not None and r['targets']==1]
        margins=[r['margin_db'] for r in rows if r['margin_db'] is not None]
        points.append(dict(x=x,n=len(rows),clear=sum(r['clear'] for r in rows),pointing=sum(r['pointing'] for r in rows),zeros=sum(r['zero'] for r in rows),clipped=sum(r['clipped'] for r in rows),
                           p95_error_deg=float(np.percentile(errors,95)) if errors else None,median_margin_db=float(np.median(margins)) if margins else None,median_peak_power=float(np.median([r['peak_power'] for r in rows]))))
    series.append(dict(key=key,variant=NAME,points=points))
for axis in baseline['axes']:
    families=[s for s in series if s['key'].startswith(axis['id']+'/')]
    scores[axis['id']]=float(np.mean([sum(p['clear'] for p in f['points'])/sum(p['n'] for p in f['points']) for f in families])*100)

# Parity with the all-bin reference currently displayed in the mixed map sheet.
archived=np.load(HERE.parent/'representative-map-sheet/assets/representative-maps.npz')
anchors=[]
for scene in ['unequal6','independent10']:
    path=b.OLD/f'recording_{scene}_7.npz'
    with np.load(path) as record:power,clips=model.run(record['pcm'][60:90])
    assert clips==0 and np.array_equal(power,archived[scene+'__reference'])
    anchors.append(dict(scene=scene,bit_exact=True))
null=json.loads((HERE/'null-controls.json').read_text());assert len(null)==60 and not sum(r['clipped'] for r in null)
result=dict(variant=dict(id=NAME,label='All-bin software reference',reference=True,microphones=30,window_samples=512,bins=53,accumulator_width=26,accumulator_fraction=16,gate_count=None,gate_count_measured=False,observation_ms=512/192000*1000,bin_frequencies_hz=(model.bins*192000/model.n).tolist()),
            scores=scores,series=series,evaluation_count=len(b.ROWS),null_evaluation_count=len(null),null_nonzero=sum(not r['zero'] for r in null),
            overall=float(np.mean(list(scores.values()))),config=reference,
            validation=dict(input_digest_matches_original=True,input_digest_sha256=b.INPUTS.hexdigest(),scoring_and_source_code_hashes_match_original=True,clipped_values=0,matched_cases_per_candidate=2790,bit_exact_map_reference_anchors=anchors,
                            script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),base_script_sha256=hashlib.sha256((BASE/'run_benchmark.py').read_bytes()).hexdigest()))
(HERE/'reference.json').write_text(json.dumps(result,indent=2,allow_nan=False))
print(json.dumps(dict(scores=scores,overall=result['overall'],evaluations=len(b.ROWS),seconds=time.perf_counter()-b.START),indent=2),flush=True)
