# 30-microphone, 12-bin, 24-bit candidate plots

Generated for site handoff; no website publishing or production-default changes. Four galleries cover all17 existing scenes, with seed7 displayed and three seeds scored (204 new maps).

Columns: existing long software reference; earlier30/N512/10/26; chosen30/N512/10/24; requested30/N256/12/24; requested30/N512/12/24.

| Candidate | Accumulator | Observation | Gate count |
|---|---|---:|---|
| 30 / 512 / 10 / 26 | 26 total, 16 fractional bits | 2.667 ms | 281,097.75 measured |
| 30 / 512 / 10 / 24 | 24 total, 14 fractional bits | 2.667 ms | 269,599.25 measured |
| 30 / 256 / 12 / 24 | 24 total, 15 fractional bits | 1.333 ms | 296,241.53 estimated, not synthesized |
| 30 / 512 / 12 / 24 | 24 total, 14 fractional bits | 2.667 ms | 297,642.25 measured |

All use192 ksample/s, 20-40 kHz, 20 cm spiral, 60-degree FOV per axis and3-degree scan grid. Selected bin indices and frequencies are in configurations.json. N256 retains12 of27 in-band centers; N512 retains12 of53. Neither is full-bin coverage.

Panels use inferno, -12 to0 dB relative to their own peaks, cyan true-source rings and a white brightest-pixel marker. Zero output has no fabricated peak. Peak labels compare with the same N512/53-bin/eight-window software reference as the prior matched FFT/DFT gallery.

The N256 candidate uses Q15 and N512 uses Q14 to keep both total accumulators at24 bits. This compares the requested fixed-width designs, rather than isolating window length with exactly equal fractional precision. Shorter windows also see less of the same recording; pulse timing can materially change their map.

Both N512/24-bit PCM models exactly matched all8 map fixtures from the recent RTL verification. The earlier26-bit baseline exactly reproduced all17 previously saved seed7 maps. N256 is a PCM-model exploration, not a newly verified/synthesized RTL result.

Results are synthetic map diagnostics, not calibrated PD detection probabilities, noise rejection or field sensitivity. No new frequency sweep, motion test or live-video test is implied. Gate evidence and the295k choice remain unchanged.

For integration: charts.json, PNG/SVG figures, display-maps.json (all seed7 intensity vectors and direction coordinates), configurations.json, scene_metadata.json, measurements.json, summary.json and validation.json. Reproduce with python -m exploration.dft12_window_comparison.
