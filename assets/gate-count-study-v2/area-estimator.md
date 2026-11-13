# Configurable gate estimator

Edit `config/area_estimator.json`, then run from the algorithm repository:

```sh
python -m exploration.area_estimator --config config/area_estimator.json
python -m exploration.area_estimator --mics 30 --bins 10 --acc-frac 16
```

This estimates NAND2-equivalent gates for the current shared, selected-bin DFT
pipeline, including PDM conversion, all register storage, fixed tables and UART.
It is not a full buffered FFT architecture or a physical chip-area prediction.
The default example returns the measured 288,105.75 GE for 30 mics/eight bins.
No production RTL defaults are changed by editing this estimator's parameter file.

## Inputs grouped by purpose

| Group | Inputs | Evidence and coupling |
|---|---|---|
| Array | `microphones` | Measured at 16, 24 and 30. Fixed 20 cm spiral; layout mainly changes coefficients, not storage dimensions. |
| Frequency analysis | `sample_rate_hz`, `band_low_hz`, `band_high_hz`, `window_samples`, `selected_bins` | These jointly determine available bins and exact selected frequencies. N=256/512/1024 and K=4–24 are covered by selected measurements, not every combination. Band is not charged again independently of bin count. |
| Scan | `fov_az_deg`, `fov_el_deg`, `scan_step_deg` | Jointly determine direction count. Measured 60° by 60° with 1°, 3° and 6° steps; other FOV constants are uncalibrated. |
| Numerical precision | `accumulator_fraction`; PCM, window, coefficient, spectrum and map widths/fractions | Accumulator storage precision has a new synthesis fit. Other formats use rough state/arithmetic deltas and flag uncertainty. There is no single global chip bit width. |
| Observation | `frames`, `hop_samples` | Single-window RTL is verified. Multiwindow averaging and overlap are software experiments plus unimplemented storage budgets. |
| Input filtering | `cic_order`, `decimation`, `fir_taps` | Measured baseline is CIC3/16, identity FIR; CIC3/32 has one matched-duration comparison. Other settings use rough analytical allowances. Filter quality is not inferred from area. |
| Output and buffering | `map_width`, `power_fraction`, `uart_baud`, `extra_buffer_bits` | Baseline 48-bit map, 2 Mbaud. Additional registers/access are budgeted explicitly; no free SRAM is assumed. |

Update rate is an output of acquisition, scheduling and output bandwidth, not an
independent area input here. The estimator reports observation duration and UART
packet size, but does not claim a sustained map rate. Continuous physical PDM
capture still needs scheduling qualification. Source/noise levels and range are
scene-test inputs; they do not directly change the fixed hardware size.

## Fitted calculation

For calibrated stage formats and architecture:

```text
W = accumulator_fraction + ceil(log2(N)) + 1
D = (azimuth_FOV / step + 1) * (elevation_FOV / step + 1)
GE ≈ 46,994 + 9.7925*(2*M*K*W) + 2,556.1*M + 5.2708*D + 4.0103*N
```

M is microphones, K selected bins, N window samples, W stored bits per real or
imaginary accumulator. Coefficients are empirical whole-design fits, not isolated
cell costs. Exact measured configurations use their measured total instead of the
fitted value. The fixed-table accumulator bound was checked for synthesized points;
the equation alone does not establish functional validity for arbitrary settings.

There are 19 whole-top measurements: 13 training points, five held-out checks, and
one separate sampling/filter comparison. Maximum held-out error was 5.92%.
The model retains a wider ±22.82% engineering screening allowance; uncalibrated
changes generally receive at least ±50%. These are not confidence intervals.
Multiwindow storage has its own range and excludes a qualified implementation.

The output separates `measured_ge`, `estimated_ge`, `screening_range_ge`,
`components`, `flags` and the exact derived bin frequencies. A predicted value
below 300k does not establish that the final chip fits. Clock closure, routing,
pad cells, scan insertion and physical overhead are outside this measurement.

## Results and reproduction

- `docs/review/gate-count-study/index.html`: all plots in one gallery.
- `docs/near-300k-candidates.md`: four measured candidates and quality tradeoffs.
- `results/hardware_cost/area_axes/`: fit, measurements and synthesis evidence.
- `results/hardware_cost/candidate_quality/`: fixed-point maps, scores and inputs.
- `testbench/test_area_estimator.py`: measurement recovery, invalid-input checks,
  extrapolation labels and independence of held-out checks.

The estimator currently reads its model/evidence from the local results folders;
copies of the fitted model and measurements are included in the review bundle.
Its code is `exploration/area_estimator.py`; the original estimator is preserved.
