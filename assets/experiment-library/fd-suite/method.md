# Frequency-domain DAS scene evaluation

Run from the repository root with the project Python environment:

```sh
python -m unittest testbench.test_evaluation_suite -v
python -m exploration.evaluate_suite --output results/fd-suite
python -m exploration.evaluate_suite --output results/fd-suite --plot-only
python -m exploration.resolution_check --suite results/fd-suite
```

The suite characterizes the current algorithm before reducing hardware cost.
It is not a claim of field reliability or a PD classifier. It uses 24 deliberately
chosen cases and seeds 7, 23, 91 (72 maps), not a statistically representative
sample of real operating conditions. The displayed seed is always 7, selected
before running; failures are retained.

## Held fixed

30 microphones in a 20 cm planar spiral, 192 ksample/s, 25–50 kHz processing,
512-point FFT, 256-sample FFT hop, sqrt-Hann window, all in-band bins,
4096-sample / 21.33 ms observation, ±30° azimuth/elevation scanned at 1°,
floating-point arithmetic. Sources are at 10 m except the explicit 0.5 m tests.
Each saved report includes its complete configuration. The scene factory uses
`config/exploration.toml` for remaining defaults; preserve saved configurations
when comparing future hardware variants. No noise suppression is added.

## Cases and rationale

| Group | Cases | Question |
|---|---|---|
| Basic localization | Off-grid, edge, equal pair, 6 dB weaker pair, three sources, tone | Does spatial steering work beyond one easy scene? |
| Resolution and range | 3° and 1° pairs, 12 dB weaker pair, 1 ms bursts, 0.5 m with plane and spherical steering | When do peaks merge, weak sources disappear, or wavefront assumptions fail? |
| Interference | Two independent-noise levels, two nearby coherent-noise levels, in-band tone, out-of-band noise | Which interference is rejected by averaging/band selection and which survives? |
| Controls | Two gain/timing-error levels, independent and directional noise-only, outside-FOV source, rear source | Can misleading maps occur without a valid front-facing target? |

The rear-source case intentionally exposes the front/back ambiguity of an ideal
planar array with omnidirectional microphones. The out-of-band test assumes
linear, unclipped input; it cannot test overload or nonlinear mixing.

## Scoring and plots

All plots use −12 to 0 dB relative to **each map's own maximum**. Dark means
below the display floor, not zero acoustic energy. Cyan rings are ground truth;
the white plus is the strongest calculated pixel. Outside-FOV/rear targets are
not drawn inside the scan. Noise-only maps are normalized in exactly the same
way and can consequently look bright despite having no target.

The scorer first finds local maxima in a 3×3 neighborhood, including boundaries,
and keeps those within 12 dB of the global maximum. Adjacent equal-height plateau
pixels count as one candidate. It then matches candidates one-to-one to known
sources within 1.5° angular distance. A merged peak cannot count as two sources.
The threshold and tolerance are exploratory diagnostics, not application specs.
Sources below the display cutoff may still exist in the numerical map.

Saved metrics include individual match errors, matched-source count, extraneous
candidate count, strongest extraneous candidate relative level, peak-to-median
map contrast, absolute uncalibrated peak power, and processing time. Extraneous
peaks can be sidelobes, interference, or legitimate main-lobe structure; their
count is **not** an operational false-alarm probability. Matching a real source
does not imply that the map is free of misleading peaks. No aggregate accuracy
percentage is appropriate for this hand-picked mix of successes and stress cases.

Timing excludes sound generation, saving and plotting, but includes FFTs,
steering construction, beamforming and map averaging. It describes this Python
implementation, not optimized CPU or ASIC throughput.

## Remaining coverage gaps

No measured drone/PD recordings, calibrated ultrasonic mic response/SPL,
reflections, motion, propagation through weather, source directivity, physical
shielding, PDM acquisition artifacts, or source-presence decision rule. Synthetic
bursts are not a measured PD waveform. Three seeds are a first robustness check,
not a confidence interval or sufficient evidence of deployment reliability.

Each seed saves `report.json` and `maps.npz` including PCM, geometry and maps.
The output root contains `summary.json`, an HTML report and four plot sheets. These saved inputs
can be replayed in future algorithm/precision experiments without changing scenes.

## Scan-density cross-check

`exploration.resolution_check` replays the exact saved PCM for both close-source
cases and all three seeds on a 0.25° grid over ±5°. Everything else stays fixed.
It saves maps, scores, and azimuth profiles (maximum over elevation), comparing
the original 1° sampling with the finer scan. This separates scan sampling from
the beam pattern; a 1° grid alone does not establish a physical resolution limit.
The reported dip is between the two central profile maxima, relative to the
weaker maximum, when two maxima exist. It is not a universal resolution criterion.
