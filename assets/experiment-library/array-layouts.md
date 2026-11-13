# Microphone-array comparison

Current choice: **30-mic circle · 30 cm diameter**. This reproduces the [current website](https://lucasjia05.github.io/lmca-acoustic-camera-review/#parameters): the same eight layouts, square first, and default selections.

**512-sample FFT · 16-bit processing · 1–4 kHz · −10 dB SNR · −48 dBFS total input RMS.**

Array image on the left; performance versus distance on the right. Dots show individual trials, lines show worst valid-output error, and crosses mark no-output trials (counted as failures). Shared axes across layouts; horizontal jitter reveals overlapping dots. Lines only connect sampled distances.

The live HTML offers other bit widths, SNRs and digital input levels. This static document shows its default selection. [Local HTML snapshot](review/index.html) · [Earlier floating-point FFT comparison](mic-array-fft-comparison.md).

## Simulation conditions

- 48 ksample/s, one 512-sample Hann window (**10.67 ms**), bins 11–42 for 1–4 kHz.
- Distances: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5 m. Nine directions × three seeds = **27 trials per distance**, 243 per layout.
- Directions (azimuth, elevation): (0°,0°), (11°,7°), (−11°,−7°), (31°,0°), (−31°,0°), (0°,19°), (0°,−19°), (31°,17°), (−31°,−17°). Scan ±60° in each axis, 3° steps. Pass: 3D angular error ≤5°.
- Spherical propagation, plane-wave frequency-domain DAS, band-limited synthetic sources and independent 1–4 kHz microphone noise.
- Input, FFT stages, twiddles and steering coefficients use the selected **16-bit model**. FFT scales by 1/2 per stage; accumulators retain growth. No adaptive gain or block-floating scaling.
- SNR and total signal-plus-noise RMS remain fixed with distance. **−48 dBFS is not SPL**; these curves do not predict attenuation-limited detection range.
- No reflections, obstructions, microphone mismatch, PDM/decimation or RTL timing. Numerical precision results do not establish chip area or throughput.

## 16-mic square grid · 30 cm span

![16-mic square grid · 30 cm span: array and 512-point 16-bit performance](mic-array-distance-comparison/grid16-30cm-span.png)

**Within 5°: 158/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 5/27 | 72.48° | 0 |
| 0.5 m | 15/27 | 27.39° | 0 |
| 0.75 m | 18/27 | 29.68° | 0 |
| 1 m | 18/27 | 29.68° | 0 |
| 1.5 m | 19/27 | 12.04° | 0 |
| 2 m | 22/27 | 12.64° | 0 |
| 3 m | 20/27 | 29.68° | 0 |
| 4 m | 20/27 | 12.64° | 0 |
| 5 m | 21/27 | 12.64° | 0 |

## 30-mic circle · 30 cm

![30-mic circle · 30 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/circle30-30cm.png)

**Within 5°: 234/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 23/27 | 8.42° | 0 |
| 0.5 m | 27/27 | 4.47° | 0 |
| 0.75 m | 26/27 | 5.07° | 0 |
| 1 m | 26/27 | 5.07° | 0 |
| 1.5 m | 27/27 | 4.47° | 0 |
| 2 m | 27/27 | 5.00° | 0 |
| 3 m | 26/27 | 6.19° | 0 |
| 4 m | 26/27 | 6.19° | 0 |
| 5 m | 26/27 | 6.19° | 0 |

## 30-mic spiral · 30 cm

![30-mic spiral · 30 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/spiral30-30cm.png)

**Within 5°: 213/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 16/27 | 13.40° | 0 |
| 0.5 m | 24/27 | 6.71° | 0 |
| 0.75 m | 25/27 | 6.00° | 0 |
| 1 m | 24/27 | 6.00° | 0 |
| 1.5 m | 24/27 | 6.00° | 0 |
| 2 m | 24/27 | 6.00° | 0 |
| 3 m | 25/27 | 6.00° | 0 |
| 4 m | 26/27 | 6.00° | 0 |
| 5 m | 25/27 | 6.00° | 0 |

## Parsa layout · 30 cm

![Parsa layout · 30 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/parsa-30cm.png)

**Within 5°: 211/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 17/27 | 10.80° | 0 |
| 0.5 m | 24/27 | 8.60° | 0 |
| 0.75 m | 25/27 | 8.60° | 0 |
| 1 m | 25/27 | 8.60° | 0 |
| 1.5 m | 24/27 | 7.28° | 0 |
| 2 m | 24/27 | 8.60° | 0 |
| 3 m | 24/27 | 7.28° | 0 |
| 4 m | 24/27 | 7.28° | 0 |
| 5 m | 24/27 | 7.28° | 0 |

## Parsa layout · 35 cm

![Parsa layout · 35 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/parsa-35cm.png)

**Within 5°: 220/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 11/27 | 90.89° | 0 |
| 0.5 m | 24/27 | 8.60° | 0 |
| 0.75 m | 26/27 | 8.60° | 0 |
| 1 m | 26/27 | 8.60° | 0 |
| 1.5 m | 26/27 | 8.60° | 0 |
| 2 m | 26/27 | 7.28° | 0 |
| 3 m | 27/27 | 4.47° | 0 |
| 4 m | 27/27 | 4.47° | 0 |
| 5 m | 27/27 | 4.47° | 0 |

## Parsa original · 8.6 cm

![Parsa original · 8.6 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/parsa-native.png)

**Within 5°: 83/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 8/27 | 19.64° | 0 |
| 0.5 m | 8/27 | 25.71° | 0 |
| 0.75 m | 11/27 | 25.71° | 0 |
| 1 m | 8/27 | 25.71° | 0 |
| 1.5 m | 7/27 | 25.71° | 0 |
| 2 m | 10/27 | 22.02° | 0 |
| 3 m | 11/27 | 25.23° | 0 |
| 4 m | 10/27 | 25.71° | 0 |
| 5 m | 10/27 | 25.71° | 0 |

## 16-mic circle · 30 cm

![16-mic circle · 30 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/circle16-30cm.png)

**Within 5°: 214/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 18/27 | 70.47° | 0 |
| 0.5 m | 24/27 | 77.55° | 0 |
| 0.75 m | 24/27 | 22.23° | 0 |
| 1 m | 26/27 | 22.23° | 0 |
| 1.5 m | 23/27 | 22.23° | 0 |
| 2 m | 25/27 | 22.23° | 0 |
| 3 m | 25/27 | 22.23° | 0 |
| 4 m | 24/27 | 22.23° | 0 |
| 5 m | 25/27 | 49.55° | 0 |

## 16-mic spiral · 30 cm

![16-mic spiral · 30 cm: array and 512-point 16-bit performance](mic-array-distance-comparison/spiral16-30cm.png)

**Within 5°: 156/243 trials.**

| Distance | Within 5° | Worst valid-output error | No output |
|---:|---:|---:|---:|
| 0.25 m | 7/27 | 74.08° | 0 |
| 0.5 m | 15/27 | 64.44° | 0 |
| 0.75 m | 15/27 | 64.44° | 0 |
| 1 m | 20/27 | 74.12° | 0 |
| 1.5 m | 18/27 | 65.91° | 0 |
| 2 m | 19/27 | 77.02° | 0 |
| 3 m | 20/27 | 74.12° | 0 |
| 4 m | 21/27 | 74.12° | 0 |
| 5 m | 21/27 | 77.02° | 0 |

## Evidence and reproduction

[Method and validation](review/precision-check/distance-method.md) · [Per-trial results and metadata](review/precision-check/distance-results.zip) · [Plotted data](review/layout-distance-data.js). The published validation record reports 101,088 maps for the complete sweep and zero recorded input/FFT clipping events. This document renders saved results; it does not rerun simulations.

Regenerate with `python mic-array-sims/src/create_review_doc.py`. The generator checks trial counts and success/no-output counts against individual errors. The earlier FFT-size comparison uses floating-point arithmetic and remains available separately.
