# Precision comparison

16-bit PCM preserved the floating-point peak in all 162 tested scene/level combinations. This does not establish that the FFT and spectra can also use 16 bits. With fixed scaling, 24-bit processing preserved every peak; 16- and 20-bit processing lost accuracy on quiet inputs.

## Fixed-point processing: trials within 5 degrees

| Total input RMS (dBFS) | 12 bits | 16 bits | 20 bits | 24 bits |
|---|---|---|---|---|
| -18 | 54/54 | 54/54 | 54/54 | 54/54 |
| -48 | 11/54 | 53/54 | 54/54 | 54/54 |
| -72 | 0/54 | 8/54 | 53/54 | 54/54 |

## Method

54 identical single-source scenes per level: 30-mic, 30-cm circle; 512-point Hann FFT; 1–4 kHz; 48 ksample/s; one frame/map; 3-degree scan grid; 9 source directions × 3 seeds × 1 and 1.5 m distances. Independent microphone noise is band-limited to 1–4 kHz at −10 dB SNR. The floating-point baseline passed 54/54 and matches the previously saved results.

Each noisy multichannel recording is scaled once, equally across channels, to total RMS −18, −48 or −72 dBFS. These are digital levels, not calibrated SPL. No normalization occurs after quantization. No input or FFT clipping occurred.

- PCM-only: quantize input to signed Q1.(B−1), then use floating-point processing. 16/20/24-bit input preserves every peak at all three levels; 12-bit input passes 53/54 at −72 dBFS and 54/54 at the other levels.
- Fixed pipeline: B-bit PCM, Hann coefficients, FFT real/imaginary values, twiddles and steering coefficients. Radix-2 FFT divides by two at every stage (overall 1/512), with integer nearest-even rounding. Each phase-rotated spectrum is rounded to the same fractional precision.
- Products and microphone/power/bin sums retain growth. B does NOT mean that accumulators are restricted to B bits. Integer overflow bounds were checked for the tested data.
- No adaptive gain or block-floating scaling. Different scaling or guard bits could allow narrower storage; these results do not establish a universal minimum width.
- No PDM/decimator, reflections, microphone mismatch, multiple sources, or cycle-accurate RTL.

## Validation and files

1,296 quantized maps: 54 scenes × 3 levels × 4 widths × 2 modes. Integer rounding was checked at positive and negative ties; the 24-bit FFT was checked against NumPy; floating-point maps and all 54 baseline angular errors were checked against the existing implementation/results.

- [Per-scene results](scenes.csv)
- [Configuration, geometry, summaries and script hash](results.json)

Local driver: `review/precision-check/run_precision.py` in the project workspace. It imports the existing `references/lmco-acoustic-camera-algorithm/mic-array-sims/compare_arrays.py` harness.
