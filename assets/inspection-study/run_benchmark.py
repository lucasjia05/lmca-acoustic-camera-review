"""Reproduce the six-spoke LMCA simulated inspection benchmark from DFT-DAS."""
import argparse
import csv
import hashlib
import json
import os
import sys
import tomllib
from pathlib import Path

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
import numpy as np
from scipy.ndimage import maximum_filter

RATE = 192000
N = 256
BASE_TIME = (np.arange(N) - (N - 1) / 2) / RATE
AXES = {
    "burst": "Weak bursts", "frequency": "Frequency coverage",
    "environment": "Environmental noise", "drone": "Drone interference",
    "field": "Field of view", "pair": "Two sources",
}
LABELS = {"balanced": "40 mics / 16 bins", "coverage": "30 mics / 22 bins",
          "control": "Earlier 30 mics / 10 bins", "reference": "30 mics / all 27 bins (float)"}
BACKGROUND = ["quiet", "ambient", "wind"]


def unit(angle):
    az, el = np.radians(angle)
    return np.array([np.sin(az)*np.cos(el), np.sin(el), np.cos(az)*np.cos(el)])


def db_amplitude(db):
    return 10.0 ** (db / 20)


def pressure(pos, angle, frequencies, phases, rms, center=None, width=None):
    time = BASE_TIME[:, None] + pos @ unit(angle) / 343.
    carrier = np.sin(2*np.pi*time[:, :, None]*frequencies + phases).sum(axis=2)
    value = rms * np.sqrt(2 / len(frequencies)) * carrier
    if center is not None:
        value *= np.exp(-.5*((time-center)/width)**2)
    return value


def make_scene(axis, i, seed, positions):
    """Each layout samples the same continuous source and background events."""
    rng = np.random.default_rng(seed)
    angle = tuple(rng.uniform(-18, 18, 2))
    frequencies = rng.uniform(20250, 39750, 8)
    phases = rng.uniform(0, 2*np.pi, len(frequencies))
    level, center, width = -40., None, None
    condition, strength = "quiet", -50.
    second, drone = None, False
    if axis == "burst":
        level = [-62., -54., -46., -38.][i % 4]
        center = rng.uniform(BASE_TIME[0], BASE_TIME[-1])
        width = [40, 75, 150][(i // 4) % 3] * 1e-6
    elif axis == "frequency":
        frequencies = np.array([20000 + 125*(i % 161)])
        phases = phases[:1]
    elif axis in ("environment", "null", "calibration"):
        condition = BACKGROUND[i % 3]
        strength = [-55., -47., -39.][(i // 3) % 3]
        level = -45.
        center, width = rng.uniform(-.00025,.00025), 110e-6
    elif axis == "drone":
        drone = True
    elif axis == "field":
        edge = rng.uniform(23.,29.7)
        xy = [edge, rng.uniform(-20.,20.)] if i % 3 == 0 else (
             [rng.uniform(-20.,20.), edge] if i % 3 == 1 else [edge, rng.uniform(23.,29.7)])
        angle = tuple(np.array(xy) * rng.choice([-1,1],2))
    elif axis == "pair":
        separation = [6.,12.,18.][i % 3]
        direction = np.radians(rng.uniform(0,360))
        offset = np.array([np.cos(direction),np.sin(direction)])*separation/2
        second = (tuple(np.array(angle)+offset), rng.uniform(20250,39750,8),
                  rng.uniform(0,2*np.pi,8),level-[0.,6.,12.][(i//3)%3])
        angle = tuple(np.array(angle)-offset)

    # Shared variables must be drawn outside the loop across microphone layouts.
    white = rng.standard_normal((N,40))
    ambient = [(tuple(rng.uniform(-80,80,2)), rng.uniform(20000,40000,5),
                rng.uniform(0,2*np.pi,5)) for _ in range(5)]
    wind_f = np.array([130.,380.,770.,1430.,2900.])
    wind_phase = rng.uniform(0,2*np.pi,(1,len(wind_f))) + rng.normal(0,.6,(40,len(wind_f)))
    wind_strength = [-24.,-15.,-7.][(i//3)%3]
    drone_pos = np.array([rng.uniform(-.16,.16),rng.uniform(-.12,.12),rng.uniform(-.38,-.20)])
    drone_f = rng.uniform(20500,38500,6 if i%2 else 1)
    drone_p = rng.uniform(0,2*np.pi,len(drone_f))
    fronts = {}
    for count,pos in positions.items():
        raw = white[:,:count]*db_amplitude(strength)
        if condition == "ambient":
            for a,f,p in ambient:
                raw += pressure(pos,a,f,p, db_amplitude(strength)/np.sqrt(len(ambient)))
        if condition == "wind":
            gust = np.sin(2*np.pi*BASE_TIME[:,None,None]*wind_f +
                          wind_phase[None,:count,:]).sum(axis=2)*np.sqrt(2/len(wind_f))
            raw += gust*db_amplitude(wind_strength)*(.65+.35*np.cos(2*np.pi*350*BASE_TIME[:,None]))
        if axis not in ("calibration","null"):
            raw += pressure(pos,angle,frequencies,phases,db_amplitude(level),center,width)
        if second is not None:
            a,f,p,l = second
            raw += pressure(pos,a,f,p,db_amplitude(l))
        if drone:
            dist=np.linalg.norm(pos-drone_pos,axis=1)
            t=BASE_TIME[:,None]+(np.linalg.norm(drone_pos)-dist)/343.
            signal=np.sin(2*np.pi*t[:,:,None]*drone_f+drone_p).sum(axis=2)
            raw += signal*np.sqrt(2/len(drone_f))*np.linalg.norm(drone_pos)/dist*db_amplitude(level+[-6,0,6,12][(i//2)%4])
        scaled=np.rint(raw*32768)
        fronts[count]=(np.clip(scaled,-32768,32767).astype(np.int64),int(np.count_nonzero((scaled>32767)|(scaled< -32768))))
    truths=[] if axis in ("null","calibration") else [angle]
    if second is not None: truths.append(second[0])
    return fronts, truths, condition


class FloatMap:
    def __init__(self, like):
        self.m, self.n = like.m, like.n
        self.t, self.directions, self.units = like.t, like.directions, like.units
        self.bins = np.arange(27,54)
        self.kernel = self.steering(self.directions,self.bins)

    def steering(self, directions, bins):
        delay = np.array([unit(d) for d in directions]) @ self.t['mics'].T / 343.
        return np.exp(-2j*np.pi*delay[:,None,:]*(bins*RATE/N)[None,:,None])

    def frame(self, pcm):
        spec=np.fft.rfft(pcm/32768*self.t['window_float'][:,None],axis=0)[self.bins]/N
        beam=np.einsum("dkm,km->dk",self.kernel,spec)
        return (np.abs(beam)**2).sum(axis=1)*2/(self.m**2*np.mean(self.t['window_float']**2)),0


def all_bin_power(model, pcm, index):
    bins=np.arange(27,54)
    spectrum=np.fft.rfft(pcm/32768*model.t['window_float'][:,None],axis=0)[bins]/N
    delay=model.units[index]@model.t['mics'].T/343.
    steer=np.exp(-2j*np.pi*(bins*RATE/N)[:,None]*delay)
    return np.sum(np.abs((spectrum*steer).sum(axis=1))**2)*2/(model.m**2*np.mean(model.t['window_float']**2))


def score(values, model, truths, threshold):
    """A single displayed hotspot or two distinct, credible local maxima."""
    distances=np.degrees(np.arccos(np.clip(model.units @ np.stack([unit(t) for t in truths]).T,-1,1)))
    outside=np.all(distances>9,axis=1)
    wrong=values[outside].max(initial=0)
    limit=max(threshold,wrong*10**.3)
    if len(truths)==1:
        peak=int(np.argmax(values))
        return bool(distances[peak,0]<=3 and values[peak]>threshold and values[peak]>=limit)
    n=int(np.sqrt(len(values)))
    maxima=maximum_filter(values.reshape(n,n), size=3, mode="constant",cval=-1).ravel()
    peaks=np.flatnonzero((values==maxima)&(values>=limit)&(values>threshold))
    a=peaks[distances[peaks,0]<=3];b=peaks[distances[peaks,1]<=3]
    # Tied adjacent pixels on the same plateau cannot count as two sources.
    return any(np.max(np.abs(np.array(divmod(int(x),n))-divmod(int(y),n)))>1 for x in a for y in b)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("rtl",type=Path);p.add_argument("out",type=Path)
    args=p.parse_args();args.out.mkdir(exist_ok=True,parents=True)
    sys.path.insert(0,str(args.rtl/"tests"))
    from frequency_coverage import PCMModel
    files={"balanced":"configs/candidate_balanced_40m_k16.toml","coverage":"configs/candidate_coverage_30m_k22.toml","control":"config.toml"}
    models={k:PCMModel(tomllib.loads((args.rtl/f).read_text())) for k,f in files.items()}
    models["reference"]=FloatMap(models["coverage"])
    positions={m.m:m.t["mics"] for m in models.values()}
    checks={}
    artifact_dir=Path(__file__).resolve().parent
    fixtures=json.loads((artifact_dir/"rtl-anchors.json").read_text())
    vectors=np.load(artifact_dir/"rtl-anchors.npz")
    for key,fixture in fixtures.items():
        model=models[key]
        assert all(fixture["settings"][k]==model.s[k] for k in model.s if k not in ("architecture","name"))
        frames=vectors["pcm_"+key].astype(np.int64)
        golden=vectors["actual_"+key]
        for pcm,expected in zip(frames,golden):
            np.testing.assert_array_equal(model.frame(pcm)[0],expected)
        checks[key]={"fixture":fixture["source_fixture"],"exact_maps":len(frames),"actual_map_file_sha256":fixture["actual_map_file_sha256"]}
    for model in models.values():
        assert not np.any(model.frame(np.zeros((N,model.m),dtype=np.int64))[0])
        directions=model.directions
        left,right=[int(np.argmin(np.linalg.norm(directions-a,axis=1))) for a in [(-12,6),(12,6)]]
        a,b=directions[left],directions[right]
        synthetic=np.zeros(len(directions))
        synthetic[left]=2
        assert score(synthetic,model,[a],1) and not score(synthetic,model,[b],1)
        assert not score(synthetic,model,[a,b],1) and not score(synthetic,model,[a],3)
        synthetic[right]=1.5
        assert score(synthetic,model,[a,b],1) and not score(synthetic,model,[a],1)
        assert not score(np.ones(len(directions)),model,[a],.1)
    anchors={k:[] for k in models}; thresholds={}; scores=[]; records=[]; saved={}; scenes={}
    # Prespecified examples: the same physical events are shown for every candidate.
    examples={("burst",1),("environment",0),("environment",2),("environment",1),("drone",6),("field",2),("pair",4),("frequency",71),("null",2)}
    counts={"calibration":144,"null":180,"burst":120,"frequency":322,"environment":108,"drone":120,"field":96,"pair":108}
    for family,(axis,count) in enumerate(counts.items()):
        for i in range(count):
            seed=851000+10000*family+(i//3 if axis=="environment" else i)
            frames,truths,background=make_scene(axis,i,seed,positions)
            ident=f"{axis}-{i}"
            if (axis,i) in examples: scenes[ident]={"truths":truths,"axis":axis,"condition":background,"seed":seed,"index":i}
            for key,model in models.items():
                pcm,input_clips=frames[model.m];values,arithmetic_clips=model.frame(pcm)
                if key!="reference": values=values.astype(float)/(2**model.s["power_fraction"])
                peak=float(values.max());retention=None
                if axis=="calibration":
                    anchors[key].append(peak);passed=None
                elif axis=="null": passed=peak>thresholds[key]
                else:
                    passed=score(values,model,truths,thresholds[key])
                    if axis=="frequency":
                        index=int(np.argmax(model.units@unit(truths[0])))
                        reference=all_bin_power(model,pcm,index)
                        retention=float(10*np.log10(max(values[index],1e-300)/reference))
                        passed=passed and retention>=-3
                records.append(dict(axis=axis,case=i,seed=seed,background=background,design=key,pass_or_alarm=passed,peak=peak,retained_db=retention,input_clips=input_clips,internal_clips=arithmetic_clips))
                if (axis,i) in examples:
                    saved[ident+"_"+key]=values
        if axis=="calibration":
            thresholds={k:float(np.quantile(v,.95,method="higher")) for k,v in anchors.items()}
        else:
            for key in models:
                rows=[r for r in records if r["axis"]==axis and r["design"]==key]
                scores.append(dict(axis=axis,design=key,passed=sum(bool(r["pass_or_alarm"]) for r in rows),total=len(rows)))
        print("Completed",axis,count,flush=True)
    assert all(np.isfinite(r["peak"]) and r["peak"]>=0 for r in records)
    assert len({(r["axis"],r["case"],r["design"]) for r in records})==len(records)
    with (args.out/"trials.csv").open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=records[0]);w.writeheader();w.writerows(records)
    for k,m in models.items():saved["directions_"+k]=m.directions
    np.savez_compressed(args.out/"gallery.npz",**saved)
    data=dict(labels=LABELS,axes=AXES,counts=counts,thresholds=thresholds,scores=scores,scenes=scenes,anchors=checks,
              config_hashes={k:hashlib.sha256((args.rtl/f).read_bytes()).hexdigest() for k,f in files.items()})
    (args.out/"benchmark.json").write_text(json.dumps(data,indent=2))

if __name__=="__main__":
    main()
