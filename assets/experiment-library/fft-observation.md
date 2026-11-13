# Microphone-array FFT-size comparison

Earlier floating-point study. See the [current 512-point, 16-bit comparison](mic-array-comparison.md) for the current website view.

Current choice: **30 microphones on a 30 cm-diameter circle**. The square is shown first for comparison. These are the same eight layouts and saved results used in the HTML review.

[Interactive review](https://lucasjia05.github.io/lmca-acoustic-camera-review/#parameters) · [Repository HTML snapshot](review/index.html) (download/open locally for interaction).

## Conditions

- **1–4 kHz**, 48 ksample/s, frequency-domain delay-and-sum; Hann window, floating-point calculations.
- Distances: **1 m and 1.5 m**. Static figures use **−10 dB in-band SNR**; HTML also offers 20, 0, and −20 dB.
- FFT sizes: **512 / 1024 / 2048**. One-frame windows: **10.67 / 21.33 / 42.67 ms**. Equal-duration mode averages **4 / 2 / 1** non-overlapping frame power maps over 42.67 ms.
- Nine source directions (azimuth, elevation): (0°,0°), (11°,7°), (−11°,−7°), (31°,0°), (−31°,0°), (0°,19°), (0°,−19°), (31°,17°), (−31°,−17°). Three noise seeds each: **27 single-source trials per distance/configuration**.
- Search: ±60° azimuth/elevation, 3° steps (41 × 41 directions); not a camera-matched 75° diagonal grid. Pass: 3D angular error ≤5°.
- Flat-spectrum band-limited noise sources, spherical propagation, plane-wave steering. Independent microphone noise is band-limited to 1–4 kHz and RMS-normalized before windowing. Earlier broadband-noise studies are not directly comparable.
- Source pairs: equal strength, independent signals, 20°/40° azimuth separation centered at (0°,0°), three seeds each. Pass: both peaks within 5° of their sources and ≥1 dB valley. **12 pair trials across both distances** per FFT/mode.

Figures share geometry scale and error axes across layouts. Dots are individual trials; horizontal jitter separates overlaps. Tables pool both distances: **54 single-source trials** per row. Small-sample pass counts are not guaranteed performance.

## 16-mic square grid · 30 cm span

![16-mic square grid · 30 cm span: microphone positions and FFT accuracy](mic-array-comparison/grid16-30cm-span.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 39/54 | 12.04° | 0/12 |
| One frame | 1024 | 50/54 | 7.94° | 2/12 |
| One frame | 2048 | 54/54 | 4.00° | 0/12 |
| Equal 42.7 ms | 512 | 54/54 | 4.44° | 0/12 |
| Equal 42.7 ms | 1024 | 54/54 | 5.00° | 2/12 |
| Equal 42.7 ms | 2048 | 54/54 | 4.00° | 0/12 |

## 30-mic circle · 30 cm

![30-mic circle · 30 cm: microphone positions and FFT accuracy](mic-array-comparison/circle30-30cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 54/54 | 5.00° | 6/12 |
| One frame | 1024 | 54/54 | 3.02° | 6/12 |
| One frame | 2048 | 54/54 | 2.22° | 6/12 |
| Equal 42.7 ms | 512 | 54/54 | 3.02° | 6/12 |
| Equal 42.7 ms | 1024 | 54/54 | 2.23° | 6/12 |
| Equal 42.7 ms | 2048 | 54/54 | 2.22° | 6/12 |

## 30-mic spiral · 30 cm

![30-mic spiral · 30 cm: microphone positions and FFT accuracy](mic-array-comparison/spiral30-30cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 50/54 | 6.00° | 2/12 |
| One frame | 1024 | 54/54 | 4.10° | 2/12 |
| One frame | 2048 | 54/54 | 3.02° | 4/12 |
| Equal 42.7 ms | 512 | 54/54 | 3.46° | 4/12 |
| Equal 42.7 ms | 1024 | 54/54 | 3.46° | 4/12 |
| Equal 42.7 ms | 2048 | 54/54 | 3.02° | 4/12 |

## Parsa layout · 30 cm

![Parsa layout · 30 cm: microphone positions and FFT accuracy](mic-array-comparison/parsa-30cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 49/54 | 8.60° | 2/12 |
| One frame | 1024 | 54/54 | 3.61° | 0/12 |
| One frame | 2048 | 54/54 | 3.94° | 4/12 |
| Equal 42.7 ms | 512 | 54/54 | 3.00° | 4/12 |
| Equal 42.7 ms | 1024 | 54/54 | 3.02° | 4/12 |
| Equal 42.7 ms | 2048 | 54/54 | 3.94° | 4/12 |

## Parsa layout · 35 cm

![Parsa layout · 35 cm: microphone positions and FFT accuracy](mic-array-comparison/parsa-35cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 52/54 | 8.60° | 2/12 |
| One frame | 1024 | 54/54 | 3.61° | 0/12 |
| One frame | 2048 | 54/54 | 3.94° | 4/12 |
| Equal 42.7 ms | 512 | 54/54 | 3.00° | 6/12 |
| Equal 42.7 ms | 1024 | 54/54 | 3.00° | 6/12 |
| Equal 42.7 ms | 2048 | 54/54 | 3.94° | 4/12 |

## Parsa original · 8.6 cm

![Parsa original · 8.6 cm: microphone positions and FFT accuracy](mic-array-comparison/parsa-native.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 14/54 | 19.33° | 0/12 |
| One frame | 1024 | 17/54 | 13.51° | 0/12 |
| One frame | 2048 | 40/54 | 12.23° | 0/12 |
| Equal 42.7 ms | 512 | 32/54 | 8.91° | 0/12 |
| Equal 42.7 ms | 1024 | 36/54 | 9.72° | 0/12 |
| Equal 42.7 ms | 2048 | 40/54 | 12.23° | 0/12 |

## 16-mic circle · 30 cm

![16-mic circle · 30 cm: microphone positions and FFT accuracy](mic-array-comparison/circle16-30cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 51/54 | 22.23° | 2/12 |
| One frame | 1024 | 54/54 | 5.00° | 2/12 |
| One frame | 2048 | 54/54 | 3.00° | 4/12 |
| Equal 42.7 ms | 512 | 54/54 | 3.61° | 4/12 |
| Equal 42.7 ms | 1024 | 54/54 | 3.61° | 4/12 |
| Equal 42.7 ms | 2048 | 54/54 | 3.00° | 4/12 |

## 16-mic spiral · 30 cm

![16-mic spiral · 30 cm: microphone positions and FFT accuracy](mic-array-comparison/spiral16-30cm.png)

| Observation | FFT | Within 5° | Worst error | Two-source pass |
|---|---:|---:|---:|---:|
| One frame | 512 | 39/54 | 65.91° | 0/12 |
| One frame | 1024 | 50/54 | 6.71° | 0/12 |
| One frame | 2048 | 54/54 | 4.42° | 2/12 |
| Equal 42.7 ms | 512 | 54/54 | 5.00° | 1/12 |
| Equal 42.7 ms | 1024 | 54/54 | 5.00° | 2/12 |
| Equal 42.7 ms | 2048 | 54/54 | 4.42° | 2/12 |

## Interpretation and reproduction

The 30-mic circle passes all 54 single-source −10 dB trials in each configuration. Worst errors are **5.00° / 3.02° / 2.22°** for single 512 / 1024 / 2048 frames, and **3.02° / 2.23° / 2.22°** at equal duration. This supports the candidate under these conditions; it does not establish an optimum for all acoustic scenes. Single-source accuracy and two-source resolution are distinct.

No room reflections, microphone mismatch, PCB scattering, PDM/decimation, or fixed-point effects are modeled. Widths in the configuration are storage assumptions, not simulated quantization. Processing throughput and ASIC area require separate hardware validation. Parsa layouts are sourced/rescaled geometries; none is presented as an exact HBK layout.

Saved per-trial results, configurations and coordinates are in [layout-data.js](review/layout-data.js). Regenerate this document and figures with `python mic-array-sims/src/create_fft_review_doc.py`. Re-run the full 32-layout, 10-configuration experiment with `python mic-array-sims/src/run_baseline_comparison.py`; output goes to ignored `mic-array-sims/src/baseline-results/`. The simulator checks its cached steering calculation against the original beamformer at each geometry/frequency setting. See [requirements](../mic-array-sims/src/requirements.txt) and [simulation details](../mic-array-sims/README.md).
