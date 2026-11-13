# Near-300k candidate proposal

## Gate model

Run `python -m exploration.area_estimator --mics 30 --bins 8 --acc-frac 24`
or supply `--config config/area_estimator.json`. The model accepts mic/bin counts,
window length, band and PCM rate, FOV/grid spacing, precision, filtering and
averaging/overlap. Primary area axes use measured calibration; other-stage/filter
changes are rough planning deltas with at least ±50% screening. Each output labels
measured values, fitted values, analytical additions and assumptions separately.
It does not model SRAM macros, arbitrary parallel architectures or physical fit.

## Candidates for review

| Configuration | Measured complete gates |
|---|---:|
| 30 mics · 8 bins / 34-bit accumulator | 288.1k |
| 30 mics · 10 bins / 26-bit accumulator | 281.1k |
| 24 mics · 10 bins / 34-bit accumulator | 285.6k |
| 16 mics · 24 bins / 26-bit accumulator | 287.8k |

All use Fs=192k, N=512, 60° FOV per axis, a 3° grid, 20 cm native spiral, one
window/map, CIC3/16 with identity FIR, 16-bit PCM and 48-bit UART map output.
Among the numerical formats, only Fourier storage precision changes; window/coefficient/spectrum formats stay
18/Q16, 18/Q16 and 24/Q22. These are functional experiments, not final chip specs.
All register storage and UART are counted. No timing, layout, pad/scan or real
continuous-microphone qualification is implied by a number below 300k.

## Relative performance evidence

Same generated source waveforms for native 16/24/30-mic arrays. Seventeen scene
recipes from the earlier evaluation suite, three seeds and 18 configurations:
918 maps. Strong/weak/multiple targets, tones, bursts, microphone noise, nearby
interference, mismatch, noise-only and out-of-view controls are included.
The new integer PCM model matched 60 existing golden map outputs across the
generated RTL fixtures. PDM hardware checks are separate; these maps start at PCM.

| Scene | 30m/8bin/Q24 | 30m/10bin/Q16 | 24m/10bin/Q24 | 16m/24bin/Q16 |
|---|---:|---:|---:|---:|
| single | 3/3 | 3/3 | 3/3 | 3/3 |
| unequal6 | 6/6 | 6/6 | 6/6 | 5/6 |
| three | 9/9 | 9/9 | 8/9 | 7/9 |
| close3 | 3/6 | 3/6 | 3/6 | 3/6 |
| tone | 3/3 | 3/3 | 3/3 | 3/3 |
| tone30000 | 3/3 | 3/3 | 3/3 | 3/3 |
| pulses | 3/3 | 3/3 | 3/3 | 3/3 |
| independent10 | 6/6 | 5/6 | 5/6 | 5/6 |
| mismatch_small | 6/6 | 6/6 | 6/6 | 5/6 |

Entries are matched target instances across three seeds, not a field accuracy or
PD detection probability. Matching uses distinct local peaks within 2.2° and above
−12 dB. The 53-bin/eight-window software reference is not assumed perfect. At
different grid spacings this same tolerance intentionally exposes grid limitations.
Native layouts and independent per-channel noise differ with mic count; the source
waveforms and aperture are shared. No real microphone response, PDM noise spectrum,
drone recordings, acoustic calibration or discharge classifier is included.

## Interpretation and recommendation

- Keep the 30-mic/eight-bin/Q24 candidate as the conservative precision baseline.
  It retains more spatial sampling, but sparse bins lose substantial tone energy.
- The 30-mic/ten-bin/Q16 candidate tests spending precision savings on frequency
  coverage while preserving the array. Treat its lower precision as provisional:
  these scene levels do not establish the minimum usable signal level.
- The 24-mic/ten-bin/Q24 candidate offers an intermediate mic-count/precision
  tradeoff. It is not automatically better than either endpoint on every scene.
- The 16-mic/24-bin/Q16 candidate retains much more frequency content, especially
  the 30 kHz tone, but can lose weak-source separation/localization with fewer mics.
- Exact bin placement is important and comparatively cheap: the 10-bin uniform
  set happens to include 37.5 kHz, while the 24-bin set does not. These frequencies
  were part of the test suite; this is not a reason to tune a PD search camera to
  those particular test tones. Broader spectral coverage or a justified selection
  strategy is still required.
- Increasing N=512→1024 is cheap in this selected-bin architecture, but with K
  fixed it narrows the captured spectral slices and worsens several power ratios.
  More samples alone is not a guaranteed improvement.
- A finer grid is relatively cheap for a streamed map and can improve position
  estimates. It cannot remove physical array-resolution limits or false peaks.
- Longer observation/averaging recovers burst energy and steadies some maps, but
  the proposed running-map register storage is expensive. Its current area is an
  analytical budget, not a verified implementation. Alternative schedules deserve
  investigation before sacrificing the array to pay that storage cost.
- Lowering sample rate barely changed measured area in the matched-duration
  comparison. Its filtering/aliasing and throughput implications remain separate.

The main choice to review is spatial sampling versus spectral coverage; there is
no single winner across all scenes. Compare the maps and absolute-power labels
before selecting a candidate. Parameter value is conditional on source spectrum,
noise and observation duration; these synthetic experiments do not establish a
universal ranking or an operational detection threshold.

## Handoff

Figures 11–14 in `docs/review/gate-count-study/` contain candidate maps, retained
power and controlled area/quality comparisons. `candidate-configurations.json`
contains the complete algorithm settings and accumulator fractions.
`candidate-comparisons.csv` and `candidate-measurements.json` contain all scores;
`candidate-validation.json` records input hashes and numerical anchors. Actual
recordings remain under `results/hardware_cost/candidate_quality/`.
