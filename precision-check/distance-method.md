# Layout, distance and precision comparison

Checkbox dropdowns select bit widths, SNRs and digital input levels. Dots show individual trial errors; each line shows the median valid-output error for one selected combination. Crosses identify no-output trials, which remain failures in the displayed success counts. Lines only connect sampled distances. Colors identify bit widths; dash patterns separate SNR/input-level combinations. Hover a line or dot for its conditions. Success counts pool all selected conditions; floating-point results are counted once per SNR because digital level does not affect them.

- Eight layouts; distances 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4 and 5 m.
- 512-sample Hann window (10.67 ms), 48 ksample/s, 1–4 kHz, one window per map.
- Nine source directions × three seeds per point; ±60° scan with 3° spacing.
- SNR: 20, 0, −10, −20 dB. Independent microphone noise is limited to 1–4 kHz.
- Total signal-plus-noise RMS: −18, −48 or −72 dBFS. This digital level is not an acoustic SPL.
- Input, FFT stages, twiddles and steering coefficients use the selected width. The FFT divides by two at each stage; sums retain growth. No adaptive gain or block-floating scaling.

Distance changes spherical propagation while the beamformer uses plane-wave steering. SNR and digital RMS are held fixed across distances and layouts to isolate geometry and precision. These curves do **not** predict maximum detection range or account for attenuation-driven SNR loss. No reflections, obstructions, microphone mismatch, PDM/decimator or RTL timing is simulated.

## Validation

101,088 maps, including floating-point references. The optimized integer kernel matches the original model exactly on independent test vectors. All 1 m and 1.5 m floating-point results match the previous layout runs; circle-array fixed-point results also match the earlier precision sweep. Every plotted group contains 27 unique trials. Recorded input/FFT clipping events: 0.

[Download per-trial results and run metadata](distance-results.zip).

Local drivers: `precision-check/layout_precision.py` and `precision-check/export_distance.py`, using the existing array harness and `run_precision.py` integer model.
